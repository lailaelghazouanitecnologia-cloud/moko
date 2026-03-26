"""Core rules component — type safety, naming, organization."""
from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from ..engine import PromptContext

# Tiered rules: critical (always), standard (most models), verbose (large context only)
CRITICAL_RULES = """
TYPE SAFETY:
- NEVER use 'any'. Use 'unknown', generics, or specific interfaces.
- Mark constructor-only fields as 'private readonly'.
- Use discriminated unions for state types.

NAMING:
- The exported type MUST use the EXACT name from the blueprint.
- File naming: kebab-case ONLY.
- Cross-module imports via barrel (index). Same-module via relative path.

OUTPUT:
- Output ONLY source code. No markdown fences, no explanations.
- Implement EVERY method in the blueprint. No stubs, no TODOs.
""".strip()

STANDARD_RULES = """
- Use generic type parameters <T> for reusable containers and handlers.
- Use ReadonlyArray<T> for arrays that should not be mutated.
- Define type aliases for domain concepts (e.g., type TaskId = string & { __brand: 'TaskId' }).
- ALWAYS import types from dependency modules. Do NOT redefine existing types.
- If an IMPORT MAP is provided, use EXACTLY those paths.
- Use optional chaining (?.) and nullish coalescing (??) over verbose null checks.
- Use early returns for control flow, ternary for simple branches.
""".strip()

VERBOSE_RULES = """
- Create interfaces for abstractions other modules depend on.
- Use string literal union types: type Status = 'active' | 'paused' | 'done'.
- Every line must earn its place — remove validation of typed params, comments restating code.
""".strip()


def get_rules(ctx: "PromptContext") -> str:
    """Assemble rules based on model tier and budget."""
    parts = [CRITICAL_RULES]

    if ctx.tier != "minimal":
        parts.append(STANDARD_RULES)

    if ctx.tier == "verbose" and ctx.budget_remaining > 2000:
        parts.append(VERBOSE_RULES)

    return "\n\n".join(parts)
