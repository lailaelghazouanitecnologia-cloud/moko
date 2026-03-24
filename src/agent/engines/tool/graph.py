"""
ProjectGraph — complete, real-time map of a generated project.

Source of truth for: what files exist, what they export, what imports are valid.
Rebuilt via scan() after each generation step (~50ms for 100 files).

Usage:
    graph = ProjectGraph(project_dir / "src")
    graph.scan()
    result = graph.resolve_import("cpu/decoder.ts", "./registers")
    available = graph.get_available_types("cpu")
    phantoms = graph.find_phantom_imports(generated_code, "cpu")
    context = graph.to_import_map("cpu", budget=2000)
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .scanner import FileScanner, ScanResult, ExportInfo, ImportInfo


@dataclass
class ExportedSymbol:
    """A symbol available for import in the project."""
    name: str
    kind: str            # class, interface, enum, type, function, const
    file: str            # relative path from src_dir (e.g., "cpu/registers.ts")
    module: str          # module name (e.g., "cpu")
    members: list[str] = field(default_factory=list)
    fields: list[tuple[str, str]] = field(default_factory=list)


@dataclass
class FileNode:
    """A file in the project with its exports and imports."""
    path: str            # relative path from src_dir
    exports: list[ExportInfo] = field(default_factory=list)
    imports: list[ImportInfo] = field(default_factory=list)
    loc: int = 0
    is_barrel: bool = False


@dataclass
class ModuleNode:
    """A module (directory) in the project."""
    name: str
    files: list[str] = field(default_factory=list)  # relative paths
    barrel_exports: list[str] = field(default_factory=list)  # symbols exported from index.ts


@dataclass
class ResolveResult:
    """Result of resolving an import path."""
    resolved: bool
    file: Optional[str] = None        # resolved file path
    symbols: list[str] = field(default_factory=list)  # available symbols in that file
    suggestion: Optional[str] = None  # corrected import path if original was wrong


class ProjectGraph:
    """Complete, scannable map of a generated TypeScript project."""

    def __init__(self, src_dir: Path):
        self.src_dir = Path(src_dir)
        self.files: dict[str, FileNode] = {}
        self.symbols: dict[str, ExportedSymbol] = {}
        self.modules: dict[str, ModuleNode] = {}
        self._scanned = False

    def scan(self) -> None:
        """Scan the project directory and rebuild all indexes."""
        self.files.clear()
        self.symbols.clear()
        self.modules.clear()

        if not self.src_dir.exists():
            self._scanned = True
            return

        results = FileScanner.scan_directory(self.src_dir)

        for sr in results:
            rel = str(sr.path.relative_to(self.src_dir))
            module_name = self._module_from_path(rel)

            # Build FileNode
            node = FileNode(
                path=rel,
                exports=sr.exports,
                imports=sr.imports,
                loc=sr.loc,
                is_barrel=sr.has_barrel,
            )
            self.files[rel] = node

            # Build ModuleNode
            if module_name not in self.modules:
                self.modules[module_name] = ModuleNode(name=module_name)
            mod = self.modules[module_name]
            mod.files.append(rel)

            # Index exported symbols
            for exp in sr.exports:
                sym = ExportedSymbol(
                    name=exp.name,
                    kind=exp.kind,
                    file=rel,
                    module=module_name,
                    members=exp.members,
                    fields=exp.fields,
                )
                self.symbols[exp.name] = sym

                if sr.has_barrel:
                    mod.barrel_exports.append(exp.name)

        self._scanned = True

    def resolve_import(self, from_file: str, import_path: str) -> ResolveResult:
        """Resolve an import path from a given file to actual files.

        Returns ResolveResult with resolved=True if found, plus available symbols.
        If not found, tries to suggest the correct path.
        """
        if not import_path.startswith("."):
            return ResolveResult(resolved=True)  # external, assume valid

        from_dir = str(Path(from_file).parent)
        # Normalize: resolve ../x, ./x relative to from_dir
        resolved_path = os.path.normpath(os.path.join(from_dir, import_path))
        resolved_path = resolved_path.replace("\\", "/")

        # Try candidates: path.ts, path/index.ts
        candidates = [
            f"{resolved_path}.ts",
            f"{resolved_path}/index.ts",
        ]

        for cand in candidates:
            if cand in self.files:
                node = self.files[cand]
                syms = [e.name for e in node.exports]
                return ResolveResult(resolved=True, file=cand, symbols=syms)

        # Not found — try to suggest
        suggestion = self._suggest_import(from_file, import_path)
        return ResolveResult(resolved=False, suggestion=suggestion)

    def get_available_types(self, module: str) -> list[ExportedSymbol]:
        """Get all exported types/classes/enums in a module."""
        return [
            sym for sym in self.symbols.values()
            if sym.module == module and sym.kind in ("class", "interface", "enum", "type")
        ]

    def find_phantom_imports(self, code: str, module_dir: str) -> list[dict]:
        """Find imports in generated code that don't resolve to real files.

        Returns list of {line, path, names, suggestion} dicts.
        """
        import re
        phantoms = []

        for i, line in enumerate(code.splitlines(), 1):
            stripped = line.strip()

            # Match import { X } from './path'
            m = re.match(r"import\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]", stripped)
            if not m:
                m = re.match(r"import\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]", stripped)
            if not m:
                continue

            names = [n.strip() for n in m.group(1).split(",") if n.strip()]
            path = m.group(2)

            if not path.startswith("."):
                continue

            # Build from_file path
            from_file = f"{module_dir}/generated.ts"  # placeholder
            result = self.resolve_import(from_file, path)

            if not result.resolved:
                phantoms.append({
                    "line": i,
                    "path": path,
                    "names": names,
                    "suggestion": result.suggestion,
                })
            else:
                # Check that imported names actually exist in the target
                if result.symbols:
                    for name in names:
                        clean = name.split(" as ")[-1].strip()
                        if clean and clean not in result.symbols:
                            phantoms.append({
                                "line": i,
                                "path": path,
                                "names": [clean],
                                "suggestion": None,
                                "issue": f"'{clean}' not exported from '{path}'",
                            })

        return phantoms

    def to_import_map(self, for_module: str, budget: int = 3000) -> str:
        """Generate a compact import map for LLM context.

        Shows what symbols are available and how to import them,
        so the LLM generates correct import statements.

        Example output:
          AVAILABLE IMPORTS for cpu/:
            from './registers' → Registers, FlagsRegister, StatusFlag
            from './decoder' → InstructionDecoder, AddressingMode
            from '../math/vec3' → Vec3, Vec4
        """
        lines = ["AVAILABLE IMPORTS:"]
        used = 20

        # 1. Same-module files
        same_module = []
        cross_module = []

        for sym in sorted(self.symbols.values(), key=lambda s: s.name):
            if sym.module == for_module:
                same_module.append(sym)
            else:
                cross_module.append(sym)

        # Group same-module by file
        by_file: dict[str, list[str]] = {}
        for sym in same_module:
            by_file.setdefault(sym.file, []).append(sym.name)

        for file_path, names in sorted(by_file.items()):
            import_path = self._import_path_for(for_module, file_path)
            line = f"  from '{import_path}' → {', '.join(sorted(names))}"
            if used + len(line) + 1 > budget:
                break
            lines.append(line)
            used += len(line) + 1

        # 2. Cross-module symbols (grouped by module)
        if cross_module and used < budget - 100:
            lines.append("  -- from other modules --")
            used += 30

            by_mod: dict[str, list[ExportedSymbol]] = {}
            for sym in cross_module:
                by_mod.setdefault(sym.module, []).append(sym)

            for mod_name, syms in sorted(by_mod.items()):
                names = sorted(s.name for s in syms)
                import_path = f"../{mod_name}"
                line = f"  from '{import_path}' → {', '.join(names)}"
                if used + len(line) + 1 > budget:
                    lines.append("  ...")
                    break
                lines.append(line)
                used += len(line) + 1

        return "\n".join(lines)

    def to_symbol_map(self, budget: int = 2000) -> str:
        """Generate a compact symbol → file lookup for the full project.

        Format: SymbolName [kind] ← module/file.ts
        """
        lines = []
        used = 0
        for sym in sorted(self.symbols.values(), key=lambda s: (s.module, s.name)):
            line = f"  {sym.name} [{sym.kind}] ← {sym.file}"
            if used + len(line) + 1 > budget:
                lines.append("  ...")
                break
            lines.append(line)
            used += len(line) + 1
        return "PROJECT SYMBOLS:\n" + "\n".join(lines) if lines else ""

    def get_enum_values(self, enum_name: str) -> list[str]:
        """Get the known values of an enum by name."""
        sym = self.symbols.get(enum_name)
        if sym and sym.kind == "enum":
            return sym.members
        return []

    # ── Internal helpers ──────────────────────────────────────

    def _module_from_path(self, rel_path: str) -> str:
        """Extract module name from relative path. 'cpu/registers.ts' → 'cpu'."""
        parts = Path(rel_path).parts
        if len(parts) > 1:
            return parts[0]
        return "_root"

    def _import_path_for(self, from_module: str, target_file: str) -> str:
        """Compute relative import path from a module to a target file.

        'cpu', 'cpu/registers.ts' → './registers'
        'cpu', 'math/vec3.ts' → '../math/vec3'
        """
        target = Path(target_file)
        stem = target.stem
        target_module = self._module_from_path(target_file)

        if target_module == from_module:
            return f"./{stem}"
        else:
            return f"../{target_module}/{stem}"

    def _suggest_import(self, from_file: str, bad_path: str) -> Optional[str]:
        """Try to find what the user probably meant with a bad import path.

        Strategy: extract the last segment of the path, search for files with that name.
        """
        # Extract target name: '../types' → 'types', './segment-descriptor' → 'segment-descriptor'
        target = bad_path.rstrip("/").split("/")[-1]
        from_module = self._module_from_path(from_file)

        # Search for files matching the target name
        matches = []
        for file_path in self.files:
            stem = Path(file_path).stem
            if stem == target or stem.replace("-", "_") == target.replace("-", "_"):
                matches.append(file_path)

        if len(matches) == 1:
            return self._import_path_for(from_module, matches[0])

        # Search for symbols matching the target name (case insensitive)
        for sym_name, sym in self.symbols.items():
            if sym_name.lower() == target.lower().replace("-", ""):
                return self._import_path_for(from_module, sym.file)

        return None

    def __repr__(self) -> str:
        return (
            f"ProjectGraph(files={len(self.files)}, "
            f"symbols={len(self.symbols)}, "
            f"modules={list(self.modules.keys())})"
        )
