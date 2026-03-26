"""Context component — imports, siblings, cross-module, references."""
from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ..engine import PromptContext


def get_context(ctx: "PromptContext") -> str:
    """Inject code context: what exists in the project that the LLM needs to know."""
    parts = []

    # Import map (exact paths)
    if ctx.import_map:
        parts.append(f"## Import Map (use EXACTLY these paths)\n{ctx.import_map}")

    # Sibling types in the same module
    if ctx.sibling_context:
        parts.append(f"## Sibling types\n{ctx.sibling_context}")

    # Cross-module signatures (from already-generated modules)
    if ctx.cross_module_context:
        parts.append(f"## Available from other modules\n{ctx.cross_module_context}")

    # Reference descriptors (from analyzed repos)
    if ctx.reference_context:
        parts.append(f"## Reference patterns\n{ctx.reference_context}")

    # Prior layers (compact summaries of dependencies)
    if ctx.prior_layers:
        parts.append(f"## Prior layers\n{ctx.prior_layers}")

    return "\n\n".join(parts) if parts else ""
