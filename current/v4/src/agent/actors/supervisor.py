"""
DevSupervisor v2 — thin orchestrator that delegates to actors and XVM.

This is the v2 supervisor that replaces the 1705-LOC god object.
It keeps run(), resume(), _finalize(), _adjust_plan() and delegates:
  - Planning → PlannerActor
  - Analysis → AnalyzeActor (via original handler during migration)
  - Implementation → TranslateActor (via original handler during migration)
  - Discussion → DiscussantActor
  - Abstraction → AbstractorActor
  - Scheduling → BlockScheduler
  - Execution → BlockExecutor

During migration, this module re-exports DevSupervisor from dev/supervisor.py
with the new actor infrastructure available for gradual adoption.
"""
from __future__ import annotations

# During migration, the original supervisor is still the entry point.
# This module provides the new actor-based infrastructure alongside it.
from ..dev.supervisor import DevSupervisor

from .base import ActorRegistry, BaseActor, ActorResult
from .planner import PlannerActor
from .discussant import DiscussantActor
from .abstractor import AbstractorActor
from .proposer import ProposerActor

__all__ = [
    "DevSupervisor",
    "ActorRegistry", "BaseActor", "ActorResult",
    "PlannerActor", "DiscussantActor", "AbstractorActor", "ProposerActor",
]
