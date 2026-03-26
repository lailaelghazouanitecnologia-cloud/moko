"""
Base actor protocol and registry.

All actors inherit from BaseActor and implement execute().
The ActorRegistry maps BlockType to the appropriate actor.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

from ..core.models import Block, BlockType


@dataclass
class ActorResult:
    """Result of an actor's execution."""
    content: str = ""
    tokens_used: int = 0
    files_changed: list[str] = field(default_factory=list)
    refs_used: list[str] = field(default_factory=list)
    test_results: dict = field(default_factory=dict)
    quality_score: float = 0.0
    validation_issues: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Convert to dict for backward compatibility with handler return format."""
        d = {
            "content": self.content,
            "tokens_used": self.tokens_used,
        }
        if self.files_changed:
            d["files_changed"] = self.files_changed
        if self.refs_used:
            d["refs_used"] = self.refs_used
        if self.test_results:
            d["test_results"] = self.test_results
        if self.quality_score:
            d["quality_score"] = self.quality_score
        if self.validation_issues:
            d["validation_issues"] = self.validation_issues
        return d


class BaseActor(ABC):
    """Base class for all execution actors."""

    name: str = "base"

    @abstractmethod
    def execute(self, block: Block, context: dict) -> ActorResult:
        """Execute the actor's responsibility for a block.

        Args:
            block: The block to execute
            context: Dict with keys like 'history', 'ref_context',
                     'registry', 'discussions'

        Returns:
            ActorResult with execution results
        """
        ...


class ActorRegistry:
    """Maps BlockType → Actor. Supervisor dispatches, never executes."""

    def __init__(self):
        self._actors: dict[BlockType, BaseActor] = {}

    def register(self, block_type: BlockType, actor: BaseActor):
        """Register an actor for a block type."""
        self._actors[block_type] = actor

    def get(self, block_type: BlockType) -> Optional[BaseActor]:
        """Get the actor for a block type."""
        return self._actors.get(block_type)

    def dispatch(self, block: Block, context: dict) -> ActorResult:
        """Dispatch a block to its registered actor."""
        actor = self._actors.get(block.block_type)
        if not actor:
            return ActorResult(content=f"No actor for {block.block_type.value}")
        return actor.execute(block, context)

    @property
    def registered_types(self) -> list[BlockType]:
        return list(self._actors.keys())
