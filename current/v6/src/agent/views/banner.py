"""
banner.py — Welcome banner and session info display.
"""
from __future__ import annotations

from .. import __version__
from .theme import box, bold, dim, muted, accent, CYAN, GREEN, YELLOW, GRAY, RESET


def welcome(
    provider: str = "",
    model: str = "",
    project_count: int = 0,
    agent_count: int = 0,
    index_chunks: int = 0,
) -> str:
    """Render the welcome banner shown at REPL start."""
    lines = [
        f"{bold('ava')} {muted('v' + __version__)} {muted('·')} {accent(provider)}{muted('/')}{model}",
        f"{muted(str(project_count) + ' projects')} {muted('·')} {muted(str(agent_count) + ' agents')}"
        + (f" {muted('·')} {muted(f'{index_chunks:,} indexed')}" if index_chunks else ""),
    ]
    return box(lines) + f"\n{muted('  Type /help for commands · Ctrl+C to exit')}\n"


def farewell() -> str:
    return f"\n{muted('Session ended. Goodbye.')}"
