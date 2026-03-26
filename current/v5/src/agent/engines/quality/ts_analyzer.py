"""
TypeScript Static Analyzer — lightweight code analysis without external AST parsers.

Uses regex + bracket matching to extract rich metrics:
  - Function/class parsing with body extraction
  - Cognitive complexity (SonarQube-style)
  - Nesting depth analysis
  - Coupling and cohesion measurement
  - Duplicate block detection
  - Parameter and return analysis

No external dependencies — pure Python regex + string ops.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple


# ── Data Models ──────────────────────────────────────────────────────

@dataclass
class FunctionInfo:
    name: str
    kind: str  # "method", "function", "arrow", "constructor"
    start_line: int
    end_line: int
    body: str
    params: List[str]
    return_type: str
    is_public: bool
    is_async: bool
    is_static: bool
    class_name: str = ""

    @property
    def loc(self) -> int:
        return self.end_line - self.start_line + 1

    @property
    def param_count(self) -> int:
        return len(self.params)


@dataclass
class ClassInfo:
    name: str
    start_line: int
    end_line: int
    body: str
    methods: List[FunctionInfo] = field(default_factory=list)
    fields: List[str] = field(default_factory=list)
    private_fields: List[str] = field(default_factory=list)
    implements: List[str] = field(default_factory=list)
    extends: str = ""

    @property
    def loc(self) -> int:
        return self.end_line - self.start_line + 1

    @property
    def method_count(self) -> int:
        return len(self.methods)


@dataclass
class ImportInfo:
    source: str  # "../core" or "fs"
    names: List[str]  # ["Config", "Result"]
    is_relative: bool


@dataclass
class NestingMetrics:
    max_depth: int = 0
    avg_depth: float = 0.0
    deep_nesting_count: int = 0  # blocks nested > 3 levels


@dataclass
class CouplingMetrics:
    afferent: Dict[str, int] = field(default_factory=dict)  # module → fan-in
    efferent: Dict[str, int] = field(default_factory=dict)  # module → fan-out
    instability: Dict[str, float] = field(default_factory=dict)
    max_depth: int = 0
    circular_count: int = 0


@dataclass
class DuplicateMetrics:
    duplicate_block_count: int = 0
    total_block_count: int = 0
    duplicate_line_count: int = 0

    @property
    def ratio(self) -> float:
        return self.duplicate_block_count / max(self.total_block_count, 1)


@dataclass
class AnalysisResult:
    """Complete analysis of a set of TypeScript files."""
    functions: List[FunctionInfo] = field(default_factory=list)
    classes: List[ClassInfo] = field(default_factory=list)
    imports_by_file: Dict[str, List[ImportInfo]] = field(default_factory=dict)
    nesting: NestingMetrics = field(default_factory=NestingMetrics)
    coupling: CouplingMetrics = field(default_factory=CouplingMetrics)
    duplicates: DuplicateMetrics = field(default_factory=DuplicateMetrics)
    total_loc: int = 0
    total_files: int = 0


# ── Analyzer ─────────────────────────────────────────────────────────

class TypeScriptAnalyzer:
    """Lightweight TypeScript static analysis for rich metrics."""

    def analyze(self, files: Dict[str, str]) -> AnalysisResult:
        """Full analysis of a set of files."""
        result = AnalysisResult()
        result.total_files = len(files)

        all_nesting_depths: List[int] = []

        for filename, code in files.items():
            lines = code.split("\n")
            loc = len([l for l in lines if l.strip() and not l.strip().startswith("//")])
            if loc < 3:
                continue
            result.total_loc += loc

            # Parse structures
            classes = self.parse_classes(code)
            functions = self.parse_functions(code)
            imports = self.parse_imports(code)

            # Tag methods with class names
            for cls in classes:
                for method in cls.methods:
                    method.class_name = cls.name

            result.classes.extend(classes)
            result.functions.extend(functions)
            result.imports_by_file[filename] = imports

            # Nesting
            depths = self._nesting_depths(code)
            all_nesting_depths.extend(depths)

        # Aggregate nesting
        if all_nesting_depths:
            result.nesting.max_depth = max(all_nesting_depths)
            result.nesting.avg_depth = sum(all_nesting_depths) / len(all_nesting_depths)
            result.nesting.deep_nesting_count = sum(1 for d in all_nesting_depths if d > 3)

        # Coupling analysis
        result.coupling = self.coupling_analysis(files)

        # Duplicate detection
        result.duplicates = self.duplicate_detection(files)

        return result

    # ── Function Parsing ─────────────────────────────────────────

    def parse_functions(self, code: str) -> List[FunctionInfo]:
        """Extract all functions/methods from code."""
        functions: List[FunctionInfo] = []
        lines = code.split("\n")

        # Match method/function declarations
        patterns = [
            # class method: async? static? private/public/protected? name(params): RetType {
            re.compile(
                r"^(\s*)(async\s+)?(static\s+)?(private|public|protected)?\s*"
                r"(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+?))?\s*\{",
            ),
            # standalone function: export? async? function name(params): RetType {
            re.compile(
                r"^(\s*)(export\s+)?(async\s+)?function\s+"
                r"(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)\s*(?::\s*([^{]+?))?\s*\{",
            ),
            # constructor
            re.compile(
                r"^(\s*)(constructor)\s*\(([^)]*)\)\s*\{",
            ),
        ]

        i = 0
        while i < len(lines):
            line = lines[i]

            for pat_idx, pat in enumerate(patterns):
                m = pat.match(line)
                if not m:
                    continue

                if pat_idx == 0:  # class method
                    is_async = bool(m.group(2))
                    is_static = bool(m.group(3))
                    visibility = m.group(4) or "public"
                    name = m.group(5)
                    params_str = m.group(6) or ""
                    return_type = (m.group(7) or "").strip()
                    kind = "method"
                elif pat_idx == 1:  # standalone function
                    is_async = bool(m.group(3))
                    is_static = False
                    visibility = "public" if m.group(2) else "private"
                    name = m.group(4)
                    params_str = m.group(5) or ""
                    return_type = (m.group(6) or "").strip()
                    kind = "function"
                else:  # constructor
                    is_async = False
                    is_static = False
                    visibility = "public"
                    name = "constructor"
                    params_str = m.group(3) or ""
                    return_type = ""
                    kind = "constructor"

                # Find closing brace
                end_line = self._find_closing_brace(lines, i)
                body = "\n".join(lines[i:end_line + 1])
                params = self._parse_params(params_str)

                functions.append(FunctionInfo(
                    name=name, kind=kind,
                    start_line=i, end_line=end_line,
                    body=body, params=params,
                    return_type=return_type,
                    is_public=visibility == "public",
                    is_async=is_async,
                    is_static=is_static,
                ))
                i = end_line + 1
                break
            else:
                i += 1

        return functions

    # ── Class Parsing ────────────────────────────────────────────

    def parse_classes(self, code: str) -> List[ClassInfo]:
        """Extract all classes from code."""
        classes: List[ClassInfo] = []
        lines = code.split("\n")

        pat = re.compile(
            r"^(\s*)(?:export\s+)?(?:abstract\s+)?class\s+(\w+)"
            r"(?:\s+extends\s+(\w+))?"
            r"(?:\s+implements\s+([\w,\s]+))?"
            r"\s*\{"
        )

        i = 0
        while i < len(lines):
            m = pat.match(lines[i])
            if not m:
                i += 1
                continue

            name = m.group(2)
            extends = m.group(3) or ""
            implements_str = m.group(4) or ""
            implements = [s.strip() for s in implements_str.split(",") if s.strip()]

            end_line = self._find_closing_brace(lines, i)
            body = "\n".join(lines[i + 1:end_line])

            # Parse fields
            fields = []
            private_fields = []
            for fl in body.split("\n"):
                fl_stripped = fl.strip()
                fm = re.match(
                    r"(private|public|protected)?\s*(readonly\s+)?(\w+)\s*[:=]", fl_stripped
                )
                if fm and not fl_stripped.endswith("{"):
                    field_name = fm.group(3)
                    fields.append(field_name)
                    if fm.group(1) == "private":
                        private_fields.append(field_name)

            # Parse methods inside the class
            methods = self.parse_functions(body)

            classes.append(ClassInfo(
                name=name, start_line=i, end_line=end_line,
                body=body, methods=methods, fields=fields,
                private_fields=private_fields,
                implements=implements, extends=extends,
            ))
            i = end_line + 1

        return classes

    # ── Import Parsing ───────────────────────────────────────────

    def parse_imports(self, code: str) -> List[ImportInfo]:
        """Extract all import statements."""
        imports: List[ImportInfo] = []
        for m in re.finditer(
            r"import\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]", code
        ):
            names = [n.strip().split(" as ")[0].strip()
                     for n in m.group(1).split(",") if n.strip()]
            source = m.group(2)
            imports.append(ImportInfo(
                source=source, names=names,
                is_relative=source.startswith("."),
            ))
        # Default imports
        for m in re.finditer(
            r"import\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]", code
        ):
            imports.append(ImportInfo(
                source=m.group(2), names=[m.group(1)],
                is_relative=m.group(2).startswith("."),
            ))
        return imports

    # ── Cognitive Complexity ─────────────────────────────────────

    def cognitive_complexity(self, code: str) -> float:
        """Calculate SonarQube-style cognitive complexity.

        Increments for:
          - Branching: if, else if, else, switch, ternary (+1 each, +nesting)
          - Loops: for, while, do (+1 each, +nesting)
          - Catches: catch (+1, +nesting)
          - Breaks in flow: break to label, continue to label, sequences of &&/||
          - Nesting: each level of nesting adds +1 to structural increments
        """
        functions = self.parse_functions(code)
        if not functions:
            # Analyze the whole code as one block
            return self._cognitive_for_block(code)

        total = 0.0
        for func in functions:
            total += self._cognitive_for_block(func.body)
        return total / len(functions)

    def _cognitive_for_block(self, code: str) -> float:
        complexity = 0
        nesting = 0
        lines = code.split("\n")

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            # Track nesting via braces
            open_braces = stripped.count("{")
            close_braces = stripped.count("}")

            # Structural increments (add nesting penalty)
            for pattern, adds_nesting in [
                (r"\bif\s*\(", True),
                (r"\belse\s+if\s*\(", True),
                (r"\bfor\s*\(", True),
                (r"\bwhile\s*\(", True),
                (r"\bdo\s*\{", True),
                (r"\bswitch\s*\(", True),
                (r"\bcatch\s*\(", True),
            ]:
                if re.search(pattern, stripped):
                    complexity += 1 + nesting  # base + nesting penalty
                    break

            # Hybrid increments (no nesting penalty)
            if re.search(r"\belse\s*\{", stripped) and not re.search(r"\belse\s+if", stripped):
                complexity += 1

            # Logical operator sequences
            logic_ops = len(re.findall(r"&&|\|\|", stripped))
            if logic_ops > 0:
                complexity += logic_ops

            # Ternary
            if re.search(r"[^?]\?[^?.:]", stripped):
                complexity += 1 + nesting

            # Update nesting level
            nesting += open_braces - close_braces
            nesting = max(0, nesting)

        return complexity

    # ── Nesting Analysis ─────────────────────────────────────────

    def _nesting_depths(self, code: str) -> List[int]:
        """Return max nesting depth per function."""
        functions = self.parse_functions(code)
        if not functions:
            return [self._max_nesting(code)]

        return [self._max_nesting(f.body) for f in functions]

    def _max_nesting(self, code: str) -> int:
        max_depth = 0
        depth = 0
        in_string = False
        escape = False
        quote_char = ""

        for ch in code:
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch in ('"', "'", "`"):
                if in_string and ch == quote_char:
                    in_string = False
                elif not in_string:
                    in_string = True
                    quote_char = ch
                continue
            if in_string:
                continue
            if ch == "{":
                depth += 1
                max_depth = max(max_depth, depth)
            elif ch == "}":
                depth = max(0, depth - 1)

        return max_depth

    # ── Coupling Analysis ────────────────────────────────────────

    def coupling_analysis(self, files: Dict[str, str]) -> CouplingMetrics:
        """Analyze module coupling from import graphs."""
        metrics = CouplingMetrics()

        # Build module → imports mapping
        module_imports: Dict[str, Set[str]] = {}
        for filename, code in files.items():
            module = self._module_from_path(filename)
            imports = self.parse_imports(code)
            targets = set()
            for imp in imports:
                if imp.is_relative:
                    target_mod = self._resolve_import_module(filename, imp.source)
                    if target_mod and target_mod != module:
                        targets.add(target_mod)
            module_imports[module] = targets

        # Efferent coupling (fan-out): how many modules does this import
        for mod, targets in module_imports.items():
            metrics.efferent[mod] = len(targets)

        # Afferent coupling (fan-in): how many modules import this
        all_modules = set(module_imports.keys())
        for mod in all_modules:
            fan_in = sum(1 for other, targets in module_imports.items()
                         if mod in targets and other != mod)
            metrics.afferent[mod] = fan_in

        # Instability index: Ce / (Ca + Ce)
        for mod in all_modules:
            ca = metrics.afferent.get(mod, 0)
            ce = metrics.efferent.get(mod, 0)
            metrics.instability[mod] = ce / max(ca + ce, 1)

        # Circular dependency detection (DFS)
        metrics.circular_count = self._detect_cycles(module_imports)

        # Dependency depth (longest path in DAG)
        metrics.max_depth = self._longest_path(module_imports)

        return metrics

    def _detect_cycles(self, graph: Dict[str, Set[str]]) -> int:
        """Count circular dependencies using DFS."""
        visited: Set[str] = set()
        in_stack: Set[str] = set()
        cycles = 0

        def dfs(node: str):
            nonlocal cycles
            if node in in_stack:
                cycles += 1
                return
            if node in visited:
                return
            visited.add(node)
            in_stack.add(node)
            for neighbor in graph.get(node, set()):
                if neighbor in graph:
                    dfs(neighbor)
            in_stack.discard(node)

        for node in graph:
            dfs(node)

        return cycles

    def _longest_path(self, graph: Dict[str, Set[str]]) -> int:
        """Find longest path in the dependency graph."""
        memo: Dict[str, int] = {}

        def dfs(node: str, visited: Set[str]) -> int:
            if node in memo:
                return memo[node]
            if node in visited:
                return 0  # cycle
            visited.add(node)
            max_child = 0
            for neighbor in graph.get(node, set()):
                if neighbor in graph:
                    max_child = max(max_child, dfs(neighbor, visited))
            visited.discard(node)
            result = 1 + max_child
            memo[node] = result
            return result

        return max(dfs(n, set()) for n in graph) if graph else 0

    # ── Duplicate Detection ──────────────────────────────────────

    def duplicate_detection(self, files: Dict[str, str],
                            min_lines: int = 4) -> DuplicateMetrics:
        """Detect duplicate code blocks using normalized line hashing."""
        metrics = DuplicateMetrics()
        block_hashes: Dict[str, int] = {}  # hash → count

        for code in files.values():
            lines = code.split("\n")
            normalized = []
            for line in lines:
                stripped = line.strip()
                if not stripped or stripped.startswith("//") or stripped.startswith("/*"):
                    continue
                # Normalize: remove whitespace variations, string literals
                norm = re.sub(r'\s+', ' ', stripped)
                norm = re.sub(r'"[^"]*"', '""', norm)
                norm = re.sub(r"'[^']*'", "''", norm)
                normalized.append(norm)

            # Sliding window of min_lines
            for i in range(len(normalized) - min_lines + 1):
                block = "\n".join(normalized[i:i + min_lines])
                h = hashlib.md5(block.encode()).hexdigest()
                block_hashes[h] = block_hashes.get(h, 0) + 1
                metrics.total_block_count += 1

        for count in block_hashes.values():
            if count > 1:
                metrics.duplicate_block_count += count - 1
                metrics.duplicate_line_count += (count - 1) * min_lines

        return metrics

    # ── Cohesion (LCOM-style) ────────────────────────────────────

    def class_cohesion(self, cls: ClassInfo) -> float:
        """Measure class cohesion: what fraction of fields are used by methods.

        Returns 0-1 where 1 = all methods use all fields (highly cohesive).
        """
        if not cls.fields or not cls.methods:
            return 1.0

        total_usage = 0
        max_possible = len(cls.methods) * len(cls.fields)

        for method in cls.methods:
            for fld in cls.fields:
                if re.search(r'\bthis\.' + re.escape(fld) + r'\b', method.body):
                    total_usage += 1

        return total_usage / max(max_possible, 1)

    # ── Guard Clause Detection ───────────────────────────────────

    def has_guard_clauses(self, func: FunctionInfo) -> bool:
        """Check if a function starts with guard clauses (early returns)."""
        lines = func.body.split("\n")
        for line in lines[1:6]:  # check first 5 lines of body
            stripped = line.strip()
            if re.match(r"if\s*\(.*\)\s*\{?\s*return\b", stripped):
                return True
            if re.match(r"if\s*\(.*\)\s*\{?\s*throw\b", stripped):
                return True
        return False

    # ── DI Detection ─────────────────────────────────────────────

    def uses_dependency_injection(self, cls: ClassInfo) -> bool:
        """Check if a class receives dependencies via constructor."""
        for method in cls.methods:
            if method.kind == "constructor" and method.param_count > 0:
                # Check if params are assigned to fields
                for param in method.params:
                    param_name = param.split(":")[0].strip().lstrip("private ").lstrip("readonly ").lstrip("public ").strip()
                    if re.search(r"this\.\w+\s*=\s*" + re.escape(param_name), method.body):
                        return True
                    # Also detect parameter properties (private readonly x: Type)
                    if re.match(r"(private|public|protected)\s+(readonly\s+)?\w+", param.strip()):
                        return True
        return False

    # ── Helper Methods ───────────────────────────────────────────

    def _find_closing_brace(self, lines: List[str], start: int) -> int:
        """Find the line with the matching closing brace."""
        depth = 0
        in_string = False
        quote_char = ""

        for i in range(start, len(lines)):
            for ch in lines[i]:
                if ch == "\\" and in_string:
                    continue
                if ch in ('"', "'", "`"):
                    if in_string and ch == quote_char:
                        in_string = False
                    elif not in_string:
                        in_string = True
                        quote_char = ch
                    continue
                if in_string:
                    continue
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        return i

        return min(start + 100, len(lines) - 1)

    def _parse_params(self, params_str: str) -> List[str]:
        """Parse function parameter string into list."""
        if not params_str.strip():
            return []
        # Split respecting generics: foo: Map<string, number>, bar: string
        params = []
        depth = 0
        current = ""
        for ch in params_str:
            if ch in ("<", "("):
                depth += 1
            elif ch in (">", ")"):
                depth -= 1
            elif ch == "," and depth == 0:
                if current.strip():
                    params.append(current.strip())
                current = ""
                continue
            current += ch
        if current.strip():
            params.append(current.strip())
        return params

    def _module_from_path(self, filepath: str) -> str:
        """Extract module name from file path: 'core/config.ts' → 'core'."""
        parts = filepath.replace("\\", "/").split("/")
        # Skip src/ prefix if present
        if parts and parts[0] == "src":
            parts = parts[1:]
        return parts[0] if len(parts) > 1 else "root"

    def _resolve_import_module(self, from_file: str, import_path: str) -> Optional[str]:
        """Resolve a relative import to a module name."""
        if import_path.startswith(".."):
            # Cross-module import: '../core' → 'core'
            parts = import_path.split("/")
            # Find the non-.. part
            for p in parts:
                if p != ".." and p != ".":
                    return p
        elif import_path.startswith("."):
            # Same-module import
            return self._module_from_path(from_file)
        return None
