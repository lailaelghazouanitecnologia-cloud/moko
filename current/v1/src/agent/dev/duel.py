"""
Duel — COMPATIBILITY SHIM during migration.

Re-exports from duel/runner.py. Will be removed in a future phase.
"""
from ..duel.runner import DuelRunner, DuelResult, DuelRound, DuelReport

__all__ = ["DuelRunner", "DuelResult", "DuelRound", "DuelReport"]
