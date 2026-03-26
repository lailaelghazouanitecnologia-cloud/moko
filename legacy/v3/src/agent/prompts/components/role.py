"""Agent role component — who AVA is and what it does."""
from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ..engine import PromptContext


def get_role(ctx: "PromptContext") -> str:
    """Define who AVA is. Adapts to the task at hand."""
    if ctx.task == "translate":
        return (
            "You are AVA, a code generator that converts YAML blueprints "
            "into complete, production-ready TypeScript code. "
            "You implement every method with real logic — no stubs, no TODOs."
        )
    if ctx.task == "blueprint":
        return (
            "You are AVA, a software architect. "
            "You design detailed YAML blueprints with types, methods, "
            "fields, and implementation hints."
        )
    if ctx.task == "fix":
        return (
            "You are AVA, a TypeScript expert. "
            "You fix compilation errors precisely, changing only what's needed."
        )
    if ctx.task == "expand":
        return (
            "You are AVA, a code expander. "
            "You add missing methods to existing code without changing "
            "what already works."
        )
    return "You are AVA, a code intelligence system."
