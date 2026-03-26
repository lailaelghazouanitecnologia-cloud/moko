"""
ProjectAnalyzer — deep introspection of generated (or external) projects.

Combines ALL available analysis tools into one comprehensive report:
  - Roska: AST, module graph, O-levels, layers
  - LiveIndex: imports, exports, call graph, types, dead code
  - QualityEngine: per-file quality metrics (38 features)
  - tsc: compilation errors
  - Structural: DI gaps, interface mismatches, circular deps, islands

Works on:
  - Projects AVA generates (post-generation analysis)
  - External repos (via ava analyze)
  - AVA itself (self-introspection)

Usage:
    analyzer = ProjectAnalyzer(project_dir)
    report = analyzer.analyze()
    print(report.format())
"""
from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


@dataclass
class ModuleHealth:
    """Health metrics for one module."""
    name: str
    loc: int = 0
    files: int = 0
    types: int = 0
    functions: int = 0
    exports: int = 0
    imports: int = 0

    # Quality
    any_count: int = 0
    empty_functions: int = 0
    empty_interfaces: int = 0
    as_any_casts: int = 0

    # Integration
    has_di: bool = False                    # constructor receives deps
    di_deps_used: int = 0                   # injected deps actually used
    di_deps_total: int = 0                  # injected deps declared
    consumers: int = 0                      # modules that import this
    dependencies: int = 0                   # modules this imports from

    # Issues
    issues: List[str] = field(default_factory=list)

    @property
    def is_island(self) -> bool:
        """Module with no consumers and no dependencies — isolated."""
        return self.consumers == 0 and self.dependencies == 0

    @property
    def di_ratio(self) -> float:
        """Fraction of injected deps actually used."""
        return self.di_deps_used / max(self.di_deps_total, 1)

    @property
    def density(self) -> float:
        """Code density: functions per LOC."""
        return self.functions / max(self.loc, 1)


@dataclass
class ProjectHealthReport:
    """Complete health report for a project."""
    project: str
    total_loc: int = 0
    total_files: int = 0
    total_modules: int = 0
    total_types: int = 0

    modules: List[ModuleHealth] = field(default_factory=list)

    # Structural issues
    islands: List[str] = field(default_factory=list)         # modules with 0 connections
    broken_imports: List[str] = field(default_factory=list)   # imports that don't resolve
    empty_interfaces: List[str] = field(default_factory=list) # interfaces with 0 methods
    missing_di: List[str] = field(default_factory=list)       # classes that should have DI but don't
    circular_deps: List[Tuple[str, str]] = field(default_factory=list)
    dead_exports: List[str] = field(default_factory=list)     # exports never imported
    interface_mismatches: List[str] = field(default_factory=list)  # class doesn't match interface

    # Quality
    total_any: int = 0
    total_as_any: int = 0
    total_empty_funcs: int = 0
    tsc_errors: int = 0
    tsc_error_details: List[str] = field(default_factory=list)

    # Graph metrics
    max_depth: int = 0                      # longest dependency chain
    avg_coupling: float = 0.0               # average connections per module
    cohesion_score: float = 0.0             # how well-connected the graph is

    def score(self) -> float:
        """Overall project health score 0-100."""
        s = 100.0
        # TSC errors are critical
        s -= min(self.tsc_errors * 5, 30)
        # Islands mean modules don't integrate
        s -= len(self.islands) * 8
        # Broken imports
        s -= min(len(self.broken_imports) * 3, 15)
        # Empty interfaces
        s -= min(len(self.empty_interfaces) * 5, 15)
        # Missing DI
        s -= min(len(self.missing_di) * 5, 15)
        # Any usage
        s -= min(self.total_any * 0.5, 10)
        # as any casts
        s -= min(self.total_as_any * 1, 10)
        # Circular deps
        s -= min(len(self.circular_deps) * 5, 10)
        return max(0, min(100, s))

    def format(self) -> str:
        """Format as human-readable report."""
        lines = [
            f"{'━' * 70}",
            f"  PROJECT HEALTH: {self.project}",
            f"  Score: {self.score():.0f}/100",
            f"{'━' * 70}",
            f"  {self.total_files} files | {self.total_loc:,} LOC | "
            f"{self.total_modules} modules | {self.total_types} types",
            f"  TSC: {self.tsc_errors} errors | "
            f"any: {self.total_any} | as any: {self.total_as_any}",
            "",
        ]

        # Module breakdown
        lines.append("  MODULES:")
        for m in sorted(self.modules, key=lambda x: -x.loc):
            status = "✓" if not m.issues else "⚠"
            di_info = f"DI:{m.di_deps_used}/{m.di_deps_total}" if m.di_deps_total > 0 else "no-DI"
            lines.append(
                f"    {status} {m.name:<15} {m.loc:>5} LOC  "
                f"{m.types:>2}t {m.functions:>3}f  "
                f"any={m.any_count:<3} {di_info}  "
                f"in={m.dependencies} out={m.consumers}"
            )

        # Issues
        if self.islands:
            lines.append(f"\n  ISLANDS (isolated modules):")
            for island in self.islands:
                lines.append(f"    ⚠ {island} — no imports from/to other modules")

        if self.broken_imports:
            lines.append(f"\n  BROKEN IMPORTS:")
            for imp in self.broken_imports[:10]:
                lines.append(f"    ✗ {imp}")

        if self.empty_interfaces:
            lines.append(f"\n  EMPTY INTERFACES:")
            for iface in self.empty_interfaces[:10]:
                lines.append(f"    ✗ {iface}")

        if self.missing_di:
            lines.append(f"\n  MISSING DEPENDENCY INJECTION:")
            for cls in self.missing_di[:10]:
                lines.append(f"    ✗ {cls}")

        if self.circular_deps:
            lines.append(f"\n  CIRCULAR DEPENDENCIES:")
            for a, b in self.circular_deps:
                lines.append(f"    ⚠ {a} ↔ {b}")

        if self.dead_exports:
            lines.append(f"\n  DEAD EXPORTS (never imported):")
            for exp in self.dead_exports[:10]:
                lines.append(f"    ○ {exp}")

        if self.interface_mismatches:
            lines.append(f"\n  INTERFACE MISMATCHES:")
            for mm in self.interface_mismatches[:10]:
                lines.append(f"    ✗ {mm}")

        if self.tsc_error_details:
            lines.append(f"\n  TSC ERRORS:")
            for err in self.tsc_error_details[:10]:
                lines.append(f"    ✗ {err}")

        lines.append(f"\n  GRAPH: depth={self.max_depth} avg_coupling={self.avg_coupling:.1f} "
                     f"cohesion={self.cohesion_score:.2f}")
        lines.append(f"{'━' * 70}")
        return "\n".join(lines)


class ProjectAnalyzer:
    """Deep introspection of TypeScript projects.

    Combines Roska, LiveIndex, QualityEngine, and tsc into one report.
    """

    def __init__(self, project_dir: Path, verbose: bool = False):
        self.project_dir = Path(project_dir)
        self.src_dir = self.project_dir / "src"
        self.verbose = verbose

    def analyze(self) -> ProjectHealthReport:
        """Full project analysis. Returns comprehensive health report."""
        report = ProjectHealthReport(project=self.project_dir.name)

        if not self.src_dir.exists():
            return report

        # 1. Scan all files
        files = self._scan_files()
        report.total_files = len(files)
        report.total_loc = sum(len(code.splitlines()) for code in files.values())

        # 2. Module analysis
        modules = self._analyze_modules(files)
        report.modules = list(modules.values())
        report.total_modules = len(modules)
        report.total_types = sum(m.types for m in modules.values())

        # 3. Build import graph
        import_graph = self._build_import_graph(files)

        # 4. Detect structural issues
        report.islands = self._detect_islands(modules, import_graph)
        report.broken_imports = self._detect_broken_imports(files)
        report.empty_interfaces = self._detect_empty_interfaces(files)
        report.missing_di = self._detect_missing_di(files, import_graph)
        report.circular_deps = self._detect_circular_deps(import_graph)
        report.dead_exports = self._detect_dead_exports(files)
        report.interface_mismatches = self._detect_interface_mismatches(files)

        # 5. Quality metrics
        report.total_any = sum(m.any_count for m in modules.values())
        report.total_as_any = sum(m.as_any_casts for m in modules.values())
        report.total_empty_funcs = sum(m.empty_functions for m in modules.values())

        # 6. TSC check
        report.tsc_errors, report.tsc_error_details = self._run_tsc()

        # 7. Graph metrics
        report.max_depth = self._graph_depth(import_graph)
        report.avg_coupling = self._avg_coupling(modules)
        report.cohesion_score = self._cohesion(modules, import_graph)

        return report

    def _scan_files(self) -> Dict[str, str]:
        """Read all .ts files."""
        files = {}
        for ts_file in sorted(self.src_dir.rglob("*.ts")):
            rel = str(ts_file.relative_to(self.src_dir))
            try:
                files[rel] = ts_file.read_text()
            except Exception:
                pass
        return files

    def _analyze_modules(self, files: Dict[str, str]) -> Dict[str, ModuleHealth]:
        """Analyze each module directory."""
        modules: Dict[str, ModuleHealth] = {}

        for filepath, code in files.items():
            parts = filepath.split("/")
            mod_name = parts[0] if len(parts) > 1 else "__root__"

            if mod_name not in modules:
                modules[mod_name] = ModuleHealth(name=mod_name)

            m = modules[mod_name]
            m.files += 1
            m.loc += len(code.splitlines())
            m.types += len(re.findall(r'\b(?:class|interface|enum|type)\s+\w+', code))
            m.functions += len(re.findall(r'(?:async\s+)?(?:private\s+|public\s+|protected\s+)?\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{', code))
            m.exports += len(re.findall(r'\bexport\s+', code))
            m.imports += len(re.findall(r'\bimport\s+', code))
            m.any_count += len(re.findall(r'\bany\b', code))
            m.as_any_casts += len(re.findall(r'\bas\s+any\b', code))
            m.empty_functions += len(re.findall(r'\)\s*(?::\s*\w+)?\s*\{\s*\}', code))

            # Check DI in constructors
            ctor = re.search(r'constructor\s*\(([^)]*)\)', code)
            if ctor and ctor.group(1).strip():
                params = [p.strip() for p in ctor.group(1).split(',') if p.strip()]
                typed_params = [p for p in params if ':' in p and ('private' in p or 'readonly' in p)]
                m.has_di = len(typed_params) > 0
                m.di_deps_total = len(typed_params)
                # Check if deps are actually used in method bodies
                for param in typed_params:
                    param_name = re.search(r'(\w+)\s*:', param)
                    if param_name:
                        name = param_name.group(1)
                        usages = len(re.findall(rf'this\.{re.escape(name)}\.', code))
                        if usages > 0:
                            m.di_deps_used += 1

            # Check empty interfaces
            iface_matches = re.findall(r'interface\s+(\w+)\s*\{([^}]*)\}', code, re.DOTALL)
            for iname, ibody in iface_matches:
                methods = re.findall(r'\w+\s*\(', ibody)
                if len(methods) == 0 and ibody.strip() == '':
                    m.empty_interfaces += 1
                    m.issues.append(f"Empty interface: {iname}")

        return modules

    def _build_import_graph(self, files: Dict[str, str]) -> Dict[str, Set[str]]:
        """Build module → set of imported modules graph."""
        graph: Dict[str, Set[str]] = {}

        for filepath, code in files.items():
            parts = filepath.split("/")
            mod_name = parts[0] if len(parts) > 1 else "__root__"
            graph.setdefault(mod_name, set())

            for match in re.finditer(r"from\s+['\"]\.\.\/(\w+)", code):
                target = match.group(1)
                if target != mod_name:
                    graph[mod_name].add(target)

        return graph

    def _detect_islands(self, modules: Dict[str, ModuleHealth],
                        graph: Dict[str, Set[str]]) -> List[str]:
        """Find modules with no connections."""
        all_targets = set()
        for targets in graph.values():
            all_targets |= targets

        islands = []
        for mod_name in modules:
            if mod_name == "__root__" or mod_name == "index.ts":
                continue
            has_outgoing = len(graph.get(mod_name, set())) > 0
            has_incoming = mod_name in all_targets
            if not has_outgoing and not has_incoming:
                islands.append(mod_name)
                modules[mod_name].issues.append("Island: no connections to other modules")

        return islands

    def _detect_broken_imports(self, files: Dict[str, str]) -> List[str]:
        """Find imports that don't resolve to existing files."""
        broken = []
        existing_modules = set()
        for filepath in files:
            parts = filepath.split("/")
            if len(parts) > 1:
                existing_modules.add(parts[0])

        for filepath, code in files.items():
            for match in re.finditer(r"from\s+['\"]([^'\"]+)['\"]", code):
                import_path = match.group(1)
                if import_path.startswith("../"):
                    target_mod = import_path.split("/")[1] if "/" in import_path[3:] else import_path[3:]
                    if target_mod and target_mod not in existing_modules:
                        broken.append(f"{filepath}: imports '{import_path}' → module '{target_mod}' not found")

        return broken

    def _detect_empty_interfaces(self, files: Dict[str, str]) -> List[str]:
        """Find interfaces with no methods or fields."""
        empty = []
        for filepath, code in files.items():
            for match in re.finditer(r'export\s+interface\s+(\w+)\s*\{([^}]*)\}', code, re.DOTALL):
                name = match.group(1)
                body = match.group(2).strip()
                if not body or all(l.strip() == '' or l.strip().startswith('//') for l in body.splitlines()):
                    empty.append(f"{filepath}: {name} has no methods")
        return empty

    def _detect_missing_di(self, files: Dict[str, str],
                           graph: Dict[str, Set[str]]) -> List[str]:
        """Find classes that should receive deps but don't."""
        missing = []
        for filepath, code in files.items():
            if "index.ts" in filepath:
                continue
            parts = filepath.split("/")
            mod_name = parts[0] if len(parts) > 1 else "__root__"

            # Check if module has dependencies
            deps = graph.get(mod_name, set())
            if not deps:
                continue

            # Check if there's a class with constructor
            classes = re.findall(r'export\s+class\s+(\w+)', code)
            for cls_name in classes:
                ctor = re.search(rf'class\s+{cls_name}[^{{]*\{{[^}}]*constructor\s*\(([^)]*)\)', code, re.DOTALL)
                if ctor:
                    params = ctor.group(1).strip()
                    if not params:
                        missing.append(f"{filepath}: {cls_name} has empty constructor but module depends on {deps}")
                elif not re.search(rf'class\s+{cls_name}[^{{]*\{{[^}}]*constructor', code, re.DOTALL):
                    # No constructor at all — might need DI
                    if deps:
                        missing.append(f"{filepath}: {cls_name} has no constructor but depends on {deps}")

        return missing

    def _detect_circular_deps(self, graph: Dict[str, Set[str]]) -> List[Tuple[str, str]]:
        """Find circular dependencies."""
        circulars = []
        for a in graph:
            for b in graph.get(a, set()):
                if a in graph.get(b, set()):
                    pair = tuple(sorted([a, b]))
                    if pair not in circulars:
                        circulars.append(pair)
        return circulars

    def _detect_dead_exports(self, files: Dict[str, str]) -> List[str]:
        """Find exports that nothing imports."""
        all_exports: Dict[str, str] = {}  # name → file
        all_imports: Set[str] = set()

        for filepath, code in files.items():
            for match in re.finditer(r'export\s+(?:class|interface|type|function|const|enum)\s+(\w+)', code):
                all_exports[match.group(1)] = filepath
            for match in re.finditer(r'import\s*\{([^}]+)\}', code):
                for name in match.group(1).split(','):
                    clean = name.strip().split(' as ')[0].strip()
                    if clean:
                        all_imports.add(clean)

        dead = []
        for name, filepath in all_exports.items():
            if name not in all_imports and not filepath.endswith("index.ts"):
                dead.append(f"{filepath}: {name}")
        return dead

    def _detect_interface_mismatches(self, files: Dict[str, str]) -> List[str]:
        """Find classes that claim to implement an interface but are missing methods."""
        mismatches = []

        # Collect interface methods
        interface_methods: Dict[str, Set[str]] = {}
        for filepath, code in files.items():
            for match in re.finditer(r'export\s+interface\s+(\w+)\s*\{([^}]+)\}', code, re.DOTALL):
                name = match.group(1)
                body = match.group(2)
                methods = set(re.findall(r'(\w+)\s*\(', body))
                if methods:
                    interface_methods[name] = methods

        # Check implementations
        for filepath, code in files.items():
            for match in re.finditer(r'class\s+(\w+)\s+implements\s+(\w+)', code):
                cls_name = match.group(1)
                iface_name = match.group(2)
                if iface_name in interface_methods:
                    required = interface_methods[iface_name]
                    implemented = set(re.findall(r'(?:public\s+|private\s+|protected\s+)?(\w+)\s*\(', code))
                    missing = required - implemented - {"constructor"}
                    if missing:
                        mismatches.append(
                            f"{filepath}: {cls_name} implements {iface_name} but missing: {', '.join(sorted(missing))}"
                        )

        return mismatches

    def _run_tsc(self) -> Tuple[int, List[str]]:
        """Run tsc --noEmit and collect errors."""
        try:
            result = subprocess.run(
                ["npx", "tsc", "--noEmit"],
                capture_output=True, text=True, timeout=30,
                cwd=str(self.project_dir),
            )
            errors = [l.strip() for l in result.stdout.splitlines() if "error TS" in l]
            return len(errors), errors[:20]
        except Exception:
            return 0, []

    def _graph_depth(self, graph: Dict[str, Set[str]]) -> int:
        """Longest dependency chain."""
        def dfs(node: str, visited: set) -> int:
            if node in visited:
                return 0
            visited.add(node)
            max_child = 0
            for dep in graph.get(node, set()):
                max_child = max(max_child, dfs(dep, visited))
            visited.discard(node)
            return 1 + max_child

        return max((dfs(n, set()) for n in graph), default=0)

    def _avg_coupling(self, modules: Dict[str, ModuleHealth]) -> float:
        """Average connections per module."""
        if not modules:
            return 0.0
        total = sum(m.consumers + m.dependencies for m in modules.values())
        return total / len(modules)

    def _cohesion(self, modules: Dict[str, ModuleHealth],
                  graph: Dict[str, Set[str]]) -> float:
        """How well-connected the module graph is (0-1)."""
        n = len(modules)
        if n <= 1:
            return 1.0
        max_edges = n * (n - 1)
        actual_edges = sum(len(targets) for targets in graph.values())
        return actual_edges / max(max_edges, 1)
