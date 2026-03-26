"""
Compact engine — intelligent context management during generation.

Auto-compacts when approaching token budget. Preserves critical context
(first blueprint, latest fix) while summarizing completed work.
"""
from .budget import ContextBudget
from .compactor import ContextCompactor

__all__ = ["ContextBudget", "ContextCompactor"]
