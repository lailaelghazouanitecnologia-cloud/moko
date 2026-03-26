"""
Branch & Project — COMPATIBILITY SHIM. Real code lives in core.branch.

This file re-exports all branch types from their new home in core.branch
so existing imports continue to work during the migration.
"""
from ..core.branch import (
    Branch,
    Project,
    EvalConfig,
    EvalResult,
    load_eval_yaml,
)
from ..core.models import Plan, BranchType, BranchStatus

__all__ = [
    "Branch", "Project", "EvalConfig", "EvalResult", "load_eval_yaml",
    "Plan", "BranchType", "BranchStatus",
]
