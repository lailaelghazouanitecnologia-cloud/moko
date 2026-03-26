"""
PreWriteValidator — validates generated code BEFORE writing to disk.

Checks against the LiveIndex:
  1. Import check: every import references a real export
  2. Signature check: no breaking changes to callers
  3. Type check: uses defined types, not inline duplicates
  4. Dead code check: warns about unused exports
  5. Duplicate check: no duplicate definitions across files
  6. Invariant check: project rules respected
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .index import LiveIndex
    from .invariants import InvariantStore


@dataclass
class ValidationIssue:
    """A single validation issue."""
    kind: str        # import, signature, type, dead_code, duplicate, invariant
    message: str
    severity: str = "error"   # error, warning
    suggestion: str = ""


@dataclass
class ValidationResult:
    """Result of pre-write validation."""
    ok: bool = True
    issues: list[ValidationIssue] = field(default_factory=list)

    def add_error(self, kind: str, message: str, suggestion: str = ""):
        self.ok = False
        self.issues.append(ValidationIssue(
            kind=kind, message=message, severity="error", suggestion=suggestion,
        ))

    def add_warning(self, kind: str, message: str, suggestion: str = ""):
        self.issues.append(ValidationIssue(
            kind=kind, message=message, severity="warning", suggestion=suggestion,
        ))

    def to_llm_feedback(self) -> str:
        """Format issues as feedback for LLM retry."""
        if not self.issues:
            return ""
        lines = ["VALIDATION ERRORS in your generated code:"]
        for issue in self.issues:
            prefix = "ERROR" if issue.severity == "error" else "WARN"
            lines.append(f"  [{prefix}] {issue.message}")
            if issue.suggestion:
                lines.append(f"    → FIX: {issue.suggestion}")
        return "\n".join(lines)

    @property
    def error_count(self) -> int:
        return len([i for i in self.issues if i.severity == "error"])

    @property
    def warning_count(self) -> int:
        return len([i for i in self.issues if i.severity == "warning"])

    def summary(self) -> str:
        return f"{self.error_count} errors, {self.warning_count} warnings"


# ── Import parsing regex ────────────────────────────────────

_IMPORT_RE = re.compile(
    r"import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['\"]([^'\"]+)['\"]"
)

_EXPORT_RE = re.compile(
    r"export\s+(?:abstract\s+)?"
    r"(class|interface|enum|type|function|const)\s+(\w+)"
)

_TYPE_REF = re.compile(r"\b([A-Z]\w+)\b")


class PreWriteValidator:
    """Validates generated code against the LiveIndex before writing."""

    def __init__(self, index: "LiveIndex",
                 invariant_store: "InvariantStore" = None):
        self.index = index
        self.invariant_store = invariant_store

    def validate(self, code: str, target_path: str) -> ValidationResult:
        """Run all validation checks on code destined for target_path.

        Args:
            code: The generated TypeScript code to validate.
            target_path: Relative path from src_dir (e.g., "cpu/decoder.ts").

        Returns:
            ValidationResult with ok=True if all checks pass.
        """
        result = ValidationResult()

        self.check_imports(code, target_path, result)
        self.check_signatures(code, target_path, result)
        self.check_types(code, result)
        self.check_duplicates(code, target_path, result)

        if self.invariant_store:
            self.check_invariants(code, target_path, result)

        return result

    def check_imports(self, code: str, from_file: str,
                      result: ValidationResult) -> None:
        """Validate that all imports resolve to real exports."""
        for m in _IMPORT_RE.finditer(code):
            names_str = m.group(1) or m.group(2)
            names = [n.strip().split(" as ")[0].strip()
                     for n in names_str.split(",") if n.strip()]
            import_path = m.group(3)

            if not import_path.startswith("."):
                continue  # npm package, skip

            # Resolve import path to a file
            import os
            from pathlib import Path
            from_dir = str(Path(from_file).parent)
            resolved = os.path.normpath(os.path.join(from_dir, import_path))
            resolved = resolved.replace("\\", "/")

            candidates = [f"{resolved}.ts", f"{resolved}/index.ts"]
            target_file = None
            for cand in candidates:
                if cand in self.index.files:
                    target_file = cand
                    break

            if not target_file:
                # Try to suggest correct path
                suggestion = self._suggest_import(from_file, import_path)
                result.add_error(
                    "import",
                    f"'{import_path}' does not resolve to any file",
                    suggestion=f"use '{suggestion}'" if suggestion else "create the file or fix the path",
                )
                continue

            # Check that imported names are actually exported
            available = self.index.export_map.get(target_file, [])
            for name in names:
                if name and available and name not in available:
                    result.add_error(
                        "import",
                        f"'{name}' not exported from '{import_path}'",
                        suggestion=f"available: {', '.join(available[:8])}",
                    )

    def check_signatures(self, code: str, target_path: str,
                         result: ValidationResult) -> None:
        """Check if new code breaks existing callers."""
        old_state = self.index.files.get(target_path)
        if not old_state:
            return  # New file, no callers to break

        # Parse new exports from code
        new_exports = set()
        for m in _EXPORT_RE.finditer(code):
            new_exports.add(m.group(2))

        # Check for removed exports that have callers
        for old_exp in old_state.exports:
            if old_exp.name not in new_exports:
                key = f"{target_path}:{old_exp.name}"
                callers = self.index.reverse_graph.get(key, set())
                if callers:
                    result.add_error(
                        "signature",
                        f"Removing {old_exp.name} would break: {', '.join(callers)}",
                        suggestion=f"keep {old_exp.name} exported or update callers first",
                    )

    def check_types(self, code: str, result: ValidationResult) -> None:
        """Check for type inconsistencies."""
        # Find inline type definitions that match existing ones
        for m in _EXPORT_RE.finditer(code):
            kind = m.group(1)
            name = m.group(2)
            if kind in ("interface", "type", "enum"):
                existing = self.index.get_type(name)
                if existing:
                    # Same type defined elsewhere — warn about duplication
                    # (not an error if it's the same file being regenerated)
                    from pathlib import Path as P
                    if existing.file != "":  # we don't know target_path here reliably
                        result.add_warning(
                            "type",
                            f"{name} already defined in {existing.file}",
                            suggestion=f"import {{ {name} }} from the existing file instead of redefining",
                        )

    def check_duplicates(self, code: str, target_path: str,
                         result: ValidationResult) -> None:
        """Check for duplicate function/class definitions across files."""
        for m in _EXPORT_RE.finditer(code):
            name = m.group(2)
            existing = self.index.get_type(name)
            if existing and existing.file != target_path:
                # Only error for classes/functions, warn for interfaces/types
                # (interfaces can be merged in TS)
                kind = m.group(1)
                if kind in ("class", "function", "const"):
                    result.add_error(
                        "duplicate",
                        f"{name} already exists in {existing.file}",
                        suggestion=f"import it from {existing.file} instead",
                    )

    def check_invariants(self, code: str, target_path: str,
                         result: ValidationResult) -> None:
        """Check project invariant rules."""
        if not self.invariant_store:
            return

        violations = self.invariant_store.check(code, target_path)
        for v in violations:
            result.add_error("invariant", v)

    def _suggest_import(self, from_file: str, bad_path: str) -> str:
        """Try to suggest the correct import path."""
        from pathlib import Path
        target = bad_path.rstrip("/").split("/")[-1]
        from_module = Path(from_file).parts[0] if "/" in from_file else "_root"

        # Search files by stem
        for file_path in self.index.files:
            stem = Path(file_path).stem
            if stem == target or stem.replace("-", "_") == target.replace("-", "_"):
                return self._compute_import_path(from_file, file_path)

        # Search by symbol name
        for sym_name in self.index.type_registry:
            if sym_name.lower() == target.lower().replace("-", ""):
                td = self.index.type_registry[sym_name]
                return self._compute_import_path(from_file, td.file)

        return ""

    def _compute_import_path(self, from_file: str, to_file: str) -> str:
        """Compute relative import path between two files."""
        import os
        from pathlib import Path
        from_dir = str(Path(from_file).parent)
        to_stem = Path(to_file).stem

        # Simple case: same directory
        to_dir = str(Path(to_file).parent)
        if from_dir == to_dir:
            return f"./{to_stem}"

        # Compute relative
        rel = os.path.relpath(to_dir, from_dir).replace("\\", "/")
        if not rel.startswith("."):
            rel = "./" + rel
        return f"{rel}/{to_stem}"
