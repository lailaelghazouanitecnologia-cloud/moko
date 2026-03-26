"""
Base Agent — ABC for all specialized agents.

Every agent receives an AgentContext from the Supervisor and returns an AgentResult.
Inspired by Cline's Task class pattern: receive context → select prompt → call LLM → return.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..llm.providers import LLMProvider, LLMUsage
    from ..vectorstore.search import VectorStore
    from ..prompts.registry import PromptRegistry
    from ..session.state import SessionState


@dataclass
class AgentContext:
    """Context passed to every agent by the Supervisor."""
    query: str
    projects: list[str]
    descriptors_dir: Path
    registry: dict                          # projects.json content
    vector_store: "VectorStore | None"
    llm: "LLMProvider"
    prompt_registry: "PromptRegistry"
    session: "SessionState"
    search_context: str = ""                # injected by SearchAgent pre-pass
    max_tokens: int = 12000


@dataclass
class AgentResult:
    """Standardized result from any sub-agent."""
    agent_name: str
    content: str
    sources: list[str] = field(default_factory=list)    # descriptor paths used
    usage: "LLMUsage | None" = None
    prompt_id: str = ""                                 # which prompt was selected
    metadata: dict = field(default_factory=dict)


class BaseAgent(ABC):
    """Every specialized agent inherits this."""

    name: str = "base"
    description: str = ""
    capabilities: list[str] = []

    @abstractmethod
    def run(self, ctx: AgentContext) -> AgentResult:
        """Execute this agent's task. Must return AgentResult."""
        ...

    def can_handle(self, query: str) -> float:
        """Return confidence 0.0-1.0 that this agent handles the query.

        Default: check if any capability keyword is in the query.
        """
        query_lower = query.lower()
        matches = sum(1 for cap in self.capabilities if cap in query_lower)
        if not self.capabilities:
            return 0.0
        return min(1.0, matches / max(len(self.capabilities), 1) * 2)
