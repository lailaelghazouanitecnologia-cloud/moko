"""
AvaConfig — centralized configuration dataclass.

Replaces the raw config dict passed through the system.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class AvaConfig:
    """Configuration for an Ava development run."""

    # LLM settings
    provider: str = "groq"
    model: Optional[str] = None
    temperature: float = 0.3

    # Budget
    budget_chars: int = 20000
    max_total_tokens: int = 500_000

    # Execution
    verbose: bool = False
    max_parallel: int = 4

    # Guardrail overrides (passed through to RunLimits)
    guardrails: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert to dict for backward compatibility."""
        d = {
            "provider": self.provider,
            "verbose": self.verbose,
            "budget_chars": self.budget_chars,
        }
        if self.model:
            d["model"] = self.model
        if self.guardrails:
            d["guardrails"] = self.guardrails
        return d

    @classmethod
    def from_dict(cls, d: dict) -> AvaConfig:
        """Create from a raw config dict."""
        return cls(
            provider=d.get("provider", "groq"),
            model=d.get("model"),
            temperature=d.get("temperature", 0.3),
            budget_chars=d.get("budget_chars", 20000),
            max_total_tokens=d.get("max_total_tokens", 500_000),
            verbose=d.get("verbose", False),
            max_parallel=d.get("max_parallel", 4),
            guardrails=d.get("guardrails", {}),
        )
