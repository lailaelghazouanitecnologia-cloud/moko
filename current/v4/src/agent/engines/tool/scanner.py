"""
FileScanner — parse TypeScript files to extract exports, imports, enum values, and class members.

This is the foundation of the Tool Engine. ProjectGraph uses FileScanner to build
a complete map of the generated project.

Regex-based (no AST dependency), handles:
  - export class/interface/enum/type/function/const
  - import { X, Y } from './path'
  - import X from './path'
  - export { X } from './path' (re-exports)
  - Enum value extraction (complete list)
  - Class/interface member extraction (methods + fields)
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class ExportInfo:
    """An exported symbol from a TypeScript file."""
    name: str
    kind: str  # "class", "interface", "enum", "type", "function", "const", "re-export"
    members: list[str] = field(default_factory=list)  # enum values or class methods
    fields: list[tuple[str, str]] = field(default_factory=list)  # (name, type) pairs
    line: int = 0


@dataclass
class ImportInfo:
    """An import statement in a TypeScript file."""
    names: list[str]       # imported symbol names
    path: str              # import path (e.g., './registers', '../types')
    is_relative: bool = True
    line: int = 0


@dataclass
class ScanResult:
    """Complete scan result for a single TypeScript file."""
    path: Path
    exports: list[ExportInfo] = field(default_factory=list)
    imports: list[ImportInfo] = field(default_factory=list)
    loc: int = 0
    has_barrel: bool = False  # is this an index.ts with re-exports?


# ── Regex patterns ──────────────────────────────────────────

_EXPORT_DECL = re.compile(
    r"export\s+(?:abstract\s+)?"
    r"(class|interface|enum|type|function|const)\s+"
    r"(\w+)"
)

_IMPORT_NAMED = re.compile(
    r"import\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]"
)

_IMPORT_DEFAULT = re.compile(
    r"import\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]"
)

_REEXPORT = re.compile(
    r"export\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]"
)

_REEXPORT_STAR = re.compile(
    r"export\s+\*\s+from\s+['\"]([^'\"]+)['\"]"
)

_ENUM_MEMBER = re.compile(r"^\s*(\w+)\s*[=,]?")

_CLASS_METHOD = re.compile(
    r"^\s*(?:public\s+|protected\s+|private\s+|static\s+|readonly\s+|abstract\s+|async\s+)*"
    r"(\w+)\s*(?:<[^>]*>)?\s*\("
)

_CLASS_FIELD = re.compile(
    r"^\s*(?:public\s+|protected\s+|private\s+|readonly\s+|static\s+)*"
    r"(\w+)\s*(?:\??\s*:\s*(.+?))\s*[;=]"
)


class FileScanner:
    """Parse a TypeScript file and extract its structure."""

    @staticmethod
    def scan(file_path: Path) -> ScanResult:
        """Scan a single .ts file and return its structure."""
        try:
            code = file_path.read_text(encoding="utf-8", errors="replace")
        except (OSError, IOError):
            return ScanResult(path=file_path)

        lines = code.splitlines()
        result = ScanResult(
            path=file_path,
            loc=len([l for l in lines if l.strip() and not l.strip().startswith("//")]),
        )

        # Check if this is a barrel file (index.ts with mostly re-exports)
        if file_path.name == "index.ts":
            reexport_count = len(_REEXPORT.findall(code)) + len(_REEXPORT_STAR.findall(code))
            export_count = len(_EXPORT_DECL.findall(code))
            result.has_barrel = reexport_count > 0 and reexport_count >= export_count

        # Extract imports
        result.imports = FileScanner._extract_imports(code, lines)

        # Extract exports with members
        result.exports = FileScanner._extract_exports(code, lines)

        # Extract re-exports
        for m in _REEXPORT.finditer(code):
            names = [n.strip() for n in m.group(1).split(",") if n.strip()]
            for name in names:
                # Handle "X as Y" re-exports
                actual = name.split(" as ")[-1].strip()
                result.exports.append(ExportInfo(
                    name=actual, kind="re-export",
                    line=code[:m.start()].count("\n") + 1,
                ))

        return result

    @staticmethod
    def _extract_imports(code: str, lines: list[str]) -> list[ImportInfo]:
        """Extract all import statements."""
        imports = []

        for m in _IMPORT_NAMED.finditer(code):
            names = [n.strip().split(" as ")[-1].strip()
                     for n in m.group(1).split(",") if n.strip()]
            path = m.group(2)
            imports.append(ImportInfo(
                names=names,
                path=path,
                is_relative=path.startswith("."),
                line=code[:m.start()].count("\n") + 1,
            ))

        for m in _IMPORT_DEFAULT.finditer(code):
            name = m.group(1)
            path = m.group(2)
            if name not in ("type", "from"):  # skip false positives
                imports.append(ImportInfo(
                    names=[name],
                    path=path,
                    is_relative=path.startswith("."),
                    line=code[:m.start()].count("\n") + 1,
                ))

        return imports

    @staticmethod
    def _extract_exports(code: str, lines: list[str]) -> list[ExportInfo]:
        """Extract exported declarations with their members."""
        exports = []
        i = 0
        while i < len(lines):
            line = lines[i]
            m = _EXPORT_DECL.match(line.strip() if line.strip().startswith("export") else "")
            if not m:
                # Also try non-stripped for indented exports
                m = _EXPORT_DECL.search(line)
            if not m:
                i += 1
                continue

            kind = m.group(1)
            name = m.group(2)
            export = ExportInfo(name=name, kind=kind, line=i + 1)

            if kind == "enum":
                export.members = FileScanner._extract_enum_members(lines, i)
            elif kind in ("class", "interface"):
                members, fields = FileScanner._extract_class_members(lines, i)
                export.members = members
                export.fields = fields

            exports.append(export)
            i += 1

        return exports

    @staticmethod
    def _extract_enum_members(lines: list[str], start: int) -> list[str]:
        """Extract all enum member names starting from the enum declaration line."""
        members = []
        depth = 0
        started = False

        for i in range(start, min(start + 200, len(lines))):
            line = lines[i]
            for ch in line:
                if ch == "{":
                    depth += 1
                    started = True
                elif ch == "}":
                    depth -= 1
                    if started and depth == 0:
                        return members

            if started and depth >= 1:
                # Extract member name from this line (skip the opening line)
                if i > start or "{" in lines[start]:
                    stripped = line.strip()
                    # Skip comments and empty lines
                    if stripped and not stripped.startswith("//") and not stripped.startswith("/*"):
                        em = _ENUM_MEMBER.match(stripped)
                        if em and em.group(1) not in ("{", "}", "export", "enum"):
                            members.append(em.group(1))

        return members

    @staticmethod
    def _extract_class_members(lines: list[str], start: int) -> tuple[list[str], list[tuple[str, str]]]:
        """Extract method names and field (name, type) pairs from a class/interface."""
        methods = []
        fields = []
        depth = 0
        started = False

        for i in range(start, min(start + 500, len(lines))):
            line = lines[i]
            for ch in line:
                if ch == "{":
                    depth += 1
                    started = True
                elif ch == "}":
                    depth -= 1
                    if started and depth == 0:
                        return methods, fields

            # Only capture members at depth 1 (direct members)
            if started and depth == 1 and i > start:
                stripped = line.strip()
                if not stripped or stripped.startswith("//") or stripped.startswith("/*"):
                    continue

                # Skip constructor params, decorators
                if stripped.startswith("@") or stripped.startswith("*"):
                    continue

                # Check method
                mm = _CLASS_METHOD.match(stripped)
                if mm:
                    method_name = mm.group(1)
                    if method_name not in ("if", "for", "while", "switch", "return", "new", "throw"):
                        methods.append(method_name)
                    continue

                # Check field
                fm = _CLASS_FIELD.match(stripped)
                if fm:
                    fname = fm.group(1)
                    ftype = fm.group(2).rstrip(";").strip() if fm.group(2) else ""
                    if fname not in ("if", "for", "while", "return"):
                        fields.append((fname, ftype))

        return methods, fields

    @staticmethod
    def scan_directory(directory: Path, extensions: tuple[str, ...] = (".ts",)) -> list[ScanResult]:
        """Scan all TypeScript files in a directory recursively."""
        results = []
        if not directory.exists():
            return results

        for ext in extensions:
            for file_path in sorted(directory.rglob(f"*{ext}")):
                if "node_modules" in str(file_path):
                    continue
                results.append(FileScanner.scan(file_path))

        return results
