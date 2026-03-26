"""
Captain — executes one Plan with Blocks.

Has the full Plan view. Decides: which block next, discuss or skip,
abstract after completion, adjust plan if needed. Maintains hash chain.

The Captain thinks strategically — delegates execution to the Lieutenant.
"""
from __future__ import annotations

# Re-export from current location during migration
from ..dev.supervisor import DevSupervisor as Captain

__all__ = ["Captain"]
