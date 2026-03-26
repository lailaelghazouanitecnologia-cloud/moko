"""Anti-patterns component — what the LLM must NOT do."""
from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ..engine import PromptContext

ANTI_PATTERNS = """NEVER:
- typeof/instanceof checks on typed parameters
- JSDoc that restates the method signature
- Empty catch blocks
- Comments like "// stub" or "// TODO: implement"
- Redefine types that exist in dependency modules
- Use 'any' anywhere
- Add .js extension to imports""".strip()


def get_anti_patterns(ctx: "PromptContext") -> str:
    """Anti-patterns — only included when budget allows."""
    if ctx.budget_remaining < 500:
        return ""  # Skip when budget is tight
    return ANTI_PATTERNS
