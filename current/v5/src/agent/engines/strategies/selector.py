"""
StrategySelector — auto-picks the right strategy per task.

Decision based on: input size, estimated output, task type, model capabilities.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class StrategyChoice(str, Enum):
    BIG_CONTEXT = "big_context"
    COMPACTION = "compaction"
    SKELETON_FILL = "skeleton_fill"
    RLM = "rlm"
    NAVIGATE = "navigate"


@dataclass
class TaskProfile:
    """Profile of the current task for strategy selection."""
    task_type: str = "translate"       # translate | fix | analyze | blueprint
    input_tokens: int = 0              # estimated input size
    output_tokens_estimate: int = 0    # estimated output size
    method_count: int = 0              # methods in blueprint
    complexity: str = "medium"         # simple | medium | complex
    history_length: int = 0            # conversation/session history entries
    context_window: int = 131072       # model context window
    max_output: int = 16384            # model max output
    has_sub_llm: bool = False          # sub LLM available for RLM


class StrategySelector:
    """Select the best context strategy for a task."""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose

    def select(self, profile: TaskProfile) -> StrategyChoice:
        """Select strategy based on task profile."""
        choice = self._decide(profile)

        if self.verbose:
            print(f"  [strategy] {choice.value} "
                  f"(input={profile.input_tokens}, "
                  f"output_est={profile.output_tokens_estimate}, "
                  f"methods={profile.method_count}, "
                  f"complexity={profile.complexity})")

        return choice

    def _decide(self, p: TaskProfile) -> StrategyChoice:
        """Core decision logic."""

        # Fix tasks with long history → compaction
        if p.task_type == "fix" and p.history_length > 20:
            return StrategyChoice.COMPACTION

        # Analysis of large repos → navigate
        if p.task_type == "analyze" and p.input_tokens > p.context_window:
            return StrategyChoice.NAVIGATE

        # Complex type with many methods → check BEFORE big_context
        # (even if input fits, output may be too large for 1 call)
        if p.task_type == "translate" and p.method_count > 10:
            # If we have a sub LLM and it's really complex, use RLM
            if p.has_sub_llm and p.method_count > 20:
                return StrategyChoice.RLM
            return StrategyChoice.SKELETON_FILL

        # Everything fits in 1 call → big context
        input_fits = p.input_tokens < p.context_window * 0.5
        output_fits = p.output_tokens_estimate < p.max_output * 0.5
        if input_fits and output_fits:
            return StrategyChoice.BIG_CONTEXT

        # Output too large for 1 call → skeleton+fill
        if p.output_tokens_estimate > p.max_output * 0.7:
            return StrategyChoice.SKELETON_FILL

        # Input too large → RLM if sub available, else compaction
        if p.input_tokens > p.context_window * 0.7:
            if p.has_sub_llm:
                return StrategyChoice.RLM
            return StrategyChoice.COMPACTION

        return StrategyChoice.BIG_CONTEXT
