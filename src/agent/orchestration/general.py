"""
General — coordinates multiple Captains across branches.

Sits above Captain. Launches main branch first, then evaluation/experiment
branches in parallel. Compares results. Picks winners.

The General never generates code — it coordinates and decides.
"""
from __future__ import annotations

# Re-export from current location during migration
from ..dev.manager import DevManager as General

__all__ = ["General"]
