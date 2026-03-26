"""
router.py — Query complexity classifier + model router.

Classifies query complexity into tiers and routes to the
cheapest capable model. Used by /fast mode for token optimization.

Tiers:
  TRIVIAL  → haiku / llama-8b    (list, show, simple lookups)
  SIMPLE   → haiku / llama-8b    (single-focus questions)
  MEDIUM   → sonnet / llama-70b  (analysis, multi-step)
  COMPLEX  → sonnet / kimi-k2    (compare, deep reasoning)
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Complexity(Enum):
    TRIVIAL = "trivial"
    SIMPLE = "simple"
    MEDIUM = "medium"
    COMPLEX = "complex"


# Keywords that signal reasoning / deep analysis
_REASONING_SIGNALS = frozenset({
    "analyze", "compare", "contrast", "versus", "vs",
    "why", "how does", "explain", "trade-off", "pros and cons",
    "design", "pattern", "architecture", "security", "vulnerability",
    "refactor", "optimize", "benchmark", "evaluate",
})

# Keywords that signal trivial / lookup queries
_TRIVIAL_SIGNALS = frozenset({
    "list", "show", "what is", "where is", "find", "locate",
    "count", "name", "version", "help",
})


def classify_complexity(query: str, task_type: str = "") -> Complexity:
    """Classify query complexity using heuristics. No ML needed."""
    words = query.lower().split()
    word_count = len(words)
    query_lower = query.lower()

    # Check for reasoning signals
    has_reasoning = any(sig in query_lower for sig in _REASONING_SIGNALS)
    has_trivial = any(sig in query_lower for sig in _TRIVIAL_SIGNALS)

    # Compare is always complex
    if task_type == "compare":
        return Complexity.COMPLEX

    # Very short queries with trivial keywords
    if word_count < 6 and has_trivial and not has_reasoning:
        return Complexity.TRIVIAL

    # Short queries without reasoning
    if word_count < 12 and not has_reasoning:
        return Complexity.SIMPLE

    # Reasoning keywords present
    if has_reasoning:
        if word_count > 25 or task_type in ("security", "compare"):
            return Complexity.COMPLEX
        return Complexity.MEDIUM

    # Default: medium
    return Complexity.MEDIUM


# ── Model routing tables ─────────────────────────────────────

# Fast models per provider — cheapest capable model for each tier
_FAST_MODELS = {
    "groq": {
        Complexity.TRIVIAL: "llama-3.1-8b-instant",
        Complexity.SIMPLE: "llama-3.1-8b-instant",
        Complexity.MEDIUM: "llama-3.3-70b-versatile",
        Complexity.COMPLEX: "moonshotai/kimi-k2-instruct-0905",
    },
    "anthropic": {
        Complexity.TRIVIAL: "claude-haiku-4-5-20251001",
        Complexity.SIMPLE: "claude-haiku-4-5-20251001",
        Complexity.MEDIUM: "claude-haiku-4-5-20251001",
        Complexity.COMPLEX: "claude-sonnet-4-20250514",
    },
    "openai": {
        Complexity.TRIVIAL: "gpt-4o-mini",
        Complexity.SIMPLE: "gpt-4o-mini",
        Complexity.MEDIUM: "gpt-4o-mini",
        Complexity.COMPLEX: "gpt-4o",
    },
}


@dataclass
class RoutingDecision:
    """Result of model routing."""
    model: str
    complexity: Complexity
    max_tokens: int
    reason: str


def route_model(
    query: str,
    task_type: str,
    provider: str,
    default_model: str,
    fast_mode: bool = False,
) -> RoutingDecision:
    """Route query to the optimal model based on complexity.

    In normal mode: always uses default_model.
    In fast mode: uses cheapest capable model per complexity tier.
    """
    complexity = classify_complexity(query, task_type)

    if not fast_mode:
        return RoutingDecision(
            model=default_model,
            complexity=complexity,
            max_tokens=4096,
            reason="normal mode",
        )

    # Fast mode: route to cheap model + cap max_tokens
    provider_models = _FAST_MODELS.get(provider, {})
    model = provider_models.get(complexity, default_model)

    # Adaptive max_tokens based on complexity
    max_tokens_map = {
        Complexity.TRIVIAL: 512,
        Complexity.SIMPLE: 1024,
        Complexity.MEDIUM: 2048,
        Complexity.COMPLEX: 4096,
    }

    return RoutingDecision(
        model=model,
        complexity=complexity,
        max_tokens=max_tokens_map[complexity],
        reason=f"fast/{complexity.value}",
    )
