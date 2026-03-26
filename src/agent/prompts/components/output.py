"""Output component — defines what format the LLM should produce."""
from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ..engine import PromptContext


def get_output(ctx: "PromptContext") -> str:
    """Define output expectations."""
    if ctx.task == "translate":
        return (
            "Output ONLY the complete TypeScript source code.\n"
            "Include all imports at the top.\n"
            "The code must be directly importable — no setup needed."
        )
    if ctx.task == "blueprint":
        return (
            "Output ONLY raw YAML. No markdown fences.\n"
            "Include: name, kind, fields, methods with signatures and hints."
        )
    if ctx.task == "fix":
        return (
            "Output the COMPLETE fixed file.\n"
            "Change ONLY what's needed to fix the error.\n"
            "Keep all existing code intact."
        )
    if ctx.task == "expand":
        return (
            "Output the COMPLETE file with ALL existing code PLUS new methods.\n"
            "Do NOT remove or rewrite existing methods."
        )
    return "Output only the requested content."
