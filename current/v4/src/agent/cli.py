"""
CLI — ava agent subcommand + interactive REPL.

Usage:
    ava agent "What is the architecture of cline?"
    ava agent -p cline-core "architecture?"
    ava agent -i                    # interactive REPL
    ava agent --index               # build vector index
    ava agent --index --embedding voyage
"""

import argparse
import json
import sys
import time
from pathlib import Path

from . import OUT_DIR, REGISTRY_PATH, VECTORDB_PATH
from .supervisor import Supervisor, _available_projects


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
        print(f"Error initializing agent: {e}", file=sys.stderr)
        sys.exit(1)

    show_report = not getattr(args, 'no_report', False)

    if args.interactive:
        _interactive_loop(supervisor, args, show_report)
    elif args.query:
        projects = args.project or _available_projects()
        result = supervisor.run(args.query, projects, verbose=args.verbose)
        print(result)
        if show_report and supervisor.last_report:
            print(f"\n{supervisor.last_report.format()}")
    else:
        print("Provide a query or use --interactive/-i for REPL mode")
        print("Examples:")
        print('  ava agent "What is the architecture of cline?"')
        print('  ava agent -p crewai "architecture?"')
        print('  ava agent -i')
        print('  ava agent --index')


def _build_index(args):
    """Build the vector index from all descriptors."""
    from .vectorstore.embeddings import EmbeddingProvider
    from .vectorstore.indexer import Indexer

    print(f"[moko] Building vector index...")
    print(f"  Embedding: {args.embedding}")
    print(f"  DB path:   {VECTORDB_PATH}")
    print(f"  Source:     {OUT_DIR}")
    print()

    projects = args.project or None

    t0 = time.time()
    try:
        embedder = EmbeddingProvider(args.embedding)
        indexer = Indexer(str(VECTORDB_PATH), embedder)
        total = indexer.index_all(OUT_DIR, projects=projects, verbose=True)
        elapsed = time.time() - t0
        print(f"\n[moko] Index built: {total} chunks in {elapsed:.1f}s")
    except ImportError as e:
        print(f"Error: {e}", file=sys.stderr)
        print("Install required packages:", file=sys.stderr)
        print("  pip install lancedb sentence-transformers", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error building index: {e}", file=sys.stderr)
        sys.exit(1)


def _interactive_loop(supervisor: Supervisor, args, show_report: bool):
    """REPL with session commands."""
    projects = args.project or _available_projects()

    print(f"[moko] Agent ready. Session {supervisor.session.session_id}")
    print(f"[moko] {len(supervisor.agents)} agents | {len(projects)} projects")
    print(f"[moko] Provider: {args.provider} | Model: {supervisor.llm.model}")

    if supervisor.vector_store and supervisor.vector_store.is_indexed():
        count = supervisor.vector_store.count()
        print(f"[moko] Vector index: {count} chunks")
    else:
        print(f"[moko] Vector index: not built (run: ava agent --index)")

    print(f"[moko] Type /help for commands.\n")

    while True:
        try:
            query = input("you> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n[moko] Session ended.")
            break

        if not query:
            continue

        if query.startswith("/"):
            _handle_session_command(query, supervisor)
            continue

        try:
            result = supervisor.run(query, projects, verbose=args.verbose)
            print(f"\n{result}")

            # Always show usage report in REPL
            if show_report and supervisor.last_report:
                print(f"\n{supervisor.last_report.format()}")
            print()
        except Exception as e:
            print(f"\n[error] {e}\n")


def _handle_session_command(cmd: str, supervisor: Supervisor):
    """Handle /snapshot, /branch, /rollback, /branches, /history, /report, /help."""
    parts = cmd.split()
    command = parts[0].lower()

    if command == "/snapshot":
        label = parts[1] if len(parts) > 1 else "manual"
        snap_id = supervisor.session.snapshot(label)
        print(f"  [session] Snapshot {snap_id} ({label})")

    elif command == "/branch":
        if len(parts) < 2:
            print("  Usage: /branch <name> [snapshot_id]")
            return
        name = parts[1]
        from_snap = parts[2] if len(parts) > 2 else None
        try:
            supervisor.session.branch(name, from_snap)
            print(f"  [session] Switched to branch '{name}'")
        except ValueError as e:
            print(f"  [error] {e}")

    elif command == "/switch":
        if len(parts) < 2:
            print("  Usage: /switch <branch_name>")
            return
        try:
            supervisor.session.switch_branch(parts[1])
            print(f"  [session] Switched to '{parts[1]}'")
        except ValueError as e:
            print(f"  [error] {e}")

    elif command == "/rollback":
        if len(parts) < 2:
            print("  Usage: /rollback <snapshot_id>")
            return
        try:
            supervisor.session.rollback(parts[1])
            print(f"  [session] Rolled back to {parts[1]}")
        except ValueError as e:
            print(f"  [error] {e}")

    elif command == "/branches":
        for b in supervisor.session.list_branches():
            marker = "*" if b["is_current"] else " "
            print(f"  {marker} {b['name']} ({b['turns']} turns)")

    elif command == "/snapshots":
        branch = parts[1] if len(parts) > 1 else None
        for s in supervisor.session.list_snapshots(branch):
            print(f"  {s['id']} [{s['branch']}] {s['label']} ({s['turns']} turns)")

    elif command == "/history":
        for t in supervisor.session.turns[-10:]:
            tokens = t.token_usage.get("total_tokens", "?")
            est = " (est)" if t.token_usage.get("is_estimated", True) else ""
            print(f"  [{t.id}] {t.task_type}: {t.query[:50]}... [{tokens}{est} tokens]")

    elif command == "/report":
        if supervisor.last_report:
            print(supervisor.last_report.format())
        else:
            print("  No report yet — run a query first.")

    elif command == "/agents":
        for name, agent in supervisor.agents.items():
            print(f"  {name:12s} {agent.description}")

    elif command == "/prompts":
        for meta in supervisor.prompt_registry.list_all():
            hc = " [hardcoded]" if meta.is_hardcoded else ""
            print(f"  {meta.id:30s} {','.join(meta.task_types):20s}{hc}")

    elif command == "/projects":
        for p in _available_projects():
            print(f"  {p}")

    elif command == "/export":
        path = parts[1] if len(parts) > 1 else "/tmp/moko_session.json"
        supervisor.session.save(Path(path))
        print(f"  [session] Exported to {path}")

    elif command == "/help":
        print("  Session commands:")
        print("    /snapshot [label]      Take a snapshot")
        print("    /branch <name> [snap]  Create branch")
        print("    /switch <branch>       Switch branch")
        print("    /rollback <snap_id>    Rollback to snapshot")
        print("    /branches              List branches")
        print("    /snapshots [branch]    List snapshots")
        print("    /history               Show recent turns + token usage")
        print("    /report                Show last query's usage report")
        print("    /export [path]         Export session to JSON")
        print("  Info commands:")
        print("    /agents                List available agents")
        print("    /prompts               List registered prompts")
        print("    /projects              List available projects")
        print("    /help                  This help")

    else:
        print(f"  Unknown command: {command}. Type /help for commands.")
