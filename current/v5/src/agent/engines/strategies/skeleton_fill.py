"""Skeleton+Fill strategy — structure first, logic second.

For complex types with many methods: generate skeleton with stubs,
then fill in groups of methods incrementally.
"""
from __future__ import annotations

from .base import GenerationStrategy, StrategyResult


class SkeletonFillStrategy(GenerationStrategy):
    """Generate skeleton first, then fill method groups."""

    name = "skeleton_fill"

    def execute(self, context: dict) -> StrategyResult:
        llm = context["llm"]
        system = context.get("system_prompt", "")
        blueprint = context.get("blueprint_yaml", "")
        spec = context.get("spec_context", "")
        user_base = context.get("user_prompt", "")
        max_tokens = context.get("max_tokens", 12000)

        from ...core.llm.providers import LLMMessage
        total_tokens = 0

        # Step 1: Generate skeleton with all method signatures
        skeleton_prompt = (
            f"{user_base}\n\n"
            "IMPORTANT: Generate the COMPLETE class with ALL method signatures "
            "and full implementations. Do not use stubs."
        )

        resp = llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", skeleton_prompt)],
            temperature=0.2, max_tokens=max_tokens,
        )
        total_tokens += resp.usage.total_tokens
        code = resp.content

        # Step 2: Check if all methods are present
        import re
        method_names = set()
        if blueprint:
            for line in blueprint.splitlines():
                m = re.match(r'\s*-?\s*name:\s*(\w+)', line)
                if m:
                    method_names.add(m.group(1))

        if not method_names:
            return StrategyResult(
                code=code, success=True,
                tokens_used=total_tokens, calls_made=1,
                strategy_name=self.name,
            )

        # Check which methods are implemented
        impl = set(re.findall(
            r'(?:async\s+)?(?:private\s+|public\s+|protected\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{',
            code
        ))
        missing = method_names - impl - {"constructor"}

        if not missing:
            return StrategyResult(
                code=code, success=True,
                tokens_used=total_tokens, calls_made=1,
                strategy_name=self.name,
            )

        # Step 3: Fill missing methods
        fill_prompt = (
            f"## Existing code\n```typescript\n{code}\n```\n\n"
            f"## Missing methods (MUST add ALL):\n"
            + "\n".join(f"- {m}" for m in sorted(missing))
            + f"\n\n{spec}\n"
            "Add ALL missing methods. Keep existing code intact. Return COMPLETE file."
        )

        resp2 = llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", fill_prompt)],
            temperature=0.2, max_tokens=max_tokens,
        )
        total_tokens += resp2.usage.total_tokens

        # Use filled version if it's bigger
        filled = resp2.content
        if len(filled.splitlines()) >= len(code.splitlines()) * 0.8:
            code = filled

        return StrategyResult(
            code=code, success=True,
            tokens_used=total_tokens,
            calls_made=2,
            strategy_name=self.name,
        )
