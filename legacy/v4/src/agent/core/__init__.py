"""
Core — shared infrastructure for the Ava development agent.

Contains data models, guardrails, branch management, LLM abstraction,
and configuration. Imported by actors, engines, tools, and workflows.
"""

from .models import (
    FieldSpec, MethodSpec, TypeBlueprint, ModuleBlueprint,
    Plan, Block, BlockType, BlockStatus, BranchType, BranchStatus,
    Stance, Discussion, DiscussionPoint, RegisteredInsight,
    AbstractionResult, FeatureDecision,
)
from .guardrails import RunGuard, RunLimits, GuardrailTripped
from .branch import Branch, Project, EvalConfig, EvalResult, load_eval_yaml
from .config import AvaConfig
