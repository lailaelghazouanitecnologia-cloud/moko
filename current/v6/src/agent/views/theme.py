"""
theme.py — ANSI colors and styles for terminal output.

Zero dependencies. Respects NO_COLOR (https://no-color.org/)
and detects dumb terminals. All style functions return plain
strings when colors are disabled.
"""
from __future__ import annotations

import os
import sys


def _supports_color() -> bool:
    """Detect if the terminal supports ANSI colors."""
    if os.environ.get("NO_COLOR"):
        return False
    if os.environ.get("FORCE_COLOR"):
        return True
    if not hasattr(sys.stdout, "isatty") or not sys.stdout.isatty():
        return False
    term = os.environ.get("TERM", "")
    if term == "dumb":
        return False
    return True


COLORS_ENABLED = _supports_color()


# ── ANSI codes ──────────────────────────────────────────────

def _esc(code: str) -> str:
    return f"\033[{code}" if COLORS_ENABLED else ""


RESET = _esc("0m")
BOLD = _esc("1m")
DIM = _esc("2m")
ITALIC = _esc("3m")
UNDERLINE = _esc("4m")

# Colors
BLACK = _esc("30m")
RED = _esc("31m")
GREEN = _esc("32m")
YELLOW = _esc("33m")
BLUE = _esc("34m")
MAGENTA = _esc("35m")
CYAN = _esc("36m")
WHITE = _esc("37m")
GRAY = _esc("90m")

# Bright
BRIGHT_RED = _esc("91m")
BRIGHT_GREEN = _esc("92m")
BRIGHT_YELLOW = _esc("93m")
BRIGHT_BLUE = _esc("94m")
BRIGHT_MAGENTA = _esc("95m")
BRIGHT_CYAN = _esc("96m")
BRIGHT_WHITE = _esc("97m")


# ── Style helpers ───────────────────────────────────────────

def bold(text: str) -> str:
    return f"{BOLD}{text}{RESET}"


def dim(text: str) -> str:
    return f"{DIM}{text}{RESET}"


def italic(text: str) -> str:
    return f"{ITALIC}{text}{RESET}"


def color(text: str, c: str) -> str:
    return f"{c}{text}{RESET}"


def success(text: str) -> str:
    return f"{GREEN}{text}{RESET}"


def error(text: str) -> str:
    return f"{RED}{text}{RESET}"


def warning(text: str) -> str:
    return f"{YELLOW}{text}{RESET}"


def muted(text: str) -> str:
    return f"{GRAY}{text}{RESET}"


def accent(text: str) -> str:
    return f"{CYAN}{text}{RESET}"


def highlight(text: str) -> str:
    return f"{BRIGHT_MAGENTA}{text}{RESET}"


# ── Box drawing ─────────────────────────────────────────────

def box(lines: list[str], width: int = 0) -> str:
    """Draw a rounded box around lines of text."""
    if not width:
        width = max((len(line) for line in lines), default=40) + 2
    top = f"╭{'─' * width}╮"
    bot = f"╰{'─' * width}╯"
    rows = []
    rows.append(top)
    for line in lines:
        # Pad to width (accounting for ANSI escape sequences)
        visible_len = len(_strip_ansi(line))
        padding = width - visible_len - 2
        rows.append(f"│ {line}{' ' * max(0, padding)} │")
    rows.append(bot)
    return "\n".join(rows)


def hline(char: str = "─", width: int = 60) -> str:
    return muted(char * width)


# ── ANSI stripping (for width calculations) ─────────────────

def _strip_ansi(text: str) -> str:
    """Remove ANSI escape sequences for visible length calculation."""
    import re
    return re.sub(r'\033\[[0-9;]*m', '', text)


def visible_len(text: str) -> int:
    """Length of text excluding ANSI escape codes."""
    return len(_strip_ansi(text))


# ── Terminal width ──────────────────────────────────────────

def term_width() -> int:
    """Get terminal width, default 80."""
    try:
        return os.get_terminal_size().columns
    except (ValueError, OSError):
        return 80


# ── Cursor control ──────────────────────────────────────────

def clear_line() -> str:
    return "\033[2K\r" if COLORS_ENABLED else "\r"


def move_up(n: int = 1) -> str:
    return f"\033[{n}A" if COLORS_ENABLED else ""
