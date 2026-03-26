"""
XVM — block execution microVM.

Provides isolated per-block execution with memory, context budget,
state management, scheduling, and context assembly.
"""
from .vm import BlockVM, ContextBudget
from .executor import BlockExecutor
from .context import ContextLoader
from .scheduler import BlockScheduler
