"""
Evaluation — COMPATIBILITY SHIM during migration.

Re-exports from duel/evaluation.py. Will be removed in a future phase.
"""
from ..duel.evaluation import (
    create_eval_plan, setup_eval_workspace, modify_blueprint_for_eval,
    benchmark_type, format_eval_report, _check_tsc, _count_methods,
)

__all__ = [
    "create_eval_plan", "setup_eval_workspace", "modify_blueprint_for_eval",
    "benchmark_type", "format_eval_report", "_check_tsc", "_count_methods",
]
