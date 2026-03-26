"""
ContextBuilder — generates compact, role-specific snapshots from LiveIndex.

Each consumer gets exactly the context it needs:
  - Blueprint generator: project structure + reference patterns + rules
  - Translator: exact import paths + signatures of dependencies
  - Fix loop: error context + type definitions + callers
  - Agent/Supervisor: compact project summary
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .index import LiveIndex, TypeDef


class ContextBuilder:
    """Builds role-specific context snapshots from a LiveIndex."""

    def for_blueprint(self, task_name: str, task_types: list[str],
                      depends_on: list[str], index: "LiveIndex",
                      reference_context: str = "") -> str:
        """Snapshot for blueprint generation.

        Shows: file map, dependency types with signatures, reference patterns, rules.
        Budget: ~800-1200 tokens.
        """
        parts = ["## Project state (auto-generated)\n"]

        # File map
        file_entries = []
        for path, state in sorted(index.files.items()):
            file_entries.append(f"{path} ({state.lines})")
        if file_entries:
            parts.append(f"Files: {', '.join(file_entries[:30])}")

        # Dependency graph
        dep_graph = index.dependency_graph()
        if dep_graph:
            dep_strs = []
            for mod, deps in dep_graph.items():
                if deps:
                    dep_strs.append(f"{mod} → {', '.join(deps)}")
            if dep_strs:
                parts.append(f"Deps: {'; '.join(dep_strs[:15])}")

        # Available types
        type_strs = []
        for name, td in sorted(index.type_registry.items()):
            field_str = ", ".join(f"{fn}" for fn, ft in td.fields[:5])
            if td.members:
                field_str = ", ".join(td.members[:5])
            type_strs.append(f"{name}{{{field_str}}}" if field_str else name)
        if type_strs:
            parts.append(f"Types: {', '.join(type_strs[:20])}")

        # Task info
        parts.append(f"\n## Your task: src/{task_name}/")
        parts.append(f"Types to generate: {', '.join(task_types)}")

        # Dependency signatures
        if depends_on:
            parts.append(f"Depends on modules: {', '.join(depends_on)}")
            sigs = self._signatures_for_modules(depends_on, index)
            if sigs:
                parts.append("\n## Available signatures")
                parts.extend(sigs[:30])

        # Reference context (from EmissionIndex, already formatted)
        if reference_context:
            parts.append(f"\n## Reference patterns\n{reference_context[:1500]}")

        return "\n".join(parts)

    def for_translator(self, type_name: str, module_name: str,
                       depends_on: list[str], index: "LiveIndex") -> str:
        """Snapshot for type translation.

        Shows: exact import paths, dependency signatures with resolved paths.
        Budget: ~500-800 tokens.
        """
        parts = [f"## Translating: {type_name} → src/{module_name}/{self._kebab(type_name)}.ts\n"]

        # Collect imports needed from dependencies
        import_lines = []
        sig_lines = []

        seen_names: set[str] = set()

        for dep_mod in depends_on:
            dep_exports = self._module_exports(dep_mod, index)
            if dep_exports:
                unique = [e for e in dep_exports
                          if e.name not in seen_names and e.kind != "re-export"]
                names = []
                for e in unique:
                    if e.name not in seen_names:
                        names.append(e.name)
                        seen_names.add(e.name)
                if names:
                    import_lines.append(
                        f"import {{ {', '.join(names)} }} from '../{dep_mod}'"
                    )
                for exp in unique:
                    sig_line = self._format_signature(exp, dep_mod, index)
                    if sig_line and sig_line not in sig_lines:
                        sig_lines.append(sig_line)

        # Same-module types already generated
        same_module = self._module_exports(module_name, index)
        if same_module:
            for exp in same_module:
                if exp.name in seen_names or exp.kind == "re-export":
                    continue
                seen_names.add(exp.name)
                import_lines.append(
                    f"import {{ {exp.name} }} from './{self._kebab(exp.name)}'"
                )
                sig_line = self._format_signature(exp, module_name, index)
                if sig_line and sig_line not in sig_lines:
                    sig_lines.append(sig_line)

        if import_lines:
            parts.append("## Import paths (exact)")
            parts.extend(import_lines)

        if sig_lines:
            parts.append("\n## Signatures")
            parts.extend(sig_lines)

        return "\n".join(parts)

    def for_fix(self, error_file: str, error_line: int,
                error_code: str, error_message: str,
                index: "LiveIndex") -> str:
        """Snapshot for compile-fix loop.

        Shows: error context, involved type definitions, callers.
        Budget: ~300-500 tokens.
        """
        parts = [f"## TSC error: {error_file}:{error_line} {error_code} {error_message}\n"]

        # Extract code around error
        state = index.files.get(error_file)
        if state:
            abs_path = index.src_dir / error_file
            if abs_path.exists():
                try:
                    lines = abs_path.read_text().splitlines()
                    start = max(0, error_line - 5)
                    end = min(len(lines), error_line + 5)
                    code_snippet = "\n".join(
                        f"{'→' if i + 1 == error_line else ' '} {i + 1}: {lines[i]}"
                        for i in range(start, end)
                    )
                    parts.append(f"## Code at lines {start + 1}-{end}")
                    parts.append(code_snippet)
                except Exception:
                    pass

        # Find type references in error message
        import re
        type_refs = re.findall(r"'(\w+)'", error_message)
        for ref in type_refs:
            td = index.get_type(ref)
            if td:
                parts.append(f"\n## {ref} definition (from index)")
                parts.append(self._format_type_def(td))
                parts.append(f"Defined in: {td.file}")

                callers = index.get_callers(ref)
                if callers:
                    parts.append(f"Used by: {', '.join(callers[:5])}")

        return "\n".join(parts)

    def for_agent(self, query: str, index: "LiveIndex") -> str:
        """Snapshot for agent/supervisor interactive queries.

        Shows: project overview, module structure, key types.
        Budget: ~600-1000 tokens.
        """
        parts = ["## Project overview\n"]

        # Stats
        parts.append(
            f"Files: {index.file_count()}, "
            f"LOC: {index.total_loc()}, "
            f"Types: {len(index.type_registry)}"
        )

        # Module structure
        dep_graph = index.dependency_graph()
        if dep_graph:
            parts.append("\n## Modules")
            for mod, deps in sorted(dep_graph.items()):
                mod_files = [p for p in index.files if self._module_of(p) == mod]
                mod_loc = sum(index.files[p].lines for p in mod_files)
                dep_str = f" → {', '.join(deps)}" if deps else ""
                parts.append(f"  {mod}: {len(mod_files)} files, {mod_loc} LOC{dep_str}")

        # Key types (with fields summary)
        if index.type_registry:
            parts.append("\n## Types")
            for name, td in sorted(index.type_registry.items()):
                detail = ""
                if td.fields:
                    field_names = [f[0] for f in td.fields[:4]]
                    detail = f" {{{', '.join(field_names)}}}"
                elif td.members:
                    detail = f" [{', '.join(td.members[:4])}]"
                elif td.methods:
                    detail = f" ({', '.join(td.methods[:4])})"
                parts.append(f"  {name} [{td.kind}]{detail} ← {td.file}")

        # Dead code warning
        dead = index.find_dead_code()
        if dead:
            parts.append(f"\n## Warnings: {len(dead)} potentially unused exports")
            for d in dead[:5]:
                parts.append(f"  - {d}")

        return "\n".join(parts)

    def compact_summary(self, index: "LiveIndex") -> str:
        """Ultra-compact project summary for budget decisions. ~200 tokens."""
        modules = {}
        for path, state in index.files.items():
            mod = self._module_of(path)
            if mod not in modules:
                modules[mod] = {"files": 0, "loc": 0, "types": 0}
            modules[mod]["files"] += 1
            modules[mod]["loc"] += state.lines
            modules[mod]["types"] += len(state.types_defined)

        lines = [f"Project: {index.file_count()} files, {index.total_loc()} LOC"]
        for mod, stats in sorted(modules.items()):
            lines.append(f"  {mod}: {stats['files']}f {stats['loc']}loc {stats['types']}t")
        return "\n".join(lines)

    # ── Helpers ──────────────────────────────────────────────

    def _signatures_for_modules(self, modules: list[str],
                                index: "LiveIndex") -> list[str]:
        """Get formatted signatures for types in given modules."""
        lines = []
        for mod in modules:
            for name, td in index.type_registry.items():
                if self._module_of(td.file) == mod:
                    sig = self._format_type_def(td)
                    if sig:
                        lines.append(sig)
        return lines

    def _module_exports(self, module: str, index: "LiveIndex") -> list:
        """Get all export Signatures for a module."""
        exports = []
        for path, state in index.files.items():
            if self._module_of(path) == module:
                exports.extend(state.exports)
        return exports

    def _format_signature(self, sig, module: str, index: "LiveIndex") -> str:
        """Format a Signature for context display."""
        td = index.get_type(sig.name)
        if td:
            return self._format_type_def(td)
        return f"{sig.name} [{sig.kind}]"

    def _format_type_def(self, td: "TypeDef") -> str:
        """Format a TypeDef for display."""
        if td.kind == "enum":
            members = ", ".join(td.members[:8])
            return f"enum {td.name} {{ {members} }}"
        elif td.kind in ("interface", "class"):
            parts = []
            for fn, ft in td.fields[:6]:
                parts.append(f"{fn}: {ft}")
            for mn in td.methods[:6]:
                parts.append(f"{mn}()")
            inner = ", ".join(parts)
            extends = f" extends {td.extends}" if td.extends else ""
            return f"{td.kind} {td.name}{extends} {{ {inner} }}"
        elif td.kind == "type":
            return f"type {td.name}"
        return f"{td.name} [{td.kind}]"

    def _kebab(self, name: str) -> str:
        """PascalCase → kebab-case."""
        import re
        s = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", name)
        s = re.sub(r"([A-Z]{2,})([A-Z][a-z])", r"\1-\2", s)
        return s.lower()

    def _module_of(self, path: str) -> str:
        """Get module name from path."""
        from pathlib import Path as P
        parts = P(path).parts
        return parts[0] if len(parts) > 1 else "_root"
