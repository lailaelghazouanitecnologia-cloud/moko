"""
ModelDispatcher — gives the right LLM to each task.

Uses RuntimeConfig to map tasks → roles → models.
Caches LLMProvider instances to avoid re-creating clients.
Tracks token usage per role for cost analysis.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Optional

from .llm.providers import LLMProvider
from .runtime_config import RuntimeConfig, ModelRole, TASK_DELEGATION


@dataclass
class RoleUsage:
    """Token usage tracking per role."""
    calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0

    @property
    def avg_input(self) -> float:
        return self.input_tokens / max(self.calls, 1)

    @property
    def avg_output(self) -> float:
        return self.output_tokens / max(self.calls, 1)

    @property
    def output_ratio(self) -> float:
        """Output tokens as fraction of total. Lower = more efficient navigation."""
        return self.output_tokens / max(self.total_tokens, 1)


class ModelDispatcher:
    """Dispatches the right model for each task.

    Usage:
        config = RuntimeConfig.from_project(project_dir)
        dispatch = ModelDispatcher(config)

        # Get LLM for a specific task
        llm = dispatch.for_task("translate_type")
        llm = dispatch.for_task("goal_reasoning")
        llm = dispatch.for_task("rlm_sub_call")

        # Or by role directly
        root = dispatch.root
        worker = dispatch.worker
        micro = dispatch.micro
    """

    def __init__(self, config: Optional[RuntimeConfig] = None):
        self.config = config or RuntimeConfig()
        self._cache: Dict[str, LLMProvider] = {}
        self._usage: Dict[str, RoleUsage] = {r.value: RoleUsage() for r in ModelRole}

    def for_task(self, task: str) -> LLMProvider:
        """Get the right LLM for a task."""
        model = self.config.get_model_for_task(task)
        return self._get_or_create(model)

    def for_role(self, role: ModelRole) -> LLMProvider:
        """Get LLM by role."""
        model = self.config.get_model(role)
        return self._get_or_create(model)

    @property
    def root(self) -> LLMProvider:
        return self.for_role(ModelRole.ROOT)

    @property
    def worker(self) -> LLMProvider:
        return self.for_role(ModelRole.WORKER)

    @property
    def micro(self) -> LLMProvider:
        return self.for_role(ModelRole.MICRO)

    @property
    def reviewer(self) -> LLMProvider:
        return self.for_role(ModelRole.REVIEWER)

    @property
    def sub(self) -> LLMProvider:
        return self.for_role(ModelRole.SUB)

    def budget_for(self, task: str) -> int:
        """Get max output tokens for a task."""
        role = TASK_DELEGATION.get(task, ModelRole.WORKER)
        return self.config.get_budget(role)

    def track_usage(self, task: str, input_tok: int, output_tok: int):
        """Track token usage for a task."""
        role = TASK_DELEGATION.get(task, ModelRole.WORKER)
        usage = self._usage[role.value]
        usage.calls += 1
        usage.input_tokens += input_tok
        usage.output_tokens += output_tok
        usage.total_tokens += input_tok + output_tok

    def usage_report(self) -> str:
        """Report token usage per role."""
        lines = ["Token Usage by Role:"]
        total_in, total_out = 0, 0
        for role in ModelRole:
            u = self._usage[role.value]
            if u.calls == 0:
                continue
            model = self.config.get_model(role)
            lines.append(
                f"  {role.value:<10} {model:<45} "
                f"calls={u.calls:>3} in={u.input_tokens:>7,} out={u.output_tokens:>7,} "
                f"ratio={u.output_ratio:.0%}"
            )
            total_in += u.input_tokens
            total_out += u.output_tokens
        total = total_in + total_out
        if total > 0:
            lines.append(f"  {'TOTAL':<10} {'':45} "
                         f"      in={total_in:>7,} out={total_out:>7,} "
                         f"ratio={total_out/total:.0%}")
            # Cost estimate (rough: input=$0.15/M, output=$0.60/M for Groq)
            cost = (total_in * 0.15 + total_out * 0.60) / 1_000_000
            lines.append(f"  Estimated cost: ${cost:.4f}")
        return "\n".join(lines)

    def _get_or_create(self, model: str) -> LLMProvider:
        """Get cached LLMProvider or create new one."""
        if model not in self._cache:
            self._cache[model] = LLMProvider(
                provider=self.config.provider,
                model=model,
            )
        return self._cache[model]
