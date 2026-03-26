"""
markdown.py — Minimal terminal markdown renderer.

Converts common markdown patterns to ANSI-styled text.
No external dependencies. Handles: headers, bold, italic,
inline code, code blocks, lists, and horizontal rules.
"""
from __future__ import annotations

import re

from .theme import (
    BOLD, DIM, ITALIC, RESET, CYAN, GREEN, YELLOW, GRAY, BRIGHT_WHITE,
    COLORS_ENABLED,
)


def render(text: str) -> str:
    """Render markdown text with ANSI styles for terminal display."""
    if not COLORS_ENABLED:
        return text

    lines = text.split("\n")
    result = []
    in_code_block = False
    code_block_lines: list[str] = []

    for line in lines:
        # Code block toggle
        if line.strip().startswith("```"):
            if in_code_block:
                # Close code block
                result.append(_render_code_block(code_block_lines))
                code_block_lines = []
                in_code_block = False
            else:
                in_code_block = True
            continue

        if in_code_block:
            code_block_lines.append(line)
            continue

        # Headers
        if line.startswith("### "):
            result.append(f"  {BOLD}{CYAN}{line[4:]}{RESET}")
            continue
        if line.startswith("## "):
            result.append(f"\n  {BOLD}{BRIGHT_WHITE}{line[3:]}{RESET}")
            continue
        if line.startswith("# "):
            result.append(f"\n  {BOLD}{BRIGHT_WHITE}{line[2:]}{RESET}")
            continue

        # Horizontal rule
        if re.match(r'^-{3,}$|^\*{3,}$|^_{3,}$', line.strip()):
            result.append(f"  {GRAY}{'─' * 50}{RESET}")
            continue

        # Inline formatting
        result.append(_render_inline(line))

    # Unclosed code block
    if code_block_lines:
        result.append(_render_code_block(code_block_lines))

    return "\n".join(result)


def _render_inline(line: str) -> str:
    """Apply inline markdown formatting: bold, italic, code, links."""
    # Bold: **text** or __text__
    line = re.sub(
        r'\*\*(.+?)\*\*|__(.+?)__',
        lambda m: f"{BOLD}{m.group(1) or m.group(2)}{RESET}",
        line,
    )
    # Italic: *text* or _text_ (but not inside words like file_name)
    line = re.sub(
        r'(?<!\w)\*(.+?)\*(?!\w)|(?<!\w)_(.+?)_(?!\w)',
        lambda m: f"{ITALIC}{m.group(1) or m.group(2)}{RESET}",
        line,
    )
    # Inline code: `text`
    line = re.sub(
        r'`([^`]+)`',
        lambda m: f"{GREEN}{m.group(1)}{RESET}",
        line,
    )
    # List items: - or * at start
    if re.match(r'^(\s*)[*-]\s', line):
        line = re.sub(r'^(\s*)[*-]\s', rf'\1{CYAN}·{RESET} ', line)
    # Numbered lists: 1. 2. etc
    if re.match(r'^(\s*)\d+\.\s', line):
        line = re.sub(
            r'^(\s*)(\d+\.)\s',
            lambda m: f"{m.group(1)}{YELLOW}{m.group(2)}{RESET} ",
            line,
        )
    return line


def _render_code_block(lines: list[str]) -> str:
    """Render a code block with a left border."""
    if not lines:
        return ""
    rendered = []
    rendered.append(f"  {GRAY}┌{'─' * 50}{RESET}")
    for line in lines:
        rendered.append(f"  {GRAY}│{RESET} {DIM}{line}{RESET}")
    rendered.append(f"  {GRAY}└{'─' * 50}{RESET}")
    return "\n".join(rendered)
