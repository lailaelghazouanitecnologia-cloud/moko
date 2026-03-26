"""
status.py — Compact status line shown after each response.
"""
from __future__ import annotations

from .theme import DIM, GRAY, CYAN, GREEN, YELLOW, RESET, COLORS_ENABLED


def format_status(
    total_tokens: int = 0,
    elapsed_s: float = 0.0,
    agents_used: list[str] | None = None,
    is_estimated: bool = False,
    fast_mode: bool = False,
    cached: bool = False,
) -> str:
    """One-line status: tokens · time · pipeline · [fast] · [cached]."""
    if not COLORS_ENABLED:
        parts = []
        if cached:
            parts.append("cached")
        elif total_tokens:
            est = "~" if is_estimated else ""
            parts.append(f"{est}{_fmt_tokens(total_tokens)} tokens")
        if elapsed_s:
            parts.append(f"{elapsed_s:.1f}s")
        if agents_used:
            parts.append(" -> ".join(agents_used))
        if fast_mode and not cached:
            parts.append("fast")
        return f"  {' · '.join(parts)}" if parts else ""

    parts = []
    if cached:
        parts.append(f"{GREEN}cached{RESET}")
    elif total_tokens:
        est = "~" if is_estimated else ""
        parts.append(f"{CYAN}{est}{_fmt_tokens(total_tokens)} tokens{RESET}")
    if elapsed_s:
        parts.append(f"{GREEN}{elapsed_s:.1f}s{RESET}")
    if agents_used:
        pipeline = f" {GRAY}\u2192{RESET} ".join(agents_used)
        parts.append(pipeline)
    if fast_mode and not cached:
        parts.append(f"{YELLOW}fast{RESET}")

    sep = f" {GRAY}\u00b7{RESET} "
    return f"\n  {sep.join(parts)}" if parts else ""


def _fmt_tokens(n: int) -> str:
    """Format token count: 1234 -> 1.2k, 12345 -> 12.3k."""
    if n >= 1000:
        return f"{n / 1000:.1f}k"
    return str(n)
