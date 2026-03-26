"""Base class for all generation strategies."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class StrategyResult:
    """Result from executing a strategy."""
    code: str
    success: bool
    tokens_used: int = 0
    calls_made: int = 0
    strategy_name: str = ""
    files_written: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


class GenerationStrategy(ABC):
    """Base class for code generation strategies."""

    name: str = "base"

    @abstractmethod
    def execute(self, context: dict) -> StrategyResult:
        """Execute the strategy.

        Context dict contains:
          - blueprint_yaml: str
          - spec_context: str
          - import_map: str
          - sibling_context: str
          - cross_module_context: str
          - type_name: str
          - module_name: str
          - target_file: str
          - llm: LLMProvider (root)
          - sub_llm: Optional[LLMProvider] (for RLM)
          - project_dir: Path
        """
        ...
