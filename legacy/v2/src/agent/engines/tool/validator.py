"""
PostGenValidator — validate generated code using ProjectGraph as ground truth.

DEPRECATED: Prefer engines/context/validator.py (PreWriteValidator) which validates
BEFORE writing to disk and checks more conditions (signatures, types, duplicates,
invariants). PostGenValidator is kept for backward compatibility with the
DevSupervisor flow where context engine may not be initialized.

Runs after each code generation step to catch:
  1. Phantom imports (import paths that don't resolve)
  2. Phantom symbols (imported names not exported by target)
  3. Phantom enums (enum values used but not defined)
  4. Import/type density (ratio of resolvable imports)
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .graph import ProjectGraph


@dataclass
class ValidationIssue:
    """A single validation issue found in generated code."""
    kind: str        # PHANTOM_IMPORT, PHANTOM_SYMBOL, PHANTOM_ENUM, LOW_DENSITY
    line: int
    message: str
    severity: str = "error"   # error, warning
    suggestion: Optional[str] = None


@dataclass
class ValidationResult:
    """Complete validation result for a generated file."""
    file: str
    issues: list[ValidationIssue] = field(default_factory=list)
    import_count: int = 0
    resolved_count: int = 0
    phantom_count: int = 0

    @property
    def is_clean(self) -> bool:
        return len([i for i in self.issues if i.severity == "error"]) == 0

    @property
    def import_resolution_rate(self) -> float:
        if self.import_count == 0:
            return 1.0
        return self.resolved_count / self.import_count

    def summary(self) -> str:
        """One-line summary for logging."""
        errors = len([i for i in self.issues if i.severity == "error"])
        warnings = len([i for i in self.issues if i.severity == "warning"])
        rate = f"{self.import_resolution_rate:.0%}"
        return f"{self.file}: {errors} errors, {warnings} warnings, imports {rate} resolved"

    def to_llm_feedback(self) -> str:
        """Format issues as feedback to include in LLM retry prompt."""
        if not self.issues:
            return ""
        lines = ["VALIDATION ERRORS in your generated code:"]
        for issue in self.issues:
            prefix = "ERROR" if issue.severity == "error" else "WARN"
            lines.append(f"  [{prefix}] line {issue.line}: {issue.message}")
            if issue.suggestion:
                lines.append(f"    → FIX: {issue.suggestion}")
        return "\n".join(lines)


class PostGenValidator:
    """Validate generated TypeScript code against ProjectGraph."""

    def __init__(self, graph: ProjectGraph):
        self.graph = graph

    def validate(self, code: str, from_file: str) -> ValidationResult:
        """Run all validations on generated code."""
        result = ValidationResult(file=from_file)

        # 1. Validate imports
        self._check_imports(code, from_file, result)

        # 2. Validate enum usage
        self._check_enums(code, result)

        return result

    def validate_file(self, file_path: Path) -> ValidationResult:
        """Validate an already-written file on disk."""
        try:
            code = file_path.read_text(encoding="utf-8", errors="replace")
        except (OSError, IOError):
            result = ValidationResult(file=str(file_path))
            result.issues.append(ValidationIssue(
                kind="FILE_ERROR", line=0,
                message=f"Could not read file: {file_path}",
            ))
            return result

        rel = str(file_path.relative_to(self.graph.src_dir))
        return self.validate(code, rel)

    def validate_module(self, module: str) -> list[ValidationResult]:
        """Validate all files in a module."""
        results = []
        mod = self.graph.modules.get(module)
        if not mod:
            return results

        for file_path in mod.files:
            full_path = self.graph.src_dir / file_path
            results.append(self.validate_file(full_path))

        return results

    def _check_imports(self, code: str, from_file: str, result: ValidationResult) -> None:
        """Check all import statements resolve correctly."""
        import_pattern = re.compile(
            r"import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['\"]([^'\"]+)['\"]"
        )

        for i, line in enumerate(code.splitlines(), 1):
            m = import_pattern.match(line.strip())
            if not m:
                continue

            names_str = m.group(1) or m.group(2)
            names = [n.strip().split(" as ")[-1].strip()
                     for n in names_str.split(",") if n.strip()]
            import_path = m.group(3)

            if not import_path.startswith("."):
                continue  # skip npm imports

            result.import_count += 1
            resolve = self.graph.resolve_import(from_file, import_path)

            if not resolve.resolved:
                result.phantom_count += 1
                suggestion = resolve.suggestion
                result.issues.append(ValidationIssue(
                    kind="PHANTOM_IMPORT",
                    line=i,
                    message=f"'{import_path}' does not resolve to any file",
                    suggestion=f"use '{suggestion}'" if suggestion else "remove or create the file",
                ))
            else:
                result.resolved_count += 1
                # Check symbol existence
                if resolve.symbols:
                    for name in names:
                        if name and name not in resolve.symbols:
                            result.issues.append(ValidationIssue(
                                kind="PHANTOM_SYMBOL",
                                line=i,
                                message=f"'{name}' not exported from '{import_path}'",
                                severity="warning",
                                suggestion=f"available: {', '.join(resolve.symbols[:5])}",
                            ))

    def _check_enums(self, code: str, result: ValidationResult) -> None:
        """Check that enum values used in code are actually defined."""
        # 1. Find enum definitions in this code
        enum_values: dict[str, set[str]] = {}
        current_enum = None
        lines = code.splitlines()

        for i, line in enumerate(lines):
            stripped = line.strip()
            m = re.match(r"(?:export\s+)?enum\s+(\w+)\s*\{", stripped)
            if m:
                current_enum = m.group(1)
                enum_values[current_enum] = set()
                after = stripped.split("{", 1)[1] if "{" in stripped else ""
                for val in re.findall(r"(\w+)\s*[=,}]", after):
                    enum_values[current_enum].add(val)
                continue
            if current_enum:
                if stripped.startswith("}"):
                    current_enum = None
                    continue
                m2 = re.match(r"(\w+)\s*[=,]?", stripped)
                if m2 and m2.group(1):
                    enum_values[current_enum].add(m2.group(1))

        # 2. Also check enums from ProjectGraph
        for sym_name, sym in self.graph.symbols.items():
            if sym.kind == "enum" and sym.members:
                enum_values.setdefault(sym_name, set()).update(sym.members)

        # 3. Find all EnumName.VALUE usages
        for enum_name, values in enum_values.items():
            for m in re.finditer(rf"{enum_name}\.(\w+)", code):
                usage = m.group(1)
                if usage not in values:
                    # Find line number
                    pos = m.start()
                    line_num = code[:pos].count("\n") + 1
                    result.issues.append(ValidationIssue(
                        kind="PHANTOM_ENUM",
                        line=line_num,
                        message=f"{enum_name}.{usage} — '{usage}' not defined in enum",
                        severity="error",
                        suggestion=f"defined values: {', '.join(sorted(values)[:8])}",
                    ))
