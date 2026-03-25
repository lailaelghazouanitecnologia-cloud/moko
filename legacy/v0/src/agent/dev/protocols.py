"""Protocol definitions (interfaces) for the dev pipeline.

These define the contracts between components, enabling:
- Swappable strategies (different decomposers, generators, fix engines)
- Mock-friendly testing
- Clear dependency boundaries
"""
from __future__ import annotations

from pathlib import Path
from typing import Protocol, List, Optional, Tuple, runtime_checkable


# ── LLM Protocols ────────────────────────────────────────

@runtime_checkable
class LLMProvider(Protocol):
    """Contract for any LLM provider."""
    def complete(self, messages: list, **kwargs) -> str: ...
    def complete_with_usage(self, messages: list, **kwargs) -> object: ...


# ── Decomposition Protocols ──────────────────────────────

@runtime_checkable
class Decomposer(Protocol):
    """Contract for splitting a goal into module tasks."""
    total_tokens: int

    def decompose(self, goal: str, target: str,
                  references: Optional[List[str]] = None,
                  **kwargs) -> list:
        """Return a list of ModuleTasks."""
        ...


# ── Code Generation Protocols ────────────────────────────

@runtime_checkable
class CodeGenerator(Protocol):
    """Contract for generating code from a blueprint."""
    def generate(self, blueprint: object, context: dict) -> str:
        """Generate source code from a type blueprint + context."""
        ...


@runtime_checkable
class BlueprintLoader(Protocol):
    """Contract for loading/creating blueprints for a module."""
    def load_or_generate(self, module_name: str, type_name: str,
                         task: object) -> object:
        """Return a TypeBlueprint."""
        ...


# ── Fix Protocols ────────────────────────────────────────

@runtime_checkable
class FixStrategy(Protocol):
    """Contract for fixing compilation errors."""
    def fix(self, code: str, errors: List[str],
            context: dict) -> Tuple[str, int]:
        """Return (fixed_code, tokens_used)."""
        ...


@runtime_checkable
class CompilationChecker(Protocol):
    """Contract for checking if code compiles."""
    def check(self, project_dir: Path) -> Tuple[List[object], bool, str]:
        """Return (errors, is_clean, raw_output)."""
        ...


# ── Reference Protocols ──────────────────────────────────

@runtime_checkable
class ReferenceRepository(Protocol):
    """Contract for accessing reference project data."""
    def get_workspace(self) -> dict: ...
    def get_module(self, module_id: str) -> dict: ...
    def get_types(self, module_id: str) -> List[str]: ...
    def get_descriptor(self, module_id: str, file_stem: str) -> Optional[dict]: ...


@runtime_checkable
class IntelligenceProvider(Protocol):
    """Contract for providing project intelligence."""
    def load(self, project: str) -> Optional[object]: ...
    def generate(self, project: str) -> object: ...


# ── Feature AST Protocols ────────────────────────────────

@runtime_checkable
class FeatureSelector(Protocol):
    """Contract for selecting features from an AST."""
    def select(self, ast: object, goal: str,
               interactive: bool = True) -> List[object]:
        """Return list of selected FeatureNodes."""
        ...


# ── Quality Protocols ────────────────────────────────────

@runtime_checkable
class QualityScorer(Protocol):
    """Contract for scoring generated code quality."""
    def score(self, project_dir: str, name: str) -> Tuple[float, str]:
        """Return (score 0-1, report text)."""
        ...
