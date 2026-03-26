"""
Context strategies — choose the right approach per task.

Strategies:
  big_context    — 1 call, everything fits (default for small types)
  compaction     — resume history + continue (fix loops, long sessions)
  skeleton_fill  — structure first, logic second (complex types)
  rlm            — root LLM orchestrates, sub LLM processes chunks
  navigate       — tool-based navigation (repo analysis)

The selector auto-picks based on input size, output estimate, and task type.
"""
from .selector import StrategySelector, StrategyChoice
from .base import GenerationStrategy, StrategyResult

__all__ = ["StrategySelector", "StrategyChoice", "GenerationStrategy", "StrategyResult"]
