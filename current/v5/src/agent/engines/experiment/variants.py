"""
VariantGenerator — generates N code variants with different approaches.

Each variant gets the same context (blueprint, spec, dependencies) but
different instructions: "use classes" vs "use functions", "verbose error
handling" vs "minimal", etc.

Variants are generated in parallel (sequential LLM calls but independent).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from ...core.llm.providers import LLMProvider, LLMMessage


@dataclass
class Variant:
    """One code variant with its generation context."""
    id: str                          # "A", "B", "C"
    approach: str                    # description of the approach
    code: str                        # generated TypeScript code
    tokens_used: int = 0
    instructions: str = ""           # specific instructions given to LLM


# Predefined approach pairs for common decisions
APPROACH_PAIRS = {
    "structure": [
        ("class-based", "Use classes with private fields, dependency injection, and encapsulation."),
        ("functional", "Use pure functions and closures. No classes. Immutable data."),
    ],
    "error_handling": [
        ("defensive", "Validate all inputs, use typed errors (TypeError, RangeError), try/catch on I/O."),
        ("minimal", "Trust TypeScript types. Only catch at boundaries. No redundant validation."),
    ],
    "complexity": [
        ("exhaustive", "Implement every edge case. Full switch coverage. All opcodes/commands."),
        ("core_first", "Implement core path first. Mark edge cases with TODO for next pass."),
    ],
}


class VariantGenerator:
    """Generate N variants of a type/module with different approaches."""

    def __init__(self, llm: LLMProvider, verbose: bool = False):
        self.llm = llm
        self.verbose = verbose
        self.total_tokens = 0

    def generate_variants(
        self,
        blueprint_yaml: str,
        context: str,
        spec_context: str = "",
        approaches: Optional[List[Tuple[str, str]]] = None,
        max_variants: int = 2,
    ) -> List[Variant]:
        """Generate multiple code variants from the same blueprint.

        Args:
            blueprint_yaml: The type blueprint in YAML
            context: Module context (imports, siblings, cross-module)
            spec_context: FunctionalSpec context if available
            approaches: List of (id, instruction) pairs. Auto-selected if None.
            max_variants: Maximum variants to generate
        """
        if approaches is None:
            approaches = self._select_approaches(blueprint_yaml, max_variants)

        variants = []
        for var_id, instruction in approaches[:max_variants]:
            if self.verbose:
                print(f"    [experiment] generating variant {var_id}...")

            system = (
                "You are a code translator. Convert this YAML blueprint to TypeScript.\n"
                "Implement EVERY method. No stubs, no TODOs.\n"
                f"APPROACH: {instruction}\n"
                "Output ONLY the source code."
            )

            user = f"## Blueprint\n```yaml\n{blueprint_yaml}\n```\n\n{context}"
            if spec_context:
                user += f"\n{spec_context}\n"

            try:
                resp = self.llm.complete_with_usage(
                    [LLMMessage("system", system), LLMMessage("user", user)],
                    temperature=0.5, max_tokens=8000,
                )
                code = self._strip_fences(resp.content)
                tokens = resp.usage.total_tokens
                self.total_tokens += tokens

                variants.append(Variant(
                    id=var_id,
                    approach=instruction,
                    code=code,
                    tokens_used=tokens,
                    instructions=instruction,
                ))

                if self.verbose:
                    loc = len(code.splitlines())
                    print(f"    [experiment] variant {var_id}: {loc} LOC, {tokens} tokens")

            except Exception as e:
                if self.verbose:
                    print(f"    [experiment] variant {var_id} failed: {e}")

        return variants

    def _select_approaches(
        self, blueprint_yaml: str, max_variants: int
    ) -> List[Tuple[str, str]]:
        """Auto-select approach pairs based on blueprint content."""
        bp_lower = blueprint_yaml.lower()

        # Detect what kind of decisions matter for this type
        if any(w in bp_lower for w in ["opcode", "instruction", "decode", "execute"]):
            pairs = APPROACH_PAIRS["complexity"]
        elif any(w in bp_lower for w in ["service", "controller", "handler", "route"]):
            pairs = APPROACH_PAIRS["structure"]
        else:
            pairs = APPROACH_PAIRS["error_handling"]

        result = []
        for i, (name, instruction) in enumerate(pairs[:max_variants]):
            result.append((chr(65 + i), instruction))  # "A", "B", "C"
        return result

    @staticmethod
    def _strip_fences(text: str) -> str:
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            return "\n".join(lines)
        return text
