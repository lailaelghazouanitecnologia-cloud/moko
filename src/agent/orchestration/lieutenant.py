"""
Lieutenant — executes one module in one git branch.

Specialist: generate → fix → review → quality → merge.
Doesn't see the full plan — only its module assignment.
Uses strategies, depth loops, and all v3+ engines.
"""
from __future__ import annotations

# Re-export from current location during migration
from ..dev.branch_pipeline import BranchPipelineOrchestrator as Lieutenant

__all__ = ["Lieutenant"]
