"""
ImportResolver — fix imports in generated code using ProjectGraph as truth.

Post-generation step: takes generated TypeScript code and corrects import
statements to point to real files with real exports.

Fixes:
  - Wrong relative paths (./types → ./cpu-types)
  - Missing files (generates suggestion or removes import)
  - Wrong symbol names (imports non-exported symbol → suggests correct one)
  - Cross-module paths (../types → ../shared/types)
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .graph import ProjectGraph, ResolveResult


@dataclass
class ImportFix:
    """A single import fix applied to generated code."""
    line: int
    original: str         # original import line
    fixed: str            # corrected import line
    reason: str           # explanation: "path './types' not found → './cpu-types'"


@dataclass
class ResolveReport:
    """Report of all import fixes applied to a piece of code."""
    fixes: list[ImportFix] = field(default_factory=list)
    unresolved: list[str] = field(default_factory=list)  # imports that couldn't be fixed
    code: str = ""         # the corrected code


_IMPORT_PATTERN = re.compile(
    r"(import\s+(?:\{[^}]+\}|\w+)\s+from\s+['\"])([^'\"]+)(['\"];?)"
)

_IMPORT_NAMES = re.compile(r"import\s+\{([^}]+)\}\s+from")
_IMPORT_DEFAULT = re.compile(r"import\s+(\w+)\s+from")


class ImportResolver:
    """Fix imports in generated TypeScript code using ProjectGraph."""

    def __init__(self, graph: ProjectGraph):
        self.graph = graph

    def resolve(self, code: str, from_file: str) -> ResolveReport:
        """Resolve all imports in code. Returns corrected code + report."""
        lines = code.splitlines()
        fixes = []
        unresolved = []
        output_lines = []

        for i, line in enumerate(lines):
            stripped = line.strip()
            m = _IMPORT_PATTERN.match(stripped)

            if not m:
                output_lines.append(line)
                continue

            prefix = m.group(1)
            import_path = m.group(2)
            suffix = m.group(3)

            # Skip non-relative imports (npm packages)
            if not import_path.startswith("."):
                output_lines.append(line)
                continue

            result = self.graph.resolve_import(from_file, import_path)

            if result.resolved:
                # Path is valid — check symbol names
                fixed_line = self._fix_symbol_names(line, result, from_file)
                if fixed_line != line:
                    fixes.append(ImportFix(
                        line=i + 1,
                        original=stripped,
                        fixed=fixed_line.strip(),
                        reason="symbol name correction",
                    ))
                    output_lines.append(fixed_line)
                else:
                    output_lines.append(line)
            else:
                # Path not found — try to fix
                fixed = self._fix_path(line, from_file, import_path, prefix, suffix)
                if fixed:
                    fixes.append(ImportFix(
                        line=i + 1,
                        original=stripped,
                        fixed=fixed.strip(),
                        reason=f"path '{import_path}' not found → '{self._extract_path(fixed)}'",
                    ))
                    output_lines.append(fixed)
                else:
                    # Can't fix — try symbol-based resolution
                    names = self._extract_import_names(line)
                    symbol_fix = self._resolve_by_symbol(names, from_file, prefix, suffix)
                    if symbol_fix:
                        fixes.append(ImportFix(
                            line=i + 1,
                            original=stripped,
                            fixed=symbol_fix.strip(),
                            reason=f"resolved by symbol lookup: {', '.join(names)}",
                        ))
                        output_lines.append(symbol_fix)
                    else:
                        unresolved.append(f"line {i+1}: {stripped}")
                        output_lines.append(f"// UNRESOLVED: {line}")

        return ResolveReport(
            fixes=fixes,
            unresolved=unresolved,
            code="\n".join(output_lines),
        )

    def fix_code(self, code: str, from_file: str) -> str:
        """Convenience: resolve imports and return only the fixed code."""
        report = self.resolve(code, from_file)
        return report.code

    def _fix_path(self, line: str, from_file: str, bad_path: str,
                  prefix: str, suffix: str) -> Optional[str]:
        """Try to fix a bad import path using graph suggestions."""
        result = self.graph.resolve_import(from_file, bad_path)
        if result.suggestion:
            return line.replace(bad_path, result.suggestion)

        # Try harder: look for files with similar names
        target = bad_path.rstrip("/").split("/")[-1]
        from_module = self.graph._module_from_path(from_file)

        # Search same module first, then all modules
        for file_path, node in self.graph.files.items():
            stem = Path(file_path).stem
            file_module = self.graph._module_from_path(file_path)

            if self._names_match(stem, target):
                new_path = self.graph._import_path_for(from_module, file_path)
                return line.replace(bad_path, new_path)

        return None

    def _fix_symbol_names(self, line: str, result: ResolveResult, from_file: str) -> str:
        """Check that imported symbols exist in the resolved file. Fix if possible."""
        if not result.symbols:
            return line

        names = self._extract_import_names(line)
        fixed_names = []
        changed = False

        for name in names:
            if name in result.symbols:
                fixed_names.append(name)
            else:
                # Try case-insensitive match
                match = self._fuzzy_match(name, result.symbols)
                if match:
                    fixed_names.append(match)
                    changed = True
                else:
                    # Symbol not in this file — might need different import
                    # Keep it for now (validator will flag it)
                    fixed_names.append(name)

        if changed:
            old_names = ", ".join(names)
            new_names = ", ".join(fixed_names)
            return line.replace(old_names, new_names)

        return line

    def _resolve_by_symbol(self, names: list[str], from_file: str,
                           prefix: str, suffix: str) -> Optional[str]:
        """Try to find the correct import path by looking up symbol names."""
        if not names:
            return None

        from_module = self.graph._module_from_path(from_file)

        # Find where these symbols live
        found_files: dict[str, list[str]] = {}  # file → [symbols]
        for name in names:
            sym = self.graph.symbols.get(name)
            if sym:
                found_files.setdefault(sym.file, []).append(name)

        if not found_files:
            return None

        # If all symbols are in one file, generate that import
        if len(found_files) == 1:
            file_path = list(found_files.keys())[0]
            import_path = self.graph._import_path_for(from_module, file_path)
            syms = list(found_files.values())[0]
            return f"import {{ {', '.join(syms)} }} from '{import_path}';"

        # Multiple files — generate import for the file with most symbols
        best_file = max(found_files, key=lambda f: len(found_files[f]))
        import_path = self.graph._import_path_for(from_module, best_file)
        syms = found_files[best_file]
        return f"import {{ {', '.join(syms)} }} from '{import_path}';"

    def _extract_import_names(self, line: str) -> list[str]:
        """Extract imported symbol names from an import line."""
        m = _IMPORT_NAMES.search(line)
        if m:
            return [n.strip().split(" as ")[-1].strip()
                    for n in m.group(1).split(",") if n.strip()]
        m = _IMPORT_DEFAULT.search(line)
        if m:
            name = m.group(1)
            if name not in ("type",):
                return [name]
        return []

    def _extract_path(self, import_line: str) -> str:
        """Extract the import path from a fixed import line."""
        m = re.search(r"from\s+['\"]([^'\"]+)['\"]", import_line)
        return m.group(1) if m else ""

    @staticmethod
    def _names_match(a: str, b: str) -> bool:
        """Check if two names match, ignoring case and hyphens/underscores."""
        normalize = lambda s: s.lower().replace("-", "").replace("_", "")
        return normalize(a) == normalize(b)

    @staticmethod
    def _fuzzy_match(name: str, candidates: list[str]) -> Optional[str]:
        """Find the best fuzzy match for a name among candidates."""
        lower = name.lower()
        for c in candidates:
            if c.lower() == lower:
                return c
        # Try prefix match
        for c in candidates:
            if c.lower().startswith(lower) or lower.startswith(c.lower()):
                return c
        return None
