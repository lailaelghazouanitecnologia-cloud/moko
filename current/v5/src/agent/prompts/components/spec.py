"""Spec component — injects FunctionalSpec domain requirements."""
from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ..engine import PromptContext


def get_spec(ctx: "PromptContext") -> str:
    """Inject domain-specific requirements from GoalReasoner."""
    if not ctx.functional_spec:
        return ""
    return ctx.functional_spec
