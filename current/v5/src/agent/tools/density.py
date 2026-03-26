"""
Density — post-generation quality metrics.

Measures how well generated code uses available references and matches
its blueprint spec. No LLM calls — pure regex analysis.

Density = (used_ref_methods + actual_cross_imports) / (available_ref_methods + expected_imports)
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from ..core.models import TypeBlueprint, ModuleBlueprint
from .emission import EmissionMatch


@dataclass
class DensityScore:
    """Quality metric for a single generated file."""
    file_path: str
    type_name: str

    # Blueprint compliance
    methods_in_blueprint: int = 0
    methods_in_code: int = 0
    missing_methods: list[str] = field(default_factory=list)
    extra_methods: list[str] = field(default_factory=list)

    # Reference coverage
    available_ref_methods: int = 0
    used_ref_methods: int = 0
    ref_coverage: float = 0.0

    # Import density
    expected_imports: list[str] = field(default_factory=list)
    actual_imports: list[str] = field(default_factory=list)
    import_score: float = 0.0

    # Missing dependencies
    missing_deps: list[str] = field(default_factory=list)

    # LOC
    lines: int = 0

    # Composite
    density: float = 0.0

    def format(self) -> str:
        parts = [f"  {self.type_name}: density={self.density:.0%}"]
        parts.append(f"    LOC={self.lines}, methods={self.methods_in_code}/{self.methods_in_blueprint}")
        if self.ref_coverage > 0:
            parts.append(f"    ref_coverage={self.ref_coverage:.0%} ({self.used_ref_methods}/{self.available_ref_methods})")
        parts.append(f"    imports={self.import_score:.0%} ({len(self.actual_imports)}/{len(self.expected_imports)})")
        if self.missing_methods:
            parts.append(f"    missing: {', '.join(self.missing_methods[:5])}")
        if self.missing_deps:
            parts.append(f"    unresolved: {', '.join(self.missing_deps[:5])}")
        return "\n".join(parts)


@dataclass
class ModuleDensity:
    """Aggregate density for a module."""
    module_name: str
    type_scores: list[DensityScore] = field(default_factory=list)
    avg_density: float = 0.0
    avg_ref_coverage: float = 0.0
    avg_import_score: float = 0.0
    total_missing_methods: int = 0
    total_missing_deps: int = 0
    total_lines: int = 0

    def format(self) -> str:
        parts = [f"Module {self.module_name}: density={self.avg_density:.0%} "
                 f"({self.total_lines} LOC)"]
        for ts in self.type_scores:
            parts.append(ts.format())
        return "\n".join(parts)


# ── Regex patterns for TypeScript ──────────────────────────

# Match: methodName( or static methodName( or async methodName(
# Excludes constructor, if, for, while, etc.
_METHOD_RE = re.compile(
    r'(?:static\s+)?(?:async\s+)?(\w+)\s*\(',
    re.MULTILINE
)
_SKIP_NAMES = {"if", "for", "while", "switch", "catch", "return", "new",
               "super", "constructor", "get", "set", "typeof", "instanceof",
               "import", "export", "from", "require", "throw", "class",
               "function", "const", "let", "var", "this", "Math", "Object",
               "Array", "Float32Array", "console"}

# Match: import { X, Y } from './path'
_IMPORT_RE = re.compile(
    r"import\s*\{([^}]+)\}\s*from\s*['\"]([^'\"]+)['\"]",
    re.MULTILINE
)

# Match: export class ClassName
_CLASS_RE = re.compile(r"export\s+class\s+(\w+)", re.MULTILINE)


def _extract_methods(code: str) -> list[str]:
    """Extract method names from TypeScript class body."""
    methods = []
    for m in _METHOD_RE.finditer(code):
        name = m.group(1)
        if name not in _SKIP_NAMES and not name.startswith("_"):
            methods.append(name)
    # Deduplicate preserving order
    seen = set()
    unique = []
    for m in methods:
        if m not in seen:
            seen.add(m)
            unique.append(m)
    return unique


def _extract_imports(code: str) -> list[str]:
    """Extract imported type/symbol names from TypeScript."""
    imports = []
    for m in _IMPORT_RE.finditer(code):
        names = m.group(1)
        for name in names.split(","):
            name = name.strip()
            if name:
                imports.append(name)
    return imports


def _expected_imports_from_signatures(type_bp: TypeBlueprint,
                                      module_types: list[str]) -> list[str]:
    """Determine which sibling types should be imported based on method signatures."""
    expected = set()
    for m in type_bp.methods + type_bp.static_members:
        if m.sig:
            for word in m.sig.replace("(", " ").replace(")", " ").replace(
                    ",", " ").replace(":", " ").replace("[]", "").split():
                if word and word[0].isupper() and word in module_types:
                    expected.add(word)
    for f in type_bp.fields:
        if f.type:
            for word in f.type.replace("[]", "").replace("<", " ").replace(
                    ">", " ").split():
                if word and word[0].isupper() and word in module_types:
                    expected.add(word)
    expected.discard(type_bp.name)
    return sorted(expected)


class DensityAnalyzer:
    """Computes density metrics by comparing generated code against blueprints."""

    def __init__(self, project_dir: Path, out_dir: Path = None):
        self.project_dir = project_dir
        self.out_dir = out_dir

    def analyze_file(self, type_bp: TypeBlueprint,
                     module_bp: ModuleBlueprint,
                     emission_matches: list[EmissionMatch] = None) -> DensityScore:
        """Analyze one generated file against its blueprint."""
        score = DensityScore(
            file_path=type_bp.target_file,
            type_name=type_bp.name,
        )

        # Read generated file
        full_path = self.project_dir / type_bp.target_file
        if not full_path.exists():
            score.density = 0.0
            return score

        code = full_path.read_text()
        score.lines = len(code.splitlines())

        # Blueprint methods
        bp_methods = {m.name for m in type_bp.methods}
        bp_methods.update(m.name for m in type_bp.static_members)
        score.methods_in_blueprint = len(bp_methods)

        # Code methods
        code_methods = set(_extract_methods(code))
        score.methods_in_code = len(code_methods)

        # Missing & extra
        score.missing_methods = sorted(bp_methods - code_methods)
        score.extra_methods = sorted(code_methods - bp_methods)

        # Import analysis
        all_module_types = {t.name for t in module_bp.types}
        # Also check other modules' types by scanning all blueprints
        all_project_types = set(all_module_types)

        score.expected_imports = _expected_imports_from_signatures(
            type_bp, all_project_types
        )
        score.actual_imports = _extract_imports(code)

        actual_type_imports = [i for i in score.actual_imports
                               if i in all_project_types and i != type_bp.name]
        expected_set = set(score.expected_imports)
        actual_set = set(actual_type_imports)

        if expected_set:
            score.import_score = len(actual_set & expected_set) / len(expected_set)
        else:
            score.import_score = 1.0  # no imports expected = perfect

        # Missing deps: imported but not defined
        score.missing_deps = [i for i in score.actual_imports
                              if i not in all_project_types and i[0].isupper()
                              and i not in _SKIP_NAMES]

        # Reference coverage
        if emission_matches:
            ref_methods = set()
            for match in emission_matches:
                ref_methods.update(match.matched_methods)
            score.available_ref_methods = len(ref_methods)
            score.used_ref_methods = len(ref_methods & code_methods)
            if ref_methods:
                score.ref_coverage = score.used_ref_methods / len(ref_methods)
            else:
                score.ref_coverage = 0.0

        # Composite density — adjust weights based on available data
        bp_compliance = (len(bp_methods & code_methods) / len(bp_methods)
                         if bp_methods else 1.0)
        if score.available_ref_methods > 0:
            # With refs: 50% blueprint + 30% imports + 20% ref coverage
            score.density = (bp_compliance * 0.5 +
                             score.import_score * 0.3 +
                             score.ref_coverage * 0.2)
        else:
            # Without refs: 60% blueprint + 40% imports (no penalty for missing refs)
            score.density = (bp_compliance * 0.6 +
                             score.import_score * 0.4)

        return score

    def analyze_module(self, module_bp: ModuleBlueprint,
                       emission_matches_map: dict[str, list[EmissionMatch]] = None
                       ) -> ModuleDensity:
        """Analyze all types in a module blueprint."""
        emission_matches_map = emission_matches_map or {}
        scores = []

        for type_bp in module_bp.types:
            if type_bp.status != "translated" or not type_bp.target_file:
                continue
            matches = emission_matches_map.get(type_bp.name)
            score = self.analyze_file(type_bp, module_bp, matches)
            scores.append(score)

        mod = ModuleDensity(module_name=module_bp.name, type_scores=scores)
        if scores:
            mod.avg_density = sum(s.density for s in scores) / len(scores)
            mod.avg_ref_coverage = sum(s.ref_coverage for s in scores) / len(scores)
            mod.avg_import_score = sum(s.import_score for s in scores) / len(scores)
            mod.total_missing_methods = sum(len(s.missing_methods) for s in scores)
            mod.total_missing_deps = sum(len(s.missing_deps) for s in scores)
            mod.total_lines = sum(s.lines for s in scores)

        return mod

    def analyze_project(self, blueprint_dir: Path) -> list[ModuleDensity]:
        """Analyze all modules in a project by loading blueprints from disk."""
        results = []

        if not blueprint_dir.exists():
            return results

        for bp_file in sorted(blueprint_dir.glob("*.bp.yaml")):
            try:
                module_bp = ModuleBlueprint.load(bp_file)
                mod_density = self.analyze_module(module_bp)
                results.append(mod_density)
            except Exception:
                continue

        return results
