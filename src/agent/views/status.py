"""
StatusLine — persistent footer showing model, tokens, context usage.

Inspired by Codex footer.rs: configurable status items on one line,
width-adaptive collapse, token/context percentage display.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Optional

from rich.text import Text
from rich.style import Style


@dataclass
class StatusLine:
    """Footer status bar — model · tokens · context · elapsed."""

    provider: str = ""
    model: str = ""
    tokens_used: int = 0
    token_budget: int = 500_000
    modules_done: int = 0
    modules_total: int = 0
    current_module: str = ""
    started_at: float = 0.0
    errors: int = 0

    def render(self, width: int = 80) -> Text:
        """Render status line fitting within terminal width."""
        parts = []

        # Model (like Codex shows model in footer)
        if self.model:
            model_short = self.model.split("/")[-1][:20]
            parts.append(("model:", "dim"))
            parts.append((model_short, "cyan"))

        # Tokens with percentage
        if self.token_budget > 0:
            pct = self.tokens_used / self.token_budget
            tok_str = _compact_number(self.tokens_used)
            parts.append(("tok:", "dim"))
            color = "green" if pct < 0.5 else "yellow" if pct < 0.8 else "red"
            parts.append((f"{tok_str} ({pct:.0%})", color))

        # Progress
        if self.modules_total > 0:
            parts.append(("prog:", "dim"))
            parts.append((f"{self.modules_done}/{self.modules_total}", "bold"))

        # Current module
        if self.current_module:
            parts.append(("now:", "dim"))
            parts.append((self.current_module, "magenta bold"))

        # Elapsed
        if self.started_at > 0:
            elapsed = time.time() - self.started_at
            parts.append((_fmt_elapsed(elapsed), "dim"))

        # Errors
        if self.errors > 0:
            parts.append((f"{self.errors}err", "red bold"))

        # Build Text with separators, collapsing if needed
        line = Text()
        for i, (txt, style) in enumerate(parts):
            if i > 0:
                line.append(" · ", "dim")
            line.append(txt, style)

        # Collapse: if too wide, drop from right
        if line.cell_len > width:
            line = Text()
            for i, (txt, style) in enumerate(parts[:4]):
                if i > 0:
                    line.append(" · ", "dim")
                line.append(txt, style)

        return line


def _compact_number(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.0f}K"
    return str(n)


def _fmt_elapsed(secs: float) -> str:
    """Compact elapsed — matches Codex fmt_elapsed_compact."""
    s = int(secs)
    if s < 60:
        return f"{s}s"
    if s < 3600:
        return f"{s // 60}m {s % 60:02d}s"
    h = s // 3600
    m = (s % 3600) // 60
    return f"{h}h {m:02d}m"
