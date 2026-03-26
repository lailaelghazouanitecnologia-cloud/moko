"""BlockVM — COMPATIBILITY SHIM. Real code lives in xvm.vm."""
from ..xvm.vm import BlockVM, ContextBudget

__all__ = ["BlockVM", "ContextBudget"]
