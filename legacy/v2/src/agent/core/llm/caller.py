"""
LLMCaller — single point for all guarded LLM calls.

Extracted from DevSupervisor._llm_call. Handles:
  - Guardrail enforcement (throttle, time check, token tracking)
  - Output loop detection
  - JSON response parsing from markdown code blocks
"""
from __future__ import annotations

import hashlib
import json

from .providers import LLMProvider, LLMMessage
from ..guardrails import RunGuard, GuardrailTripped


class LLMCaller:
    """Guarded LLM caller with token tracking and loop detection."""

    def __init__(self, provider: LLMProvider, guard: RunGuard):
        self.llm = provider
        self.guard = guard
        self.total_tokens = 0

    def call(self, system: str, user: str,
             temperature: float = 0.3, max_tokens: int = 4096) -> tuple[str, int]:
        """Make an LLM call and track tokens. Enforces guardrails."""
        self.guard.throttle()
        self.guard.check_time()
        resp = self.llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", user)],
            temperature=temperature, max_tokens=max_tokens,
        )
        tokens = resp.usage.total_tokens
        self.total_tokens += tokens
        self.guard.record_tokens(tokens)

        # Loop detection: hash output to catch LLM repeating itself
        out_hash = hashlib.md5(resp.content[:200].encode()).hexdigest()
        if self.guard.check_output_loop(out_hash):
            raise GuardrailTripped("output_loop",
                                   "LLM producing identical output repeatedly")

        return resp.content, tokens

    @staticmethod
    def parse_json_response(text: str) -> dict | list:
        """Extract JSON from LLM response, handling markdown code blocks."""
        text = text.strip()
        if "```" in text:
            parts = text.split("```")
            for part in parts[1:]:
                candidate = part.strip()
                if candidate.startswith("json"):
                    candidate = candidate[4:].strip()
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    continue
        return json.loads(text)
