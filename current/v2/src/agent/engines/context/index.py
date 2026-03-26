"""
LiveIndex — real-time index of a generated TypeScript project.

Maintains: file states, call graph, reverse call graph, type registry,
export/import maps. Updated incrementally after each file write (<5ms).

Uses regex-based parsing (same approach as FileScanner) — no external
AST dependency required. For projects where tree-sitter is available,
can be swapped in without changing the API.

Usage:
    index = LiveIndex(project_dir / "src")
    index.scan_all()                        # initial full scan
    issues = index.update("cpu/decoder.ts") # incremental after write
    exports = index.get_exports("cpu/decoder.ts")
    callers = index.get_callers("Decoder")
    dead = index.find_dead_code()
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# ── Data models ─────────────────────────────────────────────

@dataclass
class ImportDef:
    """One import statement."""
    symbol: str
    source: str          # import path
    kind: str = "named"  # named, default, star


@dataclass
class Signature:
    """An exported function/method/class/interface/enum."""
    name: str
    kind: str            # class, interface, enum, type, function, const
    params: str = ""     # parameter string for functions/methods
    return_type: str = ""
    members: list[str] = field(default_factory=list)    # enum values
    fields: list[tuple[str, str]] = field(default_factory=list)  # (name, type)
    line: int = 0


@dataclass
class TypeDef:
    """A type definition tracked in the registry."""
    name: str
    kind: str            # class, interface, enum, type
    file: str            # relative path from src_dir
    fields: list[tuple[str, str]] = field(default_factory=list)
    methods: list[str] = field(default_factory=list)
    extends: str = ""
    members: list[str] = field(default_factory=list)  # enum values


@dataclass
class Issue:
    """An issue detected during index update."""
    kind: str            # breaking_removal, breaking_change, missing_import
    message: str
    file: str = ""
    line: int = 0


@dataclass
class FileState:
    """Parsed state of one file."""
    path: str
    lines: int = 0
    imports: list[ImportDef] = field(default_factory=list)
    exports: list[Signature] = field(default_factory=list)
    internal: list[Signature] = field(default_factory=list)
    types_defined: list[TypeDef] = field(default_factory=list)
    types_used: list[str] = field(default_factory=list)
    sig_hash: str = ""
    last_modified: int = 0

    @property
    def export_names(self) -> list[str]:
        return [s.name for s in self.exports]


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

_METHOD_RE = re.compile(
    r"^\s*(?:public\s+|protected\s+|private\s+|static\s+|readonly\s+|abstract\s+|async\s+)*"
    r"(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*:\s*([^{;]+?))?\s*[{;]",
    re.MULTILINE,
)

_FIELD_RE = re.compile(
    r"^\s*(?:public\s+|protected\s+|private\s+|readonly\s+|static\s+)*"
    r"(\w+)\s*(?:\?\s*)?:\s*([^=;{]+?)(?:\s*=\s*[^;]+)?\s*;",
    re.MULTILINE,
)

_ENUM_MEMBER = re.compile(r"^\s*(\w+)\s*[=,}]?", re.MULTILINE)

_CLASS_RE = re.compile(
    r"export\s+(?:abstract\s+)?class\s+(\w+)"
    r"(?:\s+extends\s+(\w+))?"
    r"(?:\s+implements\s+([^{]+))?\s*\{",
    re.MULTILINE,
)

_SKIP_NAMES = {
    "if", "for", "while", "switch", "catch", "return", "new",
    "super", "constructor", "typeof", "instanceof", "throw",
    "function", "const", "let", "var", "require", "import", "export",
}

_TYPE_REF = re.compile(r"\b([A-Z]\w+)\b")


# ── LiveIndex ───────────────────────────────────────────────

class LiveIndex:
    """Real-time index of a generated TypeScript project."""

    def __init__(self, src_dir: Path):
        self.src_dir = Path(src_dir)
        self.files: dict[str, FileState] = {}
        self.call_graph: dict[str, set[str]] = {}      # symbol → symbols it calls
        self.reverse_graph: dict[str, set[str]] = {}    # symbol → symbols that call it
        self.type_registry: dict[str, TypeDef] = {}
        self.export_map: dict[str, list[str]] = {}      # path → export names
        self.import_map: dict[str, list[str]] = {}      # path → import sources
        self._turn = 0

    def scan_all(self) -> None:
        """Full scan of all .ts files under src_dir."""
        self.files.clear()
        self.type_registry.clear()
        self.export_map.clear()
        self.import_map.clear()
        self.call_graph.clear()
        self.reverse_graph.clear()

        if not self.src_dir.exists():
            return

        for ts_file in sorted(self.src_dir.rglob("*.ts")):
            rel = str(ts_file.relative_to(self.src_dir))
            self._parse_and_index(rel)

        self._rebuild_all_graphs()

    def update(self, path: str) -> list[Issue]:
        """Re-parse ONE file and propagate changes. Returns issues found."""
        self._turn += 1
        abs_path = self.src_dir / path
        if not abs_path.exists():
            # File was deleted — remove from index
            return self._remove_file(path)

        old_state = self.files.get(path)
        new_state = self._parse_file(path)
        new_state.last_modified = self._turn

        # Fast path: signatures unchanged
        if old_state and old_state.sig_hash == new_state.sig_hash:
            self.files[path] = new_state
            return []

        # Detect breaking changes
        issues = []
        if old_state:
            old_exports = set(old_state.export_names)
            new_exports = set(new_state.export_names)

            for sym in old_exports - new_exports:
                key = f"{path}:{sym}"
                callers = self.reverse_graph.get(key, set())
                if callers:
                    issues.append(Issue(
                        kind="breaking_removal",
                        message=f"Removing {sym} breaks: {', '.join(callers)}",
                        file=path,
                    ))

            # Check changed signatures
            old_sigs = {s.name: s for s in old_state.exports}
            for sig in new_state.exports:
                if sig.name in old_sigs:
                    old_sig = old_sigs[sig.name]
                    if (sig.params != old_sig.params or
                            sig.return_type != old_sig.return_type):
                        key = f"{path}:{sig.name}"
                        callers = self.reverse_graph.get(key, set())
                        if callers:
                            issues.append(Issue(
                                kind="breaking_change",
                                message=(
                                    f"{sig.name} signature changed, "
                                    f"callers: {', '.join(callers)}"
                                ),
                                file=path,
                            ))

        # Update index
        self.files[path] = new_state
        self._update_type_registry(path, new_state)
        self.export_map[path] = new_state.export_names
        self.import_map[path] = [imp.source for imp in new_state.imports]
        self._rebuild_graphs_for(path)

        return issues

    def get_exports(self, path: str) -> list[Signature]:
        """Get exported signatures of a file."""
        state = self.files.get(path)
        return state.exports if state else []

    def get_callers(self, symbol: str) -> list[str]:
        """Find all files/symbols that reference a given symbol."""
        callers: set[str] = set()
        for key, refs in self.reverse_graph.items():
            if symbol in refs:
                callers.add(key.split(":")[0])
        # Also check direct reverse graph
        for key in self.reverse_graph:
            if key.endswith(f":{symbol}"):
                callers.update(self.reverse_graph[key])
        return list(callers)

    def get_type(self, name: str) -> Optional[TypeDef]:
        """Get a type definition by name."""
        return self.type_registry.get(name)

    def find_dead_code(self) -> list[str]:
        """Find exported symbols with zero callers."""
        dead = []
        all_imported: set[str] = set()
        for state in self.files.values():
            for imp in state.imports:
                all_imported.add(imp.symbol)

        for state in self.files.values():
            # Skip index.ts barrel files
            if state.path.endswith("index.ts"):
                continue
            for exp in state.exports:
                if exp.name not in all_imported:
                    dead.append(f"{state.path}:{exp.name}")
        return dead

    def dependency_graph(self) -> dict[str, list[str]]:
        """Get module-level dependency graph."""
        deps: dict[str, set[str]] = {}
        for state in self.files.values():
            module = self._module_of(state.path)
            if module not in deps:
                deps[module] = set()
            for imp in state.imports:
                if imp.source.startswith("."):
                    # Resolve to module
                    target_mod = self._resolve_module(state.path, imp.source)
                    if target_mod and target_mod != module:
                        deps[module].add(target_mod)
        return {m: sorted(d) for m, d in deps.items()}

    def file_count(self) -> int:
        """Number of indexed files."""
        return len(self.files)

    def total_loc(self) -> int:
        """Total lines of code across all indexed files."""
        return sum(s.lines for s in self.files.values())

    # ── Internal methods ────────────────────────────────────

    def _parse_and_index(self, rel_path: str) -> None:
        """Parse a file and add to all indexes."""
        state = self._parse_file(rel_path)
        self.files[rel_path] = state
        self._update_type_registry(rel_path, state)
        self.export_map[rel_path] = state.export_names
        self.import_map[rel_path] = [imp.source for imp in state.imports]

    def _parse_file(self, rel_path: str) -> FileState:
        """Parse a TypeScript file into FileState."""
        abs_path = self.src_dir / rel_path
        try:
            code = abs_path.read_text(encoding="utf-8", errors="replace")
        except (OSError, IOError):
            return FileState(path=rel_path)

        lines = code.splitlines()
        state = FileState(path=rel_path, lines=len(lines))

        # Parse imports
        for m in _IMPORT_NAMED.finditer(code):
            names = [n.strip().split(" as ")[0].strip()
                     for n in m.group(1).split(",") if n.strip()]
            source = m.group(2)
            for name in names:
                state.imports.append(ImportDef(
                    symbol=name, source=source, kind="named",
                ))

        for m in _IMPORT_DEFAULT.finditer(code):
            name = m.group(1)
            source = m.group(2)
            state.imports.append(ImportDef(
                symbol=name, source=source, kind="default",
            ))

        # Parse exports
        for m in _EXPORT_DECL.finditer(code):
            kind = m.group(1)
            name = m.group(2)
            sig = Signature(name=name, kind=kind, line=code[:m.start()].count("\n") + 1)

            # Extract additional info based on kind
            if kind == "enum":
                sig.members = self._extract_enum_members(code, m.end())
            elif kind in ("class", "interface"):
                sig.fields = self._extract_fields(code, m.end())
                # Get methods too for the signature
                methods = self._extract_methods(code, name)
                sig.params = f"{len(methods)} methods"

            state.exports.append(sig)

        # Re-exports
        for m in _REEXPORT.finditer(code):
            names = [n.strip().split(" as ")[0].strip()
                     for n in m.group(1).split(",") if n.strip()]
            for name in names:
                state.exports.append(Signature(name=name, kind="re-export"))

        # Class extends info
        for m in _CLASS_RE.finditer(code):
            class_name = m.group(1)
            extends = m.group(2) or ""
            if extends:
                state.types_used.append(extends)

        # Collect type references
        for m in _TYPE_REF.finditer(code):
            name = m.group(1)
            if name not in _SKIP_NAMES and len(name) > 1:
                if name not in state.types_used:
                    state.types_used.append(name)

        # Compute signature hash
        sig_str = "|".join(
            f"{s.name}:{s.kind}:{s.params}:{s.return_type}"
            for s in state.exports
        )
        state.sig_hash = hashlib.sha256(sig_str.encode()).hexdigest()[:16]

        # Build type definitions
        for exp in state.exports:
            if exp.kind in ("class", "interface", "enum", "type"):
                td = TypeDef(
                    name=exp.name, kind=exp.kind, file=rel_path,
                    fields=exp.fields, members=exp.members,
                )
                # Get extends for classes
                for m in _CLASS_RE.finditer(code):
                    if m.group(1) == exp.name:
                        td.extends = m.group(2) or ""
                        break
                # Get method names
                td.methods = [m_name for m_name in self._extract_method_names(code, exp.name)]
                state.types_defined.append(td)

        return state

    def _extract_enum_members(self, code: str, start_pos: int) -> list[str]:
        """Extract enum member names."""
        remaining = code[start_pos:start_pos + 2000]
        depth = 1
        end = 0
        for i, ch in enumerate(remaining):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth <= 0:
                    end = i
                    break

        body = remaining[:end] if end else remaining[:500]
        members = []
        for line in body.splitlines():
            m = _ENUM_MEMBER.match(line)
            if m:
                name = m.group(1)
                if name and name not in _SKIP_NAMES and not name.startswith("//"):
                    members.append(name)
        return members

    def _extract_fields(self, code: str, start_pos: int) -> list[tuple[str, str]]:
        """Extract field declarations from a class/interface body."""
        remaining = code[start_pos:start_pos + 3000]
        fields = []
        for m in _FIELD_RE.finditer(remaining[:1500]):  # fields are near top
            name = m.group(1)
            ftype = m.group(2).strip() if m.group(2) else ""
            if name and name not in _SKIP_NAMES:
                fields.append((name, ftype))
        return fields

    def _extract_methods(self, code: str, class_name: str) -> list[str]:
        """Extract method names from a class."""
        return list(self._extract_method_names(code, class_name))

    def _extract_method_names(self, code: str, class_name: str) -> list[str]:
        """Yield method names from a class body."""
        # Find class body start
        pattern = re.compile(
            rf"(?:export\s+)?(?:abstract\s+)?class\s+{re.escape(class_name)}\b[^{{]*\{{",
            re.MULTILINE,
        )
        m = pattern.search(code)
        if not m:
            return []

        # Find matching brace
        start = m.end()
        depth = 1
        end = start
        for i in range(start, min(len(code), start + 20000)):
            if code[i] == "{":
                depth += 1
            elif code[i] == "}":
                depth -= 1
                if depth <= 0:
                    end = i
                    break

        body = code[start:end]
        names = []
        for mm in _METHOD_RE.finditer(body):
            name = mm.group(1)
            if name not in _SKIP_NAMES and name != "constructor":
                names.append(name)
        return names

    def _update_type_registry(self, path: str, state: FileState) -> None:
        """Update type registry from a file's parsed state."""
        # Remove old types from this file
        to_remove = [n for n, t in self.type_registry.items() if t.file == path]
        for n in to_remove:
            del self.type_registry[n]

        # Add new types
        for td in state.types_defined:
            self.type_registry[td.name] = td

    def _rebuild_all_graphs(self) -> None:
        """Rebuild call and reverse graphs from scratch."""
        self.call_graph.clear()
        self.reverse_graph.clear()

        for state in self.files.values():
            self._rebuild_graphs_for(state.path)

    def _rebuild_graphs_for(self, path: str) -> None:
        """Rebuild graph edges for one file."""
        state = self.files.get(path)
        if not state:
            return

        # Clear old edges from this file
        for key in list(self.call_graph.keys()):
            if key.startswith(f"{path}:"):
                del self.call_graph[key]

        for key in list(self.reverse_graph.keys()):
            self.reverse_graph[key].discard(path)

        # Build edges: this file imports symbol → create edge
        for imp in state.imports:
            if not imp.source.startswith("."):
                continue
            target_file = self._resolve_file(path, imp.source)
            if target_file and target_file in self.files:
                key = f"{target_file}:{imp.symbol}"
                if key not in self.reverse_graph:
                    self.reverse_graph[key] = set()
                self.reverse_graph[key].add(path)

    def _resolve_file(self, from_path: str, import_source: str) -> Optional[str]:
        """Resolve a relative import to a file path."""
        import os
        from_dir = str(Path(from_path).parent)
        resolved = os.path.normpath(os.path.join(from_dir, import_source))
        resolved = resolved.replace("\\", "/")

        candidates = [f"{resolved}.ts", f"{resolved}/index.ts"]
        for cand in candidates:
            if cand in self.files:
                return cand
        return None

    def _remove_file(self, path: str) -> list[Issue]:
        """Remove a file from the index and return breaking issues."""
        issues = []
        state = self.files.get(path)
        if not state:
            return issues

        for exp in state.exports:
            key = f"{path}:{exp.name}"
            callers = self.reverse_graph.get(key, set())
            if callers:
                issues.append(Issue(
                    kind="breaking_removal",
                    message=f"Deleted {path} breaks {exp.name} used by: {', '.join(callers)}",
                    file=path,
                ))

        # Clean up
        del self.files[path]
        self.export_map.pop(path, None)
        self.import_map.pop(path, None)

        # Remove from type registry
        to_remove = [n for n, t in self.type_registry.items() if t.file == path]
        for n in to_remove:
            del self.type_registry[n]

        # Remove from graphs
        for key in list(self.call_graph.keys()):
            if key.startswith(f"{path}:"):
                del self.call_graph[key]
        for key in list(self.reverse_graph.keys()):
            self.reverse_graph[key].discard(path)

        return issues

    def _module_of(self, path: str) -> str:
        """Get module name from file path: 'cpu/decoder.ts' → 'cpu'."""
        parts = Path(path).parts
        return parts[0] if len(parts) > 1 else "_root"

    def _resolve_module(self, from_path: str, import_source: str) -> Optional[str]:
        """Resolve an import source to a module name."""
        target = self._resolve_file(from_path, import_source)
        if target:
            return self._module_of(target)
        return None
