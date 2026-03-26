"""
AgentWorker — executes a task as a sub-agent with its own context.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class AgentConfig:
    """Configuration for a sub-agent."""
    role: str
    model: str = ""
    max_tokens: int = 50000
    max_iterations: int = 10
    instructions: str = ""
    project_dir: Optional[Path] = None


@dataclass
class AgentResult:
    """Result from a sub-agent execution."""
    role: str
    success: bool
    output: str = ""
    files_changed: List[str] = field(default_factory=list)
    tokens_used: int = 0
    errors: List[str] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)


class AgentWorker:
    """Executes a task as a sub-agent.

    Each worker gets its own context but shares the project directory.
    """

    def __init__(self, config: AgentConfig, verbose: bool = False):
        self.config = config
        self.verbose = verbose

    def execute(self, task_fn, *args, **kwargs) -> AgentResult:
        """Execute a task function and return result."""
        try:
            result = task_fn(*args, **kwargs)
            if isinstance(result, AgentResult):
                return result
            return AgentResult(
                role=self.config.role,
                success=True,
                output=str(result) if result else "",
            )
        except Exception as e:
            return AgentResult(
                role=self.config.role,
                success=False,
                errors=[str(e)],
            )
