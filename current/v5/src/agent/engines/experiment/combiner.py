"""
VariantCombiner — combine winning parts from evaluated variants.

Not a debate — concrete instructions based on which variant won which metric.
Single LLM call with "use structure from A, error handling from B".
"""
from __future__ import annotations

from typing import List, Optional

from ...core.llm.providers import LLMProvider, LLMMessage
from .variants import Variant
from .evaluator import EvalResult


class VariantCombiner:
    """Combine the best parts of evaluated variants into one."""

    def __init__(self, llm: LLMProvider, verbose: bool = False):
        self.llm = llm
        self.verbose = verbose
        self.tokens_used = 0

    def combine(
        self,
        variants: List[Variant],
        results: List[EvalResult],
    ) -> Optional[Variant]:
        """Combine best parts of variants based on eval results.

        If one variant clearly wins (score > others by 20%), just use it.
        If close, combine strengths.
        """
        if not variants or not results:
            return None

        # Sort by score
        scored = sorted(zip(results, variants), key=lambda x: x[0].score(), reverse=True)
        best_result, best_variant = scored[0]

        # If only one variant or clear winner, return as-is
        if len(scored) == 1:
            return best_variant

        second_result, second_variant = scored[1]
        score_gap = best_result.score() - second_result.score()

        if score_gap > 0.2:
            if self.verbose:
                print(f"    [combine] clear winner: {best_variant.id} "
                      f"(score={best_result.score():.2f} vs {second_result.score():.2f})")
            return best_variant

        # Close scores — combine strengths
        instructions = self._build_combination_instructions(
            best_variant, best_result,
            second_variant, second_result,
        )

        if self.verbose:
            print(f"    [combine] merging {best_variant.id}+{second_variant.id}: {instructions[:80]}...")

        system = (
            "You are a code combiner. Merge the best parts of two TypeScript implementations.\n"
            "Output ONLY the combined source code. No explanations.\n"
            "Keep ALL methods from the better version. Add improvements from the other."
        )

        user = (
            f"## Version {best_variant.id} (primary — keep this structure)\n"
            f"```typescript\n{best_variant.code}\n```\n\n"
            f"## Version {second_variant.id} (secondary — take improvements)\n"
            f"```typescript\n{second_variant.code}\n```\n\n"
            f"## Combination instructions\n{instructions}\n\n"
            f"Return the COMPLETE combined file."
        )

        try:
            resp = self.llm.complete_with_usage(
                [LLMMessage("system", system), LLMMessage("user", user)],
                temperature=0.3, max_tokens=10000,
            )
            self.tokens_used += resp.usage.total_tokens

            code = resp.content.strip()
            if code.startswith("```"):
                lines = code.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                code = "\n".join(lines)

            return Variant(
                id="combined",
                approach=f"Combined {best_variant.id}+{second_variant.id}",
                code=code,
                tokens_used=resp.usage.total_tokens,
            )

        except Exception as e:
            if self.verbose:
                print(f"    [combine] failed: {e}, using best variant")
            return best_variant

    def _build_combination_instructions(
        self,
        a: Variant, a_result: EvalResult,
        b: Variant, b_result: EvalResult,
    ) -> str:
        """Build concrete instructions based on which variant wins which metric."""
        parts = []

        # Structure: more methods wins
        if a_result.method_count >= b_result.method_count:
            parts.append(f"Keep {a.id}'s structure ({a_result.method_count} methods)")
        else:
            parts.append(f"Add {b.id}'s extra methods ({b_result.method_count} vs {a_result.method_count})")

        # Type safety: fewer any wins
        if a_result.any_count > b_result.any_count and b_result.any_count == 0:
            parts.append(f"Use {b.id}'s type annotations (0 any vs {a_result.any_count})")

        # Error handling
        if not a_result.has_error_handling and b_result.has_error_handling:
            parts.append(f"Add {b.id}'s error handling")

        # Readonly
        if not a_result.has_readonly and b_result.has_readonly:
            parts.append(f"Add {b.id}'s readonly modifiers")

        # Complexity: more complex = more real logic
        if b_result.complexity > a_result.complexity * 1.5:
            parts.append(f"Use {b.id}'s more detailed implementations")

        return "\n".join(f"- {p}" for p in parts) if parts else "Use the primary version as-is."
