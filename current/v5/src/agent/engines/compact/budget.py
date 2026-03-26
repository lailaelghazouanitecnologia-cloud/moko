"""
ContextBudget — real-time token tracking and budget enforcement.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Tuple


@dataclass
class BudgetSection:
    """One section of the prompt with its priority and size."""
    name: str
    content: str
    tokens: int              # estimated tokens (~chars/4)
    priority: int            # higher = more important (10 = critical, 1 = optional)
    compressible: bool = True  # can this section be truncated?


class ContextBudget:
    """Track and manage context window budget across a turn.

    Usage:
        budget = ContextBudget(max_tokens=8000)
        budget.add("blueprint", yaml_content, priority=10)
        budget.add("spec", spec_content, priority=8)
        budget.add("siblings", sibling_context, priority=5)
        budget.add("examples", ref_examples, priority=3)
        prompt = budget.build()  # Assembled within budget
    """

    def __init__(self, max_tokens: int = 8000):
        self.max_tokens = max_tokens
        self.sections: List[BudgetSection] = []
        self._used: int = 0

    @property
    def used(self) -> int:
        return sum(s.tokens for s in self.sections)

    @property
    def remaining(self) -> int:
        return max(0, self.max_tokens - self.used)

    @property
    def utilization(self) -> float:
        return self.used / max(self.max_tokens, 1)

    def add(self, name: str, content: str, priority: int = 5,
            compressible: bool = True) -> bool:
        """Add a section. Returns True if it fit."""
        if not content:
            return True

        tokens = len(content) // 4
        if tokens <= self.remaining:
            self.sections.append(BudgetSection(
                name=name, content=content, tokens=tokens,
                priority=priority, compressible=compressible,
            ))
            return True

        # Try to fit by truncating
        if compressible and self.remaining > 100:
            max_chars = self.remaining * 4
            truncated = content[:max_chars - 20] + "\n... (truncated)"
            self.sections.append(BudgetSection(
                name=name, content=truncated,
                tokens=len(truncated) // 4,
                priority=priority, compressible=compressible,
            ))
            return True

        return False

    def build(self) -> str:
        """Assemble all sections within budget, dropping lowest priority first."""
        # Sort by priority (highest first)
        sorted_sections = sorted(self.sections, key=lambda s: s.priority, reverse=True)

        # If over budget, drop lowest priority sections
        total = sum(s.tokens for s in sorted_sections)
        while total > self.max_tokens and sorted_sections:
            # Find lowest priority compressible section
            for i in range(len(sorted_sections) - 1, -1, -1):
                if sorted_sections[i].compressible:
                    total -= sorted_sections[i].tokens
                    sorted_sections.pop(i)
                    break
            else:
                break  # No compressible sections left

        # Reassemble in original order (by insertion index)
        ordered = sorted(sorted_sections, key=lambda s: self.sections.index(s))
        return "\n\n".join(s.content for s in ordered)

    def summary(self) -> str:
        lines = [f"Budget: {self.used}/{self.max_tokens} tokens ({self.utilization:.0%})"]
        for s in self.sections:
            lines.append(f"  {s.name}: {s.tokens} tokens (priority {s.priority})")
        return "\n".join(lines)
