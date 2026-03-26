"""
Context Engine — real-time project state for AVA actors.

The context engine maintains a live index of the generated project,
generates role-specific snapshots for each consumer, validates code
before writing, and persists state between runs.

Usage:
    engine = ContextEngine(project_dir / "src")
    engine.init()                                    # full scan
    engine.update("cpu/decoder.ts")                  # after a write
    snapshot = engine.snapshot.for_translator(...)    # get context
    result = engine.validator.validate(code, path)   # pre-write check
    engine.persist(project_dir)                      # save state
"""
from __future__ import annotations

from pathlib import Path

from .index import LiveIndex, FileState, Signature, TypeDef, ImportDef, Issue
from .snapshot import ContextBuilder
from .validator import PreWriteValidator, ValidationResult, ValidationIssue
from .invariants import InvariantStore, Rule
from .persistence import RunPersistence


class ContextEngine:
    """Facade for the context engine subsystem.

    Provides unified access to:
      - index: LiveIndex (real-time project state)
      - snapshot: ContextBuilder (role-specific snapshots)
      - validator: PreWriteValidator (pre-write validation)
      - invariants: InvariantStore (project rules)
      - persistence: RunPersistence (save/load between runs)
    """

    def __init__(self, src_dir: Path):
        self.src_dir = Path(src_dir)
        self.index = LiveIndex(self.src_dir)
        self.snapshot = ContextBuilder()
        self.invariants = InvariantStore()
        self.validator = PreWriteValidator(self.index, self.invariants)
        self.persistence = RunPersistence()
        self._initialized = False

    def init(self, project_dir: Path = None) -> None:
        """Initialize: full scan + load invariants if available."""
        self.index.scan_all()
        self._initialized = True

        if project_dir:
            self.persistence.load_invariants(project_dir, self.invariants)

    def update(self, rel_path: str) -> list[Issue]:
        """Update index after a file write. Returns any breaking issues."""
        return self.index.update(rel_path)

    def update_all(self) -> None:
        """Re-scan all files. Use after git merge or bulk operations."""
        self.index.scan_all()

    def validate(self, code: str, target_path: str) -> ValidationResult:
        """Validate code before writing to disk."""
        return self.validator.validate(code, target_path)

    def persist(self, project_dir: Path) -> None:
        """Save all state to disk."""
        self.persistence.save_index_snapshot(project_dir, self.index)
        self.persistence.save_invariants(project_dir, self.invariants)

    @property
    def is_initialized(self) -> bool:
        return self._initialized


__all__ = [
    "ContextEngine",
    "LiveIndex", "FileState", "Signature", "TypeDef", "ImportDef", "Issue",
    "ContextBuilder",
    "PreWriteValidator", "ValidationResult", "ValidationIssue",
    "InvariantStore", "Rule",
    "RunPersistence",
]
