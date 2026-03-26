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
    fast_mode: bool = False                 # /fast: token-optimized mode


@dataclass
class CompactHandoff:
    """Compressed inter-agent handoff for /fast mode.

    Instead of passing raw text between agents, pass structured
    summaries to save 60-80% of inter-agent tokens.
    """
    files: list[str] = field(default_factory=list)
    types: list[str] = field(default_factory=list)
    functions: list[str] = field(default_factory=list)
    key_findings: list[str] = field(default_factory=list)
    total_lines: int = 0
    total_sources: int = 0

    def to_context(self) -> str:
        """Convert to a compact string for LLM context injection."""
        parts = []
        if self.files:
            parts.append(f"Files: {', '.join(self.files[:10])}")
        if self.types:
            parts.append(f"Types: {', '.join(self.types[:15])}")
        if self.functions:
            parts.append(f"Functions: {', '.join(self.functions[:15])}")
        if self.key_findings:
            parts.append("Findings: " + "; ".join(self.key_findings[:5]))
        if self.total_lines:
            parts.append(f"Scope: {self.total_lines} LOC across {self.total_sources} files")
        return "\n".join(parts)

    @classmethod
    def from_search_result(cls, content: str, sources: list[str]) -> "CompactHandoff":
        """Extract structured summary from SearchAgent output."""
        import re
        types = re.findall(r'\b(?:class|interface|enum|type)\s+(\w+)', content)
        functions = re.findall(r'\b(?:function|def|async)\s+(\w+)', content)
        return cls(
            files=sources[:10],
            types=types[:15],
            functions=functions[:15],
            total_sources=len(sources),
        )


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
