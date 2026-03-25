"""
Duel — A/B comparison and evaluation tools.

duel/
  runner.py      — DuelRunner: type-level Ava vs Claude comparison
  project.py     — ProjectDuel: full project-level duel
  features.py    — FeatureAnalyzer: discover & discuss reference features
  evaluation.py  — Evaluation benchmarking functions
"""
from .runner import DuelRunner, DuelResult, DuelRound, DuelReport
from .project import ProjectDuel, ProjectDuelReport, AgentResult
from .features import FeatureAnalyzer, Feature, FeatureDiscussion, FeaturesReport
from .evaluation import (
    create_eval_plan, setup_eval_workspace, modify_blueprint_for_eval,
    benchmark_type, format_eval_report,
)

__all__ = [
    "DuelRunner", "DuelResult", "DuelRound", "DuelReport",
    "ProjectDuel", "ProjectDuelReport", "AgentResult",
    "FeatureAnalyzer", "Feature", "FeatureDiscussion", "FeaturesReport",
    "create_eval_plan", "setup_eval_workspace", "modify_blueprint_for_eval",
    "benchmark_type", "format_eval_report",
]
