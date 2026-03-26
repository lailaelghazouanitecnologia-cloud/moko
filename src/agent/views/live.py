"""
LiveView — real-time pipeline display with rich.live.

Inspired by Codex's ChatWidget + StatusIndicatorWidget:
  - Spinner while working (like Codex shimmer/blink)
  - Plan steps updating live (like Codex PlanUpdateCell)
  - Status footer (like Codex footer.rs)
  - Exec-style output for tool calls (like Codex ExecCell)
  - Preamble messages before actions (like Codex agent preambles)

Uses rich.live for real-time terminal updates without full TUI.
"""
from __future__ import annotations

import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Optional

from rich.console import Console, Group
from rich.live import Live
from rich.panel import Panel
from rich.rule import Rule
from rich.spinner import Spinner
from rich.table import Table
from rich.text import Text

from .plan import PlanView, PlanStep, StepStatus
from .status import StatusLine


@dataclass
class ExecEntry:
    """One tool/command execution — like Codex ExecCall."""
    command: str
    output: str = ""
    exit_code: int = 0
    elapsed: float = 0.0
    is_running: bool = False


class LiveView:
    """Real-time pipeline view — the main display during AVA generation.

    Lifecycle:
        view = LiveView(goal="Build chip8", modules=["memory", "cpu", ...])
        with view.live():
            view.start_module("memory", types=3)
            view.log("generating blueprint...")
            view.exec("tsc --noEmit", running=True)
            view.exec_done(exit_code=0, output="1 error")
            view.complete_module(loc=120, errors=0, tokens=9000)
            # ... next module
        view.summary()  # final report
    """

    def __init__(self, goal: str = "", modules: list[str] = None,
                 provider: str = "", model: str = "", token_budget: int = 500_000,
                 verbose: bool = False):
        self.console = Console()
        self.goal = goal
        self.module_names = modules or []
        self.verbose = verbose
        self._live: Optional[Live] = None
        self._started_at = 0.0

        # State
        self.status = StatusLine(
            provider=provider,
            model=model,
            token_budget=token_budget,
            modules_total=len(self.module_names),
        )
        self.plan = PlanView(title=goal or "Generation Plan")
        self._module_steps: dict[str, int] = {}  # module → plan step index
        self._current_module = ""
        self._current_exec: Optional[ExecEntry] = None
        self._log_lines: list[tuple[str, str]] = []  # (text, style)
        self._module_results: list[dict] = []

        # Build plan steps from modules
        for mod in self.module_names:
            idx = self.plan.add_step(f"Generate {mod}")
            self._module_steps[mod] = idx

    @contextmanager
    def live(self):
        """Context manager for live display."""
        self._started_at = time.time()
        self.status.started_at = self._started_at

        # Header
        self.console.print()
        self.console.print(Rule(f"[bold]ava[/] — {self.goal}", style="cyan"))
        if self.status.model:
            model_short = self.status.model.split("/")[-1]
            self.console.print(
                f"  [dim]{self.status.provider}[/] · [cyan]{model_short}[/] · "
                f"[dim]budget[/] [bold]{self.status.token_budget:,}[/] tok",
            )
        self.console.print()

        self._live = Live(
            self._render(),
            console=self.console,
            refresh_per_second=4,
            transient=False,
        )
        try:
            with self._live:
                yield self
        finally:
            self._live = None

    def _render(self) -> Group:
        """Build the full live display — called on every refresh."""
        parts = []

        # Plan with step status
        parts.append(self.plan.render())

        # Current activity (exec/log) — like Codex's active cell
        if self._current_exec and self._current_exec.is_running:
            exec_line = Text()
            exec_line.append("  $ ", "magenta")
            exec_line.append(self._current_exec.command, "bold")
            exec_line.append("  ", "")
            exec_line.append_text(Text.from_markup("[cyan]⠋[/]"))  # spinner char
            parts.append(exec_line)
        elif self._log_lines:
            # Show last 3 log lines (like Codex StatusIndicatorWidget details)
            for text, style in self._log_lines[-3:]:
                parts.append(Text(f"  └ {text}", style=style or "dim"))

        # Status footer
        parts.append(Text(""))  # spacer
        parts.append(self.status.render())

        return Group(*parts)

    def _update(self):
        """Push render update to terminal."""
        if self._live:
            self._live.update(self._render())

    # ── Module lifecycle ──────────────────────────────────

    def start_module(self, name: str, types: int = 0):
        """Mark module as in-progress."""
        self._current_module = name
        self.status.current_module = name
        self._log_lines.clear()

        idx = self._module_steps.get(name)
        if idx is not None:
            self.plan.start_step(idx)

        if types:
            self.log(f"{types} types", style="dim")
        self._update()

    def complete_module(self, loc: int = 0, errors: int = 0, tokens: int = 0,
                        elapsed: float = 0.0, blocks: int = 0):
        """Mark module as completed."""
        name = self._current_module
        idx = self._module_steps.get(name)

        detail_parts = []
        if loc:
            detail_parts.append(f"{loc} LOC")
        if errors > 0:
            detail_parts.append(f"{errors} err")
        if blocks:
            detail_parts.append(f"{blocks} blk")
        detail = " · ".join(detail_parts)

        if idx is not None:
            self.plan.complete_step(idx, detail=detail, tokens=tokens, elapsed=elapsed)

        self.status.modules_done += 1
        self.status.tokens_used += tokens
        self.status.current_module = ""
        self._current_module = ""
        self._log_lines.clear()

        self._module_results.append({
            "module": name, "loc": loc, "errors": errors,
            "tokens": tokens, "elapsed": elapsed, "blocks": blocks,
        })
        self._update()

    def fail_module(self, error: str = ""):
        """Mark module as failed."""
        name = self._current_module
        idx = self._module_steps.get(name)
        if idx is not None:
            self.plan.fail_step(idx, detail=error[:60])
        self.status.errors += 1
        self._current_module = ""
        self._log_lines.clear()
        self._update()

    # ── Log / Exec ────────────────────────────────────────

    def log(self, text: str, style: str = "dim"):
        """Add a log line — like Codex preamble messages."""
        self._log_lines.append((text, style))
        if len(self._log_lines) > 10:
            self._log_lines = self._log_lines[-10:]
        self._update()

    def exec(self, command: str, running: bool = True):
        """Show a command execution — like Codex ExecCell."""
        self._current_exec = ExecEntry(command=command, is_running=running)
        self._update()

    def exec_done(self, exit_code: int = 0, output: str = ""):
        """Complete the current exec."""
        if self._current_exec:
            self._current_exec.is_running = False
            self._current_exec.exit_code = exit_code
            self._current_exec.output = output

            # Show result as log
            icon = "✔" if exit_code == 0 else "✘"
            style = "green" if exit_code == 0 else "red"
            msg = f"{icon} {self._current_exec.command}"
            if output:
                msg += f" — {output[:60]}"
            self._log_lines.append((msg, style))
            self._current_exec = None
            self._update()

    # ── Summary ───────────────────────────────────────────

    def summary(self):
        """Print final summary — like Codex's turn completion."""
        elapsed = time.time() - self._started_at if self._started_at else 0

        self.console.print()
        self.console.print(Rule("Summary", style="green"))

        # Module table
        table = Table(show_header=True, header_style="bold", box=None,
                      pad_edge=False, show_edge=False)
        table.add_column("", width=2)
        table.add_column("module", min_width=12)
        table.add_column("LOC", justify="right", width=6)
        table.add_column("TSC", justify="right", width=5)
        table.add_column("tokens", justify="right", width=8)
        table.add_column("time", justify="right", width=6)

        total_loc = 0
        total_tok = 0
        for r in self._module_results:
            icon = "[green]✔[/]" if r["errors"] == 0 else "[red]✘[/]"
            table.add_row(
                icon,
                r["module"],
                str(r["loc"]),
                str(r["errors"]),
                f"{r['tokens']:,}",
                f"{r['elapsed']:.0f}s",
            )
            total_loc += r["loc"]
            total_tok += r["tokens"]

        self.console.print(table)
        self.console.print()
        self.console.print(
            f"  [bold]{total_loc:,}[/] LOC · "
            f"[bold]{total_tok:,}[/] tok · "
            f"[bold]{elapsed:.0f}[/]s · "
            f"[bold]{len(self._module_results)}[/] modules"
        )
        self.console.print()
