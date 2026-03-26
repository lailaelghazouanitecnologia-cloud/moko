"""
AVA TUI — Full terminal UI built with Textual.

Inspired by Codex's Ratatui-based TUI (chatwidget.rs, history_cell.rs,
status_indicator_widget.rs, footer.rs). This is the Python equivalent.

Layout:
  ┌──────────────────────────────────────────┐
  │ Header: ava — goal                       │
  ├──────────────────────────────────────────┤
  │ Plan Steps  ✔ □ □ ○                      │
  ├──────────────────────────────────────────┤
  │ Transcript (scrollable log)              │
  │   ▶ memory (3 types)                     │
  │   └ generating blueprint...              │
  │   ✔ memory: 120 LOC · 9,294 tok         │
  ├──────────────────────────────────────────┤
  │ [A]→[I]→[I]→[R]→[T]→[X]  12,340 tok    │
  ├──────────────────────────────────────────┤
  │ kimi-k2 · 55K tok (11%) · 4/6 mod · 23s │
  └──────────────────────────────────────────┘

Usage:
    tui = AvaTUI(goal="Build chip8", modules=["memory", "cpu", ...])
    tui.run_in_thread()  # starts TUI in background thread
    tui.log("generating blueprint...")
    tui.start_module("memory")
    tui.complete_module("memory", loc=120, tokens=9294)
    tui.stop()
"""
from __future__ import annotations

import time
import threading
from dataclasses import dataclass, field
from typing import Optional

from textual.app import App, ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Header, Footer, Static, RichLog, Label
from textual.reactive import reactive
from textual import work
from rich.text import Text


# ── Data Models ───────────────────────────────────────────

@dataclass
class ModuleState:
    name: str
    status: str = "pending"   # pending, active, done, failed
    types: int = 0
    loc: int = 0
    tokens: int = 0
    errors: int = 0
    elapsed: float = 0.0
    blocks: int = 0


# ── Widgets ───────────────────────────────────────────────

class PlanWidget(Static):
    """Plan steps with ✔/□/○ — like Codex PlanUpdateCell."""

    DEFAULT_CSS = """
    PlanWidget {
        height: auto;
        max-height: 12;
        padding: 0 1;
        background: $surface;
    }
    """

    def __init__(self, modules: list[str], **kwargs):
        super().__init__(self._build_text({n: "pending" for n in modules}), **kwargs)
        self._modules = {name: "pending" for name in modules}

    def set_status(self, module: str, status: str):
        self._modules[module] = status
        try:
            self.update(self._build_text(self._modules))
        except Exception:
            pass

    @staticmethod
    def _build_text(modules: dict) -> Text:
        lines = Text()
        for name, status in modules.items():
            if status == "done":
                lines.append("  ✔ ", "green dim")
                lines.append(name, "green dim strike")
            elif status == "active":
                lines.append("  □ ", "cyan bold")
                lines.append(name, "cyan bold")
            elif status == "failed":
                lines.append("  ✘ ", "red bold")
                lines.append(name, "red")
            else:
                lines.append("  □ ", "dim")
                lines.append(name, "dim")
            lines.append("\n")
        return lines


class BlockBar(Static):
    """Block chain bar — [A]→[I]→[R]→[T]→[X]."""

    DEFAULT_CSS = """
    BlockBar {
        height: 1;
        padding: 0 1;
        background: $surface;
    }
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._blocks: list[tuple[str, str]] = []  # (type_char, status)

    def add_block(self, type_char: str, status: str = "pending"):
        self._blocks.append((type_char, status))
        self._try_render()

    def set_block_status(self, idx: int, status: str):
        if 0 <= idx < len(self._blocks):
            t, _ = self._blocks[idx]
            self._blocks[idx] = (t, status)
            self._try_render()

    def clear(self):
        self._blocks.clear()
        self._try_render()

    def _try_render(self):
        try:
            self._render()
        except Exception:
            pass  # Not mounted yet

    def _render(self):
        line = Text()
        _STYLE = {
            "done": "green",
            "active": "cyan bold",
            "failed": "red",
            "pending": "dim",
        }
        for i, (t, s) in enumerate(self._blocks):
            if i > 0:
                line.append("→", "dim")
            style = _STYLE.get(s, "dim")
            brace = ("[", "]") if s in ("done", "active") else (" ", " ")
            line.append(f"{brace[0]}{t}{brace[1]}", style)
        self.update(line)


class StatusBar(Static):
    """Footer status — model · tokens · progress · elapsed.

    Like Codex footer.rs with context_window_percent.
    """

    DEFAULT_CSS = """
    StatusBar {
        height: 1;
        padding: 0 1;
        background: $accent;
        color: $text;
    }
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.model = ""
        self.provider = ""
        self.tokens_used = 0
        self.token_budget = 500_000
        self.modules_done = 0
        self.modules_total = 0
        self.started_at = 0.0

    def refresh_status(self):
        parts = []

        if self.model:
            short = self.model.split("/")[-1][:25]
            parts.append(f"[bold]{short}[/]")

        if self.token_budget > 0:
            pct = self.tokens_used / max(self.token_budget, 1)
            tok = _compact(self.tokens_used)
            color = "green" if pct < 0.5 else "yellow" if pct < 0.8 else "red"
            parts.append(f"[{color}]{tok} ({pct:.0%})[/]")

        if self.modules_total > 0:
            parts.append(f"{self.modules_done}/{self.modules_total} mod")

        if self.started_at > 0:
            elapsed = time.time() - self.started_at
            parts.append(_fmt_elapsed(elapsed))

        self.update(" · ".join(parts))


class TranscriptLog(RichLog):
    """Scrollable transcript — like Codex ChatWidget history cells."""

    DEFAULT_CSS = """
    TranscriptLog {
        padding: 0 1;
        scrollbar-size: 1 1;
    }
    """


# ── Main App ─────────────────────────────────────────────

class AvaTUI(App):
    """Full-screen TUI for AVA pipeline — the Python Codex equivalent."""

    CSS = """
    Screen {
        layout: vertical;
    }
    #header-label {
        height: 1;
        padding: 0 1;
        background: $primary;
        color: $text;
        text-style: bold;
    }
    #plan {
        max-height: 10;
        border-bottom: solid $surface-darken-1;
    }
    #transcript {
        height: 1fr;
    }
    #blockbar {
        border-top: solid $surface-darken-1;
    }
    #statusbar {
        dock: bottom;
    }
    """

    BINDINGS = [
        ("q", "quit", "Quit"),
        ("t", "toggle_transcript", "Transcript"),
    ]

    def __init__(self, goal: str = "", modules: list[str] = None,
                 provider: str = "", model: str = "",
                 token_budget: int = 500_000, **kwargs):
        super().__init__(**kwargs)
        self.goal = goal
        self.module_names = modules or []
        self._provider = provider
        self._model = model
        self._token_budget = token_budget
        self._module_states: dict[str, ModuleState] = {}
        self._started_at = time.time()

        for name in self.module_names:
            self._module_states[name] = ModuleState(name=name)

    def compose(self) -> ComposeResult:
        yield Label(f"  ava — {self.goal}", id="header-label")
        yield PlanWidget(self.module_names, id="plan")
        yield TranscriptLog(id="transcript", highlight=True, markup=True)
        yield BlockBar(id="blockbar")
        yield StatusBar(id="statusbar")

    def on_mount(self):
        # Initialize status bar
        sb = self.query_one("#statusbar", StatusBar)
        sb.model = self._model
        sb.provider = self._provider
        sb.token_budget = self._token_budget
        sb.modules_total = len(self.module_names)
        sb.started_at = self._started_at
        sb.refresh_status()

        # Welcome message
        log = self.query_one("#transcript", TranscriptLog)
        log.write(Text.from_markup(
            f"[bold cyan]ava[/] generating [bold]{self.goal}[/]\n"
            f"[dim]{self._provider}/{self._model} · "
            f"budget {self._token_budget:,} tok · "
            f"{len(self.module_names)} modules[/]\n"
        ))

    # ── Public API (called from pipeline thread) ──────────

    def write_log(self, message: str, style: str = "dim"):
        """Add a log entry to the transcript."""
        self.call_from_thread(self._log, message, style)

    def _log(self, message: str, style: str):
        log = self.query_one("#transcript", TranscriptLog)
        log.write(Text(f"  └ {message}", style=style))

    def start_module(self, name: str, types: int = 0):
        """Mark a module as active — like Codex TurnStartedEvent."""
        self.call_from_thread(self._start_module, name, types)

    def _start_module(self, name: str, types: int):
        state = self._module_states.get(name)
        if state:
            state.status = "active"
            state.types = types

        # Update plan
        plan = self.query_one("#plan", PlanWidget)
        plan.set_status(name, "active")

        # Transcript entry
        log = self.query_one("#transcript", TranscriptLog)
        type_str = f" ({types} types)" if types else ""
        log.write(Text.from_markup(f"[cyan bold]▶ {name}{type_str}[/]"))

        # Reset block bar for this module
        bb = self.query_one("#blockbar", BlockBar)
        bb.clear()

    def complete_module(self, name: str, loc: int = 0, errors: int = 0,
                        tokens: int = 0, elapsed: float = 0.0, blocks: int = 0):
        """Mark module done — like Codex TurnCompletedEvent."""
        self.call_from_thread(self._complete_module, name, loc, errors, tokens, elapsed, blocks)

    def _complete_module(self, name: str, loc: int, errors: int,
                         tokens: int, elapsed: float, blocks: int):
        state = self._module_states.get(name)
        if state:
            state.status = "done"
            state.loc = loc
            state.tokens = tokens
            state.errors = errors
            state.elapsed = elapsed
            state.blocks = blocks

        # Update plan
        plan = self.query_one("#plan", PlanWidget)
        plan.set_status(name, "done")

        # Transcript — like Codex FinalMessageSeparator
        log = self.query_one("#transcript", TranscriptLog)
        icon = "[green]✔[/]" if errors == 0 else "[red]✘[/]"
        parts = [f"{icon} [bold]{name}[/]"]
        if loc:
            parts.append(f"{loc} LOC")
        if errors:
            parts.append(f"[red]{errors} err[/]")
        parts.append(f"{tokens:,} tok")
        if elapsed:
            parts.append(f"{elapsed:.0f}s")
        if blocks:
            parts.append(f"{blocks} blk")
        log.write(Text.from_markup(" · ".join(parts)))
        log.write("")  # spacer

        # Update status bar
        sb = self.query_one("#statusbar", StatusBar)
        sb.modules_done += 1
        sb.tokens_used += tokens
        sb.refresh_status()

    def fail_module(self, name: str, error: str = ""):
        """Mark module failed."""
        self.call_from_thread(self._fail_module, name, error)

    def _fail_module(self, name: str, error: str):
        state = self._module_states.get(name)
        if state:
            state.status = "failed"

        plan = self.query_one("#plan", PlanWidget)
        plan.set_status(name, "failed")

        log = self.query_one("#transcript", TranscriptLog)
        log.write(Text.from_markup(f"[red bold]✘ {name}[/] — {error}"))

    def add_block(self, type_char: str, status: str = "active"):
        """Add a block to the block bar."""
        self.call_from_thread(self._add_block, type_char, status)

    def _add_block(self, type_char: str, status: str):
        bb = self.query_one("#blockbar", BlockBar)
        bb.add_block(type_char, status)

    def complete_block(self, idx: int):
        """Mark a block as done."""
        self.call_from_thread(self._complete_block, idx)

    def _complete_block(self, idx: int):
        bb = self.query_one("#blockbar", BlockBar)
        bb.set_block_status(idx, "done")

    def exec_start(self, command: str):
        """Show a command starting — like Codex ExecCell."""
        self.call_from_thread(self._exec_start, command)

    def _exec_start(self, command: str):
        log = self.query_one("#transcript", TranscriptLog)
        log.write(Text.from_markup(f"  [magenta]$[/] {command} [cyan]⠋[/]"))

    def exec_done(self, command: str, exit_code: int = 0, output: str = ""):
        """Show command result — like Codex ExecCell completion."""
        self.call_from_thread(self._exec_done, command, exit_code, output)

    def _exec_done(self, command: str, exit_code: int, output: str):
        log = self.query_one("#transcript", TranscriptLog)
        icon = "[green]●[/]" if exit_code == 0 else "[red]●[/]"
        msg = f"  {icon} {command}"
        if output:
            msg += f"\n    [dim]└ {output[:80]}[/]"
        log.write(Text.from_markup(msg))

    def action_toggle_transcript(self):
        """Toggle transcript visibility — like Codex Ctrl+T."""
        log = self.query_one("#transcript", TranscriptLog)
        log.toggle_class("hidden")

    # ── Thread API ────────────────────────────────────────

    def run_in_thread(self) -> threading.Thread:
        """Start the TUI in a background thread.

        The pipeline runs on the main thread and calls
        tui.log(), tui.start_module(), etc.
        """
        t = threading.Thread(target=self.run, daemon=True)
        t.start()
        return t

    def stop(self):
        """Stop the TUI gracefully."""
        self.call_from_thread(self.exit)


# ── Helpers ───────────────────────────────────────────────

def _compact(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.0f}K"
    return str(n)


def _fmt_elapsed(secs: float) -> str:
    s = int(secs)
    if s < 60:
        return f"{s}s"
    if s < 3600:
        return f"{s // 60}m {s % 60:02d}s"
    return f"{s // 3600}h {(s % 3600) // 60:02d}m"
