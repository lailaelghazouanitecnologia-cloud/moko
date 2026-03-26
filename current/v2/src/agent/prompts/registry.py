"""
Prompt Registry — metadata-based prompt selection.

Inspired by Cline's PromptRegistry + PromptVariants system.
Each prompt has metadata (task_types, tags, priority, is_hardcoded).
Selection algorithm:
1. Filter by task_type match
2. Filter by agent match (if specified)
3. Hardcoded prompts always win
4. Score dynamic prompts by tag overlap + priority
5. Return highest-scoring prompt
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class PromptMetadata:
    """Metadata for automatic prompt selection."""
    id: str
    version: int
    task_types: list[str]
    tags: list[str] = field(default_factory=list)
    priority: int = 0
    required_context: list[str] = field(default_factory=list)
    agent: Optional[str] = None
    is_hardcoded: bool = False
    description: str = ""


@dataclass
class Prompt:
    """A prompt template with metadata."""
    metadata: PromptMetadata
    system_template: str
    user_template: Optional[str] = None

    def render(self, **kwargs) -> str:
        """Render template with variable substitution."""
        result = self.system_template
        for key, value in kwargs.items():
            result = result.replace(f"{{{key}}}", str(value))
        return result

    def render_user(self, **kwargs) -> str:
        """Render user template if present."""
        if not self.user_template:
            return ""
        result = self.user_template
        for key, value in kwargs.items():
            result = result.replace(f"{{{key}}}", str(value))
        return result


class PromptRegistry:
    """Registry with metadata-based prompt selection."""

    def __init__(self):
        self._prompts: dict[str, Prompt] = {}
        self._load_builtins()

    def _load_builtins(self):
        """Register all built-in prompts from templates.py."""
        from .templates import BUILTIN_PROMPTS
        for prompt in BUILTIN_PROMPTS:
            self._prompts[prompt.metadata.id] = prompt

    def register(self, prompt: Prompt):
        """Register a custom prompt."""
        self._prompts[prompt.metadata.id] = prompt

    def get(self, prompt_id: str) -> Optional[Prompt]:
        """Get a prompt by ID."""
        return self._prompts.get(prompt_id)

    def get_base_system(self) -> str:
        """Get the base system prompt text."""
        base = self._prompts.get("system_roska_base")
        return base.system_template if base else ""

    def select(self, task_type: str, agent: str = None,
               tags: list[str] = None) -> Prompt:
        """Select the best prompt for a given task type + constraints.

        Selection logic:
        1. Filter by task_type match
        2. Filter by agent match (if specified)
        3. Hardcoded prompts for this task_type always win
        4. Among dynamic prompts, score by tag overlap + priority
        5. Return highest-scoring prompt
        """
        candidates = []

        for prompt in self._prompts.values():
            # Must match task_type (or be wildcard)
            if (task_type not in prompt.metadata.task_types
                    and "*" not in prompt.metadata.task_types):
                continue

            # Agent filter
            if agent and prompt.metadata.agent and prompt.metadata.agent != agent:
                continue

            # Skip the base system prompt — it's used separately
            if prompt.metadata.id == "system_roska_base":
                continue

            # Hardcoded wins immediately
            if prompt.metadata.is_hardcoded and task_type in prompt.metadata.task_types:
                return prompt

            # Score by tag overlap + priority
            score = prompt.metadata.priority
            if tags:
                overlap = len(set(tags) & set(prompt.metadata.tags))
                score += overlap * 10
            candidates.append((score, prompt))

        if not candidates:
            fallback = self._prompts.get("fallback_general")
            if fallback:
                return fallback
            # Ultimate fallback
            return Prompt(
                metadata=PromptMetadata(
                    id="_fallback", version=1, task_types=["*"], tags=[],
                ),
                system_template=self.get_base_system(),
            )

        candidates.sort(key=lambda x: -x[0])
        return candidates[0][1]

    def list_all(self) -> list[PromptMetadata]:
        """List all registered prompt metadata."""
        return [p.metadata for p in self._prompts.values()]

    def list_for_task(self, task_type: str) -> list[PromptMetadata]:
        """List prompts matching a task type."""
        return [
            p.metadata for p in self._prompts.values()
            if task_type in p.metadata.task_types or "*" in p.metadata.task_types
        ]
