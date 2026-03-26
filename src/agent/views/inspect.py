"""
InspectView — post-run introspection dashboard.

Inspired by Codex's transcript overlay (Ctrl+T) — shows full session
history, block chains, health metrics, config. Uses rich panels and tables
for a clean, data-dense presentation.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from rich.console import Console, Group
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.columns import Columns
from rich.rule import Rule

from .blocks import BlockView, BlockData
from .status import StatusLine, _compact_number, _fmt_elapsed


class InspectView:
    """Full project introspection — replaces the old print-based _cmd_inspect."""

    def __init__(self, project_dir: Path):
        self.project_dir = project_dir
        self.console = Console()

    def render(self):
        """Render the full inspection dashboard."""
        self.console.print()
        self.console.print(Rule(
            f"[bold]ava inspect[/] — {self.project_dir.name}",
            style="cyan",
        ))

        session = self._load_session()
        report = self._load_report()

        # Row 1: Session overview
        self._render_session(session)

        # Row 2: Module table
        if report:
            self._render_modules(report)

        # Row 3: Blocks
        if session:
            self._render_blocks(session)

        # Row 4: Health + Config side by side
        self._render_health_config()

        # Row 5: Timeline
        if session:
            self._render_timeline(session)

        self.console.print()

    def _load_session(self) -> Optional[dict]:
        path = self.project_dir / ".session_state.json"
        if path.exists():
            try:
                return json.loads(path.read_text())
            except Exception:
                pass
        return None

    def _load_report(self) -> Optional[dict]:
        path = self.project_dir / "pipeline-report.json"
        if path.exists():
            try:
                return json.loads(path.read_text())
            except Exception:
                pass
        return None

    def _render_session(self, session: Optional[dict]):
        """Session overview panel — like Codex's session header."""
        if not session:
            self.console.print("  [dim]no session state[/]")
            return

        goal = session.get("goal", "?")
        done = len(session.get("modules_completed", []))
        total = len(session.get("module_order", []))
        tokens = session.get("total_tokens", 0)
        budget = session.get("token_budget", 500_000)
        loc = session.get("total_loc", 0)
        turns = session.get("turn_count", 0)
        tok_pct = tokens / max(budget, 1)
        mod_pct = done / max(total, 1)

        lines = Text()
        lines.append(f"  {goal}\n\n", "bold")

        # Progress bars (like Codex context_window_percent in footer)
        lines.append("  modules  ", "dim")
        lines.append(_bar(mod_pct, 20), "green" if mod_pct >= 1 else "yellow")
        lines.append(f"  {done}/{total}\n", "")

        lines.append("  tokens   ", "dim")
        tok_color = "green" if tok_pct < 0.5 else "yellow" if tok_pct < 0.8 else "red"
        lines.append(_bar(tok_pct, 20), tok_color)
        lines.append(f"  {_compact_number(tokens)}/{_compact_number(budget)}\n", "")

        lines.append("  output   ", "dim")
        lines.append(f"{loc:,} LOC", "bold")
        lines.append(f"  ·  T{turns} turns", "dim")

        # Knowledge
        memories = session.get("injected_memories", [])
        if memories:
            lines.append(f"  ·  {_compact_number(sum(len(m) for m in memories))} knowledge", "dim")
        lines.append("\n")

        self.console.print(lines)

    def _render_modules(self, report: dict):
        """Module results table — like Codex's exec group display."""
        branches = report.get("branches", [])
        if not branches:
            return

        table = Table(
            show_header=True, header_style="bold dim", box=None,
            pad_edge=False, show_edge=False, padding=(0, 1),
        )
        table.add_column("", width=2)
        table.add_column("module", min_width=12)
        table.add_column("LOC", justify="right", width=6, style="bold")
        table.add_column("TSC", justify="center", width=7)
        table.add_column("fix", justify="right", width=4)
        table.add_column("tokens", justify="right", width=8)
        table.add_column("quality", width=12)

        for b in branches:
            ok = b.get("tsc_final", 0) == 0
            icon = "[green]✔[/]" if ok else "[red]✘[/]"
            tsc = f"{b.get('tsc_initial', 0)}→{b.get('tsc_final', 0)}"
            tok = b.get("tokens", 0)
            loc = b.get("loc", 0)
            fix = b.get("fix_iterations", 0)
            # Quality bar from LOC (rough proxy)
            q = min(loc / 200, 1.0) if loc else 0
            q_bar = _bar(q, 8)

            table.add_row(icon, b.get("module", "?"), str(loc), tsc, str(fix),
                          f"{tok:,}", q_bar)

        self.console.print()
        self.console.print(table)

        # Totals
        total_loc = report.get("total_loc", 0)
        total_tok = report.get("total_tokens", 0)
        elapsed = report.get("elapsed_s", 0)
        self.console.print(
            f"\n  [bold]Σ[/] {total_loc:,} LOC · {total_tok:,} tok · {elapsed:.0f}s"
        )

    def _render_blocks(self, session: dict):
        """Block chain visualization."""
        blocks_data = session.get("blocks", [])
        if not blocks_data:
            return

        self.console.print()
        self.console.print(f"  [bold]blocks[/] [dim]({len(blocks_data)})[/]")

        view = BlockView()
        for bd in blocks_data:
            view.add(BlockData(
                index=bd.get("index", 0),
                block_type=bd.get("type", "IMPLEMENT"),
                objective=bd.get("objective", ""),
                status=bd.get("status", "pending"),
                module=bd.get("branch", "").split("/")[-1] if "/" in bd.get("branch", "") else bd.get("branch", ""),
                files=bd.get("files_changed", []),
                tokens=bd.get("tokens_used", 0),
            ))

        self.console.print(view.render_detail())

        # Compact chain preview (what LLM sees)
        try:
            from ..core.models import Block, BlockType, BlockStatus
            model_blocks = []
            for bd in blocks_data[-20:]:
                b = Block(
                    index=bd.get("index", 0),
                    block_type=BlockType(bd.get("type", "IMPLEMENT")),
                    objective=bd.get("objective", ""),
                    branch_name=bd.get("branch", ""),
                )
                b.status = BlockStatus(bd.get("status", "pending"))
                b.files_changed = bd.get("files_changed", [])
                b.tokens_used = bd.get("tokens_used", 0)
                b.output = bd.get("output", "")
                model_blocks.append(b)
            chain = Block.compact_chain(model_blocks)
            if chain:
                chain_lines = chain.split("\n")[:8]
                self.console.print(f"\n  [dim]llm context ({len(chain)} chars):[/]")
                for line in chain_lines:
                    self.console.print(f"  [dim]│[/] {line}")
                if len(chain.split("\n")) > 8:
                    self.console.print(f"  [dim]│ ... +{len(chain.split(chr(10))) - 8} lines[/]")
        except Exception:
            pass

    def _render_health_config(self):
        """Health score + config — side by side."""
        self.console.print()

        # Health
        try:
            from ..engines.analysis import ProjectAnalyzer
            analyzer = ProjectAnalyzer(self.project_dir)
            health = analyzer.analyze()
            score = health.score()

            color = "green" if score >= 80 else "yellow" if score >= 60 else "red"
            health_text = Text()
            health_text.append("  health ", "dim")
            health_text.append(_bar(score / 100, 20), color)
            health_text.append(f"  {score:.0f}/100\n", "bold")

            issues = []
            if health.empty_interfaces:
                issues.append(f"{len(health.empty_interfaces)} empty-iface")
            if health.missing_di:
                issues.append(f"{len(health.missing_di)} no-DI")
            if health.dead_exports:
                issues.append(f"{len(health.dead_exports)} dead-export")
            if health.total_any:
                issues.append(f"{health.total_any} any")
            if issues:
                health_text.append(f"         {' · '.join(issues)}", "dim")
            self.console.print(health_text)
        except Exception:
            pass

        # Config
        try:
            from ..core.runtime_config import RuntimeConfig
            config = RuntimeConfig.from_project(self.project_dir)
            self.console.print(
                f"  [dim]config:[/] {config.provider}/[cyan]{config.get_model('root')}[/] "
                f"emb={config.embedding_backend} "
                f"ast-grep={'[green]on[/]' if config.use_ast_grep else '[red]off[/]'}"
            )
        except Exception:
            pass

        # Blueprints
        bp_dir = self.project_dir / "blueprints"
        if bp_dir.exists():
            bps = sorted(bp_dir.glob("*.yaml"))
            if bps:
                names = ", ".join(bp.stem for bp in bps)
                self.console.print(f"  [dim]blueprints:[/] {names}")

    def _render_timeline(self, session: dict):
        """Event timeline — like Codex transcript history."""
        history = session.get("history", [])
        if not history:
            return

        self.console.print(f"\n  [bold]timeline[/] [dim]({len(history)} events)[/]")

        _ICONS = {
            "module_start": "[cyan]▶[/]",
            "module_done": "[green]■[/]",
            "module_failed": "[red]✘[/]",
            "fix": "[yellow]⚡[/]",
            "quality": "[magenta]◆[/]",
            "decision": "[blue]◇[/]",
        }

        for h in history[-12:]:
            mod = h.get("module", "")
            kind = h.get("kind", "?")
            detail = h.get("detail", "")[:50]
            tok = h.get("tokens", 0)
            icon = _ICONS.get(kind, "[dim]·[/]")
            tok_str = f" [dim]{tok:,}t[/]" if tok else ""
            self.console.print(f"  {icon} {mod:<12} {detail}{tok_str}")


def _bar(value: float, width: int = 20) -> str:
    """Progress bar using block chars."""
    n = int(value * width)
    return "█" * n + "░" * (width - n)
