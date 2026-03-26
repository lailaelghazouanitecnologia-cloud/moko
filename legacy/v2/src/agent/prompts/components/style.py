"""Style component — from StyleProfile + .ava/rules.md + project instructions."""
from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ..engine import PromptContext


def get_style(ctx: "PromptContext") -> str:
    """Inject style preferences and project-specific rules."""
    parts = []

    # Style hints from QualityEngine's StyleProfile
    if ctx.style_hints:
        parts.append("## Style")
        for hint in ctx.style_hints[:8]:
            parts.append(f"- {hint}")

    # Project instructions from .ava/rules.md (like AGENTS.md in Codex)
    if ctx.project_rules:
        parts.append("\n## Project Rules")
        parts.append(ctx.project_rules)

    # Invariants from the project
    if ctx.invariants:
        parts.append("\n## Invariants (MUST respect)")
        for inv in ctx.invariants[:5]:
            parts.append(f"- {inv}")

    return "\n".join(parts) if parts else ""
