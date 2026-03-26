"""BigContext strategy — everything in 1 call. The default for small types."""
from __future__ import annotations

from .base import GenerationStrategy, StrategyResult


class BigContextStrategy(GenerationStrategy):
    """Single LLM call with full context. Fast, cheap, coherent."""

    name = "big_context"

    def execute(self, context: dict) -> StrategyResult:
        """Standard translate_type — 1 call with everything."""
        llm = context["llm"]
        system = context.get("system_prompt", "")
        user = context.get("user_prompt", "")
        max_tokens = context.get("max_tokens", 8000)

        from ...core.llm.providers import LLMMessage
        resp = llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", user)],
            temperature=0.2, max_tokens=max_tokens,
        )

        return StrategyResult(
            code=resp.content,
            success=True,
            tokens_used=resp.usage.total_tokens,
            calls_made=1,
            strategy_name=self.name,
        )
