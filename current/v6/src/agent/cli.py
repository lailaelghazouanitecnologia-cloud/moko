"""
CLI — ava agent subcommand + interactive REPL.

Modern terminal experience inspired by Claude Code / Gemini CLI.
Streaming display, markdown rendering, spinner, compact status.

Usage:
    ava agent "What is the architecture of cline?"
    ava agent -p cline-core "architecture?"
    ava agent -i                    # interactive REPL
    ava agent --index               # build vector index
    ava agent --index --embedding voyage
"""
from __future__ import annotations

import sys
import time
import threading
from pathlib import Path

from . import OUT_DIR, REGISTRY_PATH, VECTORDB_PATH, __version__
from .supervisor import Supervisor, _available_projects
from .views.theme import (
    bold, dim, muted, accent, error, success, warning,
    CYAN, GREEN, GRAY, RESET, COLORS_ENABLED, clear_line,
)
from .views.banner import welcome, farewell
from .views.spinner import Spinner
from .views.markdown import render as md_render
from .views.status import format_status


# ── Prompt ──────────────────────────────────────────────────

_PROMPT = f"{CYAN}>{RESET} " if COLORS_ENABLED else "> "


def register_subparser(subparsers):
    """Called from ava to register the 'agent' subcommand."""
    p = subparsers.add_parser("agent", help="Interactive code intelligence agent")
    p.add_argument("query", nargs="?", help="One-shot question")
    p.add_argument("--project", "-p", action="append", help="Project(s) to analyze")
    p.add_argument("--provider", default="groq",
                   choices=["groq", "anthropic", "openai"])
    p.add_argument("--model", default=None, help="Override LLM model")
    p.add_argument("--interactive", "-i", action="store_true",
                   help="Interactive REPL mode")
    p.add_argument("--verbose", "-v", action="store_true",
                   help="Show agent routing and metrics")
    p.add_argument("--no-report", action="store_true",
                   help="Suppress usage report")
    p.add_argument("--index", action="store_true",
                   help="Build/rebuild vector index")
    p.add_argument("--embedding", default="local",
                   choices=["local", "voyage", "openai"],
                   help="Embedding provider for indexing")
    p.add_argument("--max-tokens", type=int, default=12000,
                   help="Token budget for descriptor context")
    return p


# ── Entry point ─────────────────────────────────────────────

def cmd_agent(args):
    """Entry point for `ava agent`."""
    if args.index:
        _build_index(args)
        return

    config = {
        "provider": args.provider,
        "model": args.model,
        "db_path": str(VECTORDB_PATH),
        "embedding": args.embedding,
    }

    try:
        supervisor = Supervisor(config)
    except Exception as e:
        print(error(f"  Error initializing agent: {e}"), file=sys.stderr)
        sys.exit(1)

    show_report = not getattr(args, 'no_report', False)

    if args.interactive:
        _interactive_loop(supervisor, args, show_report)
    elif args.query:
        _one_shot(supervisor, args, show_report)
    else:
        print(f"\n  {bold('ava agent')} — Code intelligence agent\n")
        print(f"  {muted('Usage:')}")
        q1 = accent('"What is the architecture of cline?"')
        q2 = accent('"architecture?"')
        print(f"    ava agent {q1}")
        print(f"    ava agent -p crewai {q2}")
        print(f"    ava agent {accent('-i')}              {muted('# interactive REPL')}")
        print(f"    ava agent {accent('--index')}         {muted('# build vector index')}")
        print()


# ── One-shot query ──────────────────────────────────────────

def _one_shot(supervisor: Supervisor, args, show_report: bool):
    """Handle a single query, print result, exit."""
    projects = args.project or _available_projects()

    spinner = Spinner("Thinking")
    spinner.start()
    try:
        result = supervisor.run(args.query, projects, verbose=args.verbose)
    finally:
        spinner.stop()

    # Render with markdown
    print()
    print(md_render(result))

    # Compact status
    if show_report and supervisor.last_report:
        rpt = supervisor.last_report
        is_cached = rpt.task_type == "cached"
        print(format_status(
            total_tokens=rpt.total_tokens,
            elapsed_s=rpt.elapsed_s,
            agents_used=rpt.agents_used,
            is_estimated=rpt.is_estimated,
            fast_mode=supervisor.fast_mode,
            cached=is_cached,
        ))
    print()


# ── Interactive REPL ────────────────────────────────────────

def _interactive_loop(supervisor: Supervisor, args, show_report: bool):
    """REPL with streaming feel, markdown rendering, session commands."""
    projects = args.project or _available_projects()

    # Index info
    index_chunks = 0
    if supervisor.vector_store and supervisor.vector_store.is_indexed():
        index_chunks = supervisor.vector_store.count()

    # Welcome banner
    print()
    print(welcome(
        provider=args.provider,
        model=supervisor.llm.model,
        project_count=len(projects),
        agent_count=len(supervisor.agents),
        index_chunks=index_chunks,
    ))

    while True:
        try:
            query = input(_PROMPT).strip()
        except (EOFError, KeyboardInterrupt):
            print(farewell())
            break

        if not query:
            continue

        if query.startswith("/"):
            _handle_command(query, supervisor, show_report)
            continue

        # Run query with spinner
        spinner = Spinner("Thinking")
        spinner.start()
        try:
            result = supervisor.run(query, projects, verbose=args.verbose)
        except KeyboardInterrupt:
            spinner.stop()
            print(f"\n  {warning('Cancelled.')}\n")
            continue
        except Exception as e:
            spinner.stop()
            print(f"\n  {error(str(e))}\n")
            continue
        finally:
            spinner.stop()

        # Render response
        print()
        print(md_render(result))

        # Compact status line
        if show_report and supervisor.last_report:
            rpt = supervisor.last_report
            is_cached = rpt.task_type == "cached"
            print(format_status(
                total_tokens=rpt.total_tokens,
                elapsed_s=rpt.elapsed_s,
                agents_used=rpt.agents_used,
                is_estimated=rpt.is_estimated,
                fast_mode=supervisor.fast_mode,
                cached=is_cached,
            ))
        print()


# ── Session commands ────────────────────────────────────────

def _handle_command(cmd: str, supervisor: Supervisor, show_report: bool):
    """Handle /snapshot, /branch, /report, /fast, /help, etc."""
    parts = cmd.split()
    command = parts[0].lower()

    if command == "/fast":
        is_fast = supervisor.toggle_fast()
        if is_fast:
            print(f"  {success('Fast mode: ON')} {muted('(cheap models · cache · compress)')}")
        else:
            print(f"  {warning('Fast mode: OFF')} {muted('(full quality)')}")
        return

    if command.startswith("/gpu"):
        _handle_gpu_command(parts, supervisor)
        return

    if command == "/help":
        _show_help()

    elif command == "/report":
        if supervisor.last_report:
            print(f"\n{supervisor.last_report.format()}\n")
        else:
            print(f"  {muted('No report yet — run a query first.')}")

    elif command == "/agents":
        print()
        for name, agent in supervisor.agents.items():
            print(f"  {accent(name):20s} {muted(agent.description)}")
        print()

    elif command == "/projects":
        print()
        for p in _available_projects():
            print(f"  {p}")
        print()

    elif command == "/history":
        print()
        for t in supervisor.session.turns[-10:]:
            tokens = t.token_usage.get("total_tokens", "?")
            est = " ~" if t.token_usage.get("is_estimated", True) else ""
            print(f"  {muted(t.id)} {t.task_type}: {t.query[:50]}... {dim(f'[{tokens}{est} tok]')}")
        print()

    elif command == "/snapshot":
        label = parts[1] if len(parts) > 1 else "manual"
        snap_id = supervisor.session.snapshot(label)
        print(f"  {success('Snapshot')} {snap_id} ({label})")

    elif command == "/branch":
        if len(parts) < 2:
            print(f"  {muted('Usage: /branch <name> [snapshot_id]')}")
            return
        name = parts[1]
        from_snap = parts[2] if len(parts) > 2 else None
        try:
            supervisor.session.branch(name, from_snap)
            print(f"  {success('Switched to branch')} {accent(name)}")
        except ValueError as e:
            print(f"  {error(str(e))}")

    elif command == "/switch":
        if len(parts) < 2:
            print(f"  {muted('Usage: /switch <branch_name>')}")
            return
        try:
            supervisor.session.switch_branch(parts[1])
            print(f"  {success('Switched to')} {accent(parts[1])}")
        except ValueError as e:
            print(f"  {error(str(e))}")

    elif command == "/rollback":
        if len(parts) < 2:
            print(f"  {muted('Usage: /rollback <snapshot_id>')}")
            return
        try:
            supervisor.session.rollback(parts[1])
            print(f"  {success('Rolled back to')} {parts[1]}")
        except ValueError as e:
            print(f"  {error(str(e))}")

    elif command == "/branches":
        print()
        for b in supervisor.session.list_branches():
            marker = f"{GREEN}*{RESET}" if b["is_current"] else " "
            turns = b["turns"]
            print(f"  {marker} {b['name']} {dim(f'({turns} turns)')}")
        print()

    elif command == "/snapshots":
        branch = parts[1] if len(parts) > 1 else None
        print()
        for s in supervisor.session.list_snapshots(branch):
            turns = s["turns"]
            print(f"  {muted(s['id'])} [{accent(s['branch'])}] {s['label']} {dim(f'({turns} turns)')}")
        print()

    elif command == "/prompts":
        print()
        for meta in supervisor.prompt_registry.list_all():
            hc = f" {dim('[hardcoded]')}" if meta.is_hardcoded else ""
            print(f"  {meta.id:30s} {muted(','.join(meta.task_types))}{hc}")
        print()

    elif command == "/export":
        path = parts[1] if len(parts) > 1 else str(Path.home() / ".moko" / "session.json")
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        supervisor.session.save(Path(path))
        print(f"  {success('Exported to')} {path}")

    else:
        print(f"  {warning('Unknown command:')} {command}. Type {accent('/help')} for commands.")


# ── GPU rental commands ─────────────────────────────────────

# Lazy-init GPU manager (shared across commands)
_gpu_manager = None


def _get_gpu_manager():
    global _gpu_manager
    if _gpu_manager is None:
        from .core.gpu import GpuManager
        _gpu_manager = GpuManager()
    return _gpu_manager


def _handle_gpu_command(parts: list[str], supervisor: Supervisor):
    """Handle /gpu models, /gpu start, /gpu stop, /gpu status, /gpu ssh."""
    from .core.gpu import list_models, get_model, RENTAL_PRICE_PER_HOUR, GpuStatus

    sub = parts[1] if len(parts) > 1 else "help"

    if sub == "models":
        print(f"\n  {bold('Available models')} {muted(f'· ${RENTAL_PRICE_PER_HOUR:.2f}/hr unlimited tokens')}\n")
        for m in list_models():
            rec = f" {success('*')}" if "recommended" in m.tags else ""
            tags = " ".join(f"{muted(t)}" for t in m.tags if t != "recommended")
            print(f"  {accent(m.id):20s} {m.name:35s} {dim(m.gpu):15s} {tags}{rec}")
        print(f"\n  {muted('Usage: /gpu start <model_id>')}")
        print(f"  {muted('Example: /gpu start qwen-32b')}\n")

    elif sub == "start":
        if len(parts) < 3:
            print(f"  {muted('Usage: /gpu start <model_id>')}")
            print(f"  {muted('Run /gpu models to see available models.')}")
            return

        model_id = parts[2]
        model = get_model(model_id)
        if model is None:
            print(f"  {error(f'Unknown model: {model_id}')}")
            print(f"  {muted('Run /gpu models to see available models.')}")
            return

        mgr = _get_gpu_manager()
        print(f"  {bold('Renting GPU...')} {model.name} on {model.gpu}")
        print(f"  {muted(f'Cost: ${RENTAL_PRICE_PER_HOUR:.2f}/hr · unlimited tokens · SSH access')}")

        spinner = Spinner("Provisioning GPU and loading model")
        spinner.start()
        try:
            session = mgr.start(model_id)
        finally:
            spinner.stop()

        if session.status == GpuStatus.ERROR:
            print(f"  {error(f'Failed: {session.error}')}")
            return

        if session.status == GpuStatus.READY:
            # Switch supervisor to use GPU endpoint
            supervisor.llm.provider = "local"
            supervisor.llm.model = model.hf_repo
            supervisor.llm._base_url = session.endpoint_url + "/v1"
            supervisor.llm._client = None  # force re-init

            print(f"\n  {success('GPU ready!')} {model.name}")
            print(f"  {muted('Endpoint:')} {session.endpoint_url}")
            print(f"  {muted('Expires:')}  {session.remaining_minutes:.0f} min remaining")
            if session.ssh_host:
                print(f"  {muted('SSH:')}      {accent(session.ssh_command)}")
            print(f"\n  {muted('All queries now use your GPU. Unlimited tokens.')}")
            print(f"  {muted('Run /gpu stop when done.')}\n")
        else:
            print(f"  {warning(f'Status: {session.status.value}')} — model still loading.")
            print(f"  {muted('Run /gpu status to check when ready.')}")

    elif sub == "stop":
        mgr = _get_gpu_manager()
        if not mgr.session:
            print(f"  {muted('No active GPU session.')}")
            return

        summary = mgr.stop()

        # Restore supervisor to default provider
        supervisor.llm.provider = supervisor.llm.provider  # keep or reset
        supervisor.llm._client = None

        print(f"\n  {success('GPU released.')}")
        for line in summary.split("\n"):
            print(f"  {line}")
        print()

    elif sub == "status":
        mgr = _get_gpu_manager()
        if not mgr.session:
            print(f"  {muted('No active GPU session. Use /gpu start <model>.')}")
            return

        s = mgr.status()
        status_color = success if s.status == GpuStatus.READY else warning
        print(f"\n  {bold('GPU Session')}")
        print(f"  Model:     {s.model.name}")
        print(f"  GPU:       {s.model.gpu}")
        print(f"  Status:    {status_color(s.status.value)}")
        print(f"  Endpoint:  {s.endpoint_url or muted('pending')}")
        print(f"  Elapsed:   {s.elapsed_minutes:.1f} min")
        print(f"  Remaining: {s.remaining_minutes:.0f} min")
        print(f"  Tokens:    {s.tokens_generated:,}")
        print(f"  Requests:  {s.requests_made}")
        if s.ssh_host:
            print(f"  SSH:       {accent(s.ssh_command)}")
        if s.is_expired:
            print(f"  {warning('Session expired! Run /gpu stop and start a new one.')}")
        print()

    elif sub == "ssh":
        mgr = _get_gpu_manager()
        if not mgr.session or not mgr.session.ssh_host:
            print(f"  {muted('No active GPU session with SSH.')}")
            return
        s = mgr.session
        print(f"\n  {accent(s.ssh_command)}")
        if s.ssh_password:
            print(f"  {muted(f'Password: {s.ssh_password}')}")
        print()

    else:
        print(f"  {bold('GPU Rental')} {muted(f'· ${RENTAL_PRICE_PER_HOUR:.2f}/hr unlimited tokens')}\n")
        print(f"  {accent('/gpu models')}          List available models")
        print(f"  {accent('/gpu start')} <model>   Rent GPU + load model")
        print(f"  {accent('/gpu stop')}            Release GPU")
        print(f"  {accent('/gpu status')}          Session info")
        print(f"  {accent('/gpu ssh')}             SSH connection command")
        print()


def _show_help():
    print(f"""
  {bold('Mode')}
    {accent('/fast')}                  Toggle fast mode (cheap · cache · compress)
    {accent('/gpu')} models|start|stop  Rent a GPU ($1/hr unlimited tokens)

  {bold('Session')}
    {accent('/snapshot')} [label]      Save session state
    {accent('/branch')} <name> [snap]  Branch conversation
    {accent('/switch')} <branch>       Switch branch
    {accent('/rollback')} <snap_id>    Restore snapshot
    {accent('/branches')}              List branches
    {accent('/snapshots')} [branch]    List snapshots
    {accent('/history')}               Recent turns + tokens
    {accent('/export')} [path]         Export session JSON

  {bold('Info')}
    {accent('/agents')}                Available agents
    {accent('/prompts')}               Registered prompts
    {accent('/projects')}              Available projects
    {accent('/report')}                Full usage report
    {accent('/help')}                  This help
""")


# ── Vector index builder ────────────────────────────────────

def _build_index(args):
    """Build the vector index from all descriptors."""
    from .vectorstore.embeddings import EmbeddingProvider
    from .vectorstore.indexer import Indexer

    print(f"\n  {bold('Building vector index...')}")
    print(f"  Embedding: {accent(args.embedding)}")
    print(f"  DB path:   {muted(str(VECTORDB_PATH))}")
    print(f"  Source:     {muted(str(OUT_DIR))}")
    print()

    projects = args.project or None

    spinner = Spinner("Indexing descriptors")
    spinner.start()
    t0 = time.time()
    try:
        embedder = EmbeddingProvider(args.embedding)
        indexer = Indexer(str(VECTORDB_PATH), embedder)
        total = indexer.index_all(OUT_DIR, projects=projects, verbose=True)
        spinner.stop()
        elapsed = time.time() - t0
        print(f"  {success(f'Index built: {total} chunks in {elapsed:.1f}s')}")
    except ImportError as e:
        spinner.stop()
        print(f"  {error(str(e))}", file=sys.stderr)
        print(f"  {muted('pip install lancedb sentence-transformers')}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        spinner.stop()
        print(f"  {error(f'Error building index: {e}')}", file=sys.stderr)
        sys.exit(1)
    print()
