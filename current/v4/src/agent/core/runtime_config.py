"""
AVA Runtime Configuration — models, strategies, and delegation.

Defines which model does what, how strategies are selected, and
how work is delegated between root and worker models.

The principle: right model for the right job.
  - Root (big, smart): planning, orchestration, complex decisions
  - Worker (fast, cheap): code generation, fixes, patches
  - Micro (tiny, instant): classification, routing, validation
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore


class ModelRole(str, Enum):
    """What role a model plays in the pipeline."""
    ROOT = "root"             # Orchestrator: planning, reasoning, decisions
    WORKER = "worker"         # Code generation: translate, fix, enhance
    MICRO = "micro"           # Quick tasks: classify, route, validate
    REVIEWER = "reviewer"     # Quality review: analyze, propose
    SUB = "sub"               # RLM sub-worker: process chunks


# Default model assignments per provider
DEFAULT_MODELS = {
    "groq": {
        ModelRole.ROOT: "moonshotai/kimi-k2-instruct-0905",    # 262K ctx, 16K out
        ModelRole.WORKER: "moonshotai/kimi-k2-instruct-0905",  # Same — fast on Groq
        ModelRole.MICRO: "llama-3.1-8b-instant",               # 131K ctx, instant
        ModelRole.REVIEWER: "moonshotai/kimi-k2-instruct-0905",
        ModelRole.SUB: "llama-3.1-8b-instant",                 # 131K out — for RLM
    },
    "anthropic": {
        ModelRole.ROOT: "claude-sonnet-4-20250514",
        ModelRole.WORKER: "claude-sonnet-4-20250514",
        ModelRole.MICRO: "claude-haiku-4-5-20251001",
        ModelRole.REVIEWER: "claude-sonnet-4-20250514",
        ModelRole.SUB: "claude-haiku-4-5-20251001",
    },
    "openai": {
        ModelRole.ROOT: "gpt-4o",
        ModelRole.WORKER: "gpt-4o",
        ModelRole.MICRO: "gpt-4o-mini",
        ModelRole.REVIEWER: "gpt-4o",
        ModelRole.SUB: "gpt-4o-mini",
    },
}

# Task → which model role handles it
TASK_DELEGATION = {
    # Planning & reasoning (Root — needs intelligence)
    "goal_reasoning": ModelRole.ROOT,
    "decompose": ModelRole.ROOT,
    "plan_review": ModelRole.ROOT,
    "experiment_combine": ModelRole.ROOT,

    # Code generation (Worker — needs output capacity)
    "translate_type": ModelRole.WORKER,
    "generate_blueprint": ModelRole.WORKER,
    "depth_loop_expand": ModelRole.WORKER,
    "enhance_type": ModelRole.WORKER,

    # Fixes (Worker — needs to understand code)
    "fix_tsc_error": ModelRole.WORKER,
    "quality_improve": ModelRole.WORKER,

    # Quick tasks (Micro — needs speed, not depth)
    "classify_task": ModelRole.MICRO,
    "select_strategy": ModelRole.MICRO,
    "validate_imports": ModelRole.MICRO,
    "detect_issues": ModelRole.MICRO,

    # Review (Reviewer — needs judgment)
    "module_review": ModelRole.REVIEWER,
    "quality_review": ModelRole.REVIEWER,
    "security_review": ModelRole.REVIEWER,

    # RLM sub-processing (Sub — needs high output, fast)
    "rlm_sub_call": ModelRole.SUB,
    "rlm_chunk_process": ModelRole.SUB,

    # Pre-training (Micro — cheap, many calls)
    "pretrain_generate": ModelRole.MICRO,
}

# Strategy selection thresholds
STRATEGY_THRESHOLDS = {
    "skeleton_fill_min_methods": 10,
    "rlm_min_methods": 20,
    "compaction_min_history": 20,
    "experiment_min_dependents": 2,
    "depth_loop_min_target_loc": 100,
}


@dataclass
class RuntimeConfig:
    """Complete runtime configuration for AVA.

    Load from .ava/config.yaml or use defaults.
    """
    # Provider
    provider: str = "groq"

    # Model assignments per role
    models: Dict[str, str] = field(default_factory=dict)

    # Strategy thresholds
    strategy: Dict[str, int] = field(default_factory=dict)

    # Task delegation overrides
    delegation: Dict[str, str] = field(default_factory=dict)

    # Token budgets per role
    budgets: Dict[str, int] = field(default_factory=lambda: {
        "root_max_output": 4000,       # Root: short, smart decisions
        "worker_max_output": 12000,    # Worker: code generation
        "micro_max_output": 2000,      # Micro: classification, routing
        "reviewer_max_output": 1000,   # Reviewer: analysis, proposals
        "sub_max_output": 8000,        # Sub: RLM chunks
    })

    # Guardrails
    max_tokens_per_run: int = 500_000
    max_iterations: int = 50
    max_parallel_agents: int = 3

    # Features toggles
    use_goal_reasoner: bool = True
    use_depth_loop: bool = True
    use_strategy_selector: bool = True
    use_knowledge_injection: bool = True
    use_module_reviewer: bool = True
    use_workspace_model: bool = True

    def get_model(self, role) -> str:
        """Get model for a role. Accepts ModelRole enum or string."""
        if isinstance(role, str):
            try:
                role = ModelRole(role)
            except ValueError:
                return self.models.get(role, "")

        # Check explicit override
        override = self.models.get(role.value)
        if override:
            return override

        # Provider defaults
        defaults = DEFAULT_MODELS.get(self.provider, {})
        return defaults.get(role, defaults.get(ModelRole.WORKER, ""))

    def get_model_for_task(self, task: str) -> str:
        """Get the right model for a specific task."""
        # Check task delegation override
        role_name = self.delegation.get(task)
        if role_name:
            try:
                role = ModelRole(role_name)
                return self.get_model(role)
            except ValueError:
                pass

        # Default delegation
        role = TASK_DELEGATION.get(task, ModelRole.WORKER)
        return self.get_model(role)

    def get_budget(self, role: ModelRole) -> int:
        """Get max output tokens for a role."""
        key = f"{role.value}_max_output"
        return self.budgets.get(key, 8000)

    def get_threshold(self, name: str) -> int:
        """Get a strategy threshold."""
        return self.strategy.get(name, STRATEGY_THRESHOLDS.get(name, 0))

    # ── Persistence ──────────────────────────────────────

    def save(self, path: Path):
        """Save config to YAML."""
        data = {
            "provider": self.provider,
            "models": self.models,
            "strategy": self.strategy,
            "delegation": self.delegation,
            "budgets": self.budgets,
            "max_tokens_per_run": self.max_tokens_per_run,
            "max_iterations": self.max_iterations,
            "features": {
                "goal_reasoner": self.use_goal_reasoner,
                "depth_loop": self.use_depth_loop,
                "strategy_selector": self.use_strategy_selector,
                "knowledge_injection": self.use_knowledge_injection,
                "module_reviewer": self.use_module_reviewer,
                "workspace_model": self.use_workspace_model,
            },
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        if yaml:
            path.write_text(yaml.dump(data, default_flow_style=False))
        else:
            import json
            path.write_text(json.dumps(data, indent=2))

    @classmethod
    def load(cls, path: Path) -> "RuntimeConfig":
        """Load config from YAML. Falls back to defaults."""
        if not path.exists():
            return cls()
        try:
            if yaml:
                data = yaml.safe_load(path.read_text())
            else:
                import json
                data = json.loads(path.read_text())
        except Exception:
            return cls()

        if not isinstance(data, dict):
            return cls()

        config = cls(
            provider=data.get("provider", "groq"),
            models=data.get("models", {}),
            strategy=data.get("strategy", {}),
            delegation=data.get("delegation", {}),
            budgets=data.get("budgets", {}),
            max_tokens_per_run=data.get("max_tokens_per_run", 500_000),
            max_iterations=data.get("max_iterations", 50),
        )

        features = data.get("features", {})
        config.use_goal_reasoner = features.get("goal_reasoner", True)
        config.use_depth_loop = features.get("depth_loop", True)
        config.use_strategy_selector = features.get("strategy_selector", True)
        config.use_knowledge_injection = features.get("knowledge_injection", True)
        config.use_module_reviewer = features.get("module_reviewer", True)
        config.use_workspace_model = features.get("workspace_model", True)

        return config

    @classmethod
    def from_project(cls, project_dir: Path) -> "RuntimeConfig":
        """Load from project's .ava/config.yaml, then global ~/.ava/config.yaml."""
        # Project-level config
        project_config = project_dir / ".ava" / "config.yaml"
        if project_config.exists():
            return cls.load(project_config)

        # Global config
        global_config = Path.home() / ".ava" / "config.yaml"
        if global_config.exists():
            return cls.load(global_config)

        return cls()

    def summary(self) -> str:
        """Human-readable summary."""
        lines = [
            f"Provider: {self.provider}",
            f"Models:",
        ]
        for role in ModelRole:
            model = self.get_model(role)
            budget = self.get_budget(role)
            lines.append(f"  {role.value:<10} → {model} (max {budget} out)")
        lines.append(f"Budget: {self.max_tokens_per_run:,} tokens/run")
        features = []
        if self.use_goal_reasoner: features.append("GoalReasoner")
        if self.use_depth_loop: features.append("DepthLoop")
        if self.use_strategy_selector: features.append("Strategies")
        if self.use_knowledge_injection: features.append("Knowledge")
        if self.use_module_reviewer: features.append("Reviewer")
        if self.use_workspace_model: features.append("Workspace")
        lines.append(f"Features: {', '.join(features)}")
        return "\n".join(lines)
