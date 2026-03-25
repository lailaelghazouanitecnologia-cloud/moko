"""
LearnedScorer — intelligent quality evaluation that learns from reference projects.

Instead of hardcoded weights and counting readonly/any, this:
  1. Builds a "reference profile" from gold-standard projects (Claude, human)
  2. Measures how close generated code is to that profile on multiple dimensions
  3. Detects higher-level patterns: API coherence, implementation depth, consistency
  4. Adapts scoring weights based on what actually differentiates good from bad code

The key insight: quality isn't "does it have readonly" — it's "does it use the
same patterns, at the same density, with the same coherence as production code."
"""
from __future__ import annotations

import json
import math
import os
import re
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple


# ── Reference Profile ────────────────────────────────────────────────

@dataclass
class CodeProfile:
    """Statistical profile of a codebase's quality characteristics.

    Each metric is a normalized density (per 100 LOC or per-file ratio)
    so projects of different sizes are comparable.
    """
    # Identity
    name: str = ""
    total_loc: int = 0
    total_files: int = 0

    # Type system usage (per 100 LOC)
    readonly_density: float = 0.0       # readonly keywords / 100 LOC
    generic_density: float = 0.0        # <T> usages / 100 LOC
    union_density: float = 0.0          # union types / 100 LOC
    type_alias_density: float = 0.0     # type X = ... / 100 LOC
    any_density: float = 0.0            # any usages / 100 LOC (lower is better)
    unknown_density: float = 0.0        # unknown usages / 100 LOC

    # Pattern sophistication (per file averages)
    discriminated_union_count: int = 0  # { kind: 'x' } | { kind: 'y' } patterns
    branded_type_count: int = 0         # string & { __brand: ... } patterns
    const_assertion_count: int = 0      # as const patterns
    mapped_type_count: int = 0          # { [K in keyof T]: ... } patterns
    conditional_type_count: int = 0     # T extends U ? X : Y patterns

    # Architecture (ratios)
    avg_class_size: float = 0.0         # LOC per class
    avg_method_count: float = 0.0       # methods per class
    private_ratio: float = 0.0          # private members / total members
    interface_to_class_ratio: float = 0.0   # interfaces / classes
    export_ratio: float = 0.0           # exported items / total items

    # Implementation depth
    avg_complexity: float = 0.0         # branches per LOC
    avg_function_length: float = 0.0    # lines per function
    error_handling_density: float = 0.0 # try/catch + throw / 100 LOC
    validation_density: float = 0.0     # typeof/instanceof checks / 100 LOC

    # Consistency (standard deviations — lower = more consistent)
    complexity_stddev: float = 0.0      # how consistent is complexity across files
    method_count_stddev: float = 0.0    # how consistent are class sizes
    naming_consistency: float = 0.0     # how consistently are patterns named

    # Cross-module coherence
    import_coherence: float = 0.0       # do modules import each other correctly
    type_reuse_ratio: float = 0.0       # types used across modules / total types
    dead_export_ratio: float = 0.0      # exports never imported elsewhere

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "CodeProfile":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


# ── Profile Extractor ─────────────────────────────────────────────────

class ProfileExtractor:
    """Extract a CodeProfile from a project directory or set of files."""

    def extract_project(self, project_dir: str, name: str = "") -> CodeProfile:
        """Analyze an entire project and build its profile."""
        src_dir = Path(project_dir)
        if (src_dir / "src").exists():
            src_dir = src_dir / "src"

        files: Dict[str, str] = {}
        for ts_file in src_dir.rglob("*.ts"):
            rel = str(ts_file.relative_to(src_dir))
            try:
                content = ts_file.read_text()
                if len(content) < 100_000:
                    files[rel] = content
            except Exception:
                pass

        if not files:
            return CodeProfile(name=name)

        return self.extract_files(files, name=name or str(project_dir))

    def extract_files(self, files: Dict[str, str], name: str = "") -> CodeProfile:
        """Build profile from a set of files."""
        p = CodeProfile(name=name)

        all_code = "\n".join(files.values())
        per_file_metrics: List[Dict[str, float]] = []
        class_sizes: List[int] = []
        method_counts: List[int] = []
        complexities: List[float] = []

        total_loc = 0
        total_classes = 0
        total_interfaces = 0
        total_methods = 0
        total_private = 0
        total_exports = 0
        total_items = 0

        for filename, code in files.items():
            lines = code.split("\n")
            loc = len([l for l in lines if l.strip() and not l.strip().startswith("//")])
            if loc < 3:
                continue  # skip barrel/index files

            total_loc += loc
            p.total_files += 1

            metrics = self._extract_file_metrics(code, loc)
            per_file_metrics.append(metrics)
            complexities.append(metrics["complexity"])

            # Class analysis
            classes = re.findall(
                r"(?:export\s+)?class\s+\w+[^{]*\{",
                code
            )
            n_classes = len(classes)
            total_classes += n_classes
            if n_classes > 0:
                class_sizes.append(loc / n_classes)

            # Methods per class
            methods = re.findall(
                r"(?:private|public|protected|async|static)\s+\w+\s*\(",
                code
            )
            n_methods = len(methods)
            total_methods += n_methods
            if n_classes > 0:
                method_counts.append(n_methods / n_classes)

            # Private members
            total_private += len(re.findall(r"\bprivate\s+", code))

            # Interfaces
            total_interfaces += len(re.findall(r"\binterface\s+\w+", code))

            # Exports
            exports = len(re.findall(r"\bexport\s+(?:class|interface|type|function|const|enum)\b", code))
            total_exports += exports
            total_items += n_classes + len(re.findall(r"\binterface\s+\w+", code)) + \
                           len(re.findall(r"^\s*(?:export\s+)?type\s+\w+\s*=", code, re.MULTILINE))

        if total_loc == 0:
            return p

        p.total_loc = total_loc
        scale = 100.0 / total_loc  # per-100-LOC normalization

        # Type system densities
        p.readonly_density = len(re.findall(r"\breadonly\b", all_code)) * scale
        p.generic_density = len(re.findall(r"<\s*[A-Z]\w*(?:\s*,\s*[A-Z]\w*)*\s*>", all_code)) * scale
        p.union_density = len(re.findall(r"\w+\s*\|\s*\w+", all_code)) * scale
        p.type_alias_density = len(re.findall(r"^\s*(?:export\s+)?type\s+\w+\s*=", all_code, re.MULTILINE)) * scale
        p.any_density = len(re.findall(r"\bany\b", all_code)) * scale
        p.unknown_density = len(re.findall(r"\bunknown\b", all_code)) * scale

        # Sophisticated type patterns
        p.discriminated_union_count = len(re.findall(
            r"(?:kind|type|tag|status)\s*:\s*['\"]", all_code
        ))
        p.branded_type_count = len(re.findall(
            r"string\s*&\s*\{\s*(?:readonly\s+)?__\w+", all_code
        ))
        p.const_assertion_count = len(re.findall(r"\bas\s+const\b", all_code))
        p.mapped_type_count = len(re.findall(r"\[\s*\w+\s+in\s+keyof\b", all_code))
        p.conditional_type_count = len(re.findall(r"\bextends\b.*\?.*:", all_code))

        # Architecture
        p.avg_class_size = sum(class_sizes) / len(class_sizes) if class_sizes else 0
        p.avg_method_count = sum(method_counts) / len(method_counts) if method_counts else 0
        total_members = total_methods + len(re.findall(r"^\s+(?:private|public|protected|readonly)\s+\w+\s*[:=]", all_code, re.MULTILINE))
        p.private_ratio = total_private / max(total_members, 1)
        p.interface_to_class_ratio = total_interfaces / max(total_classes, 1)
        p.export_ratio = total_exports / max(total_items, 1)

        # Implementation depth
        p.avg_complexity = sum(complexities) / len(complexities) if complexities else 0
        if per_file_metrics:
            p.avg_function_length = sum(m["avg_func_len"] for m in per_file_metrics) / len(per_file_metrics)
        error_count = len(re.findall(r"\b(?:try|catch|throw)\b", all_code))
        p.error_handling_density = error_count * scale
        validation_count = len(re.findall(r"\b(?:typeof|instanceof)\b", all_code))
        p.validation_density = validation_count * scale

        # Consistency (lower stddev = better)
        if len(complexities) > 1:
            mean_c = sum(complexities) / len(complexities)
            p.complexity_stddev = math.sqrt(sum((c - mean_c) ** 2 for c in complexities) / len(complexities))
        if len(method_counts) > 1:
            mean_m = sum(method_counts) / len(method_counts)
            p.method_count_stddev = math.sqrt(sum((m - mean_m) ** 2 for m in method_counts) / len(method_counts))

        # Naming consistency
        p.naming_consistency = self._measure_naming_consistency(files)

        # Cross-module coherence
        p.import_coherence, p.type_reuse_ratio, p.dead_export_ratio = \
            self._measure_coherence(files)

        return p

    def _extract_file_metrics(self, code: str, loc: int) -> Dict[str, float]:
        """Extract per-file metrics for aggregation."""
        branches = len(re.findall(r"\b(?:if|else|for|while|switch|case|catch)\b", code))
        complexity = branches / max(loc, 1)

        func_starts = [i for i, line in enumerate(code.split("\n"))
                       if re.search(r"(?:async\s+)?(?:private|public|protected|static)?\s*\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{", line)]
        if len(func_starts) >= 2:
            lengths = [func_starts[i+1] - func_starts[i] for i in range(len(func_starts)-1)]
            avg_func_len = sum(lengths) / len(lengths)
        elif func_starts:
            avg_func_len = loc - func_starts[0]
        else:
            avg_func_len = 0

        return {"complexity": complexity, "avg_func_len": avg_func_len}

    def _measure_naming_consistency(self, files: Dict[str, str]) -> float:
        """Measure how consistently naming patterns are used across files.

        Higher = more consistent (0-1).
        """
        patterns_per_file: List[set] = []

        for code in files.values():
            if len(code.split("\n")) < 5:
                continue
            patterns: set = set()
            if re.search(r"\breadonly\b", code):
                patterns.add("readonly")
            if re.search(r"private\s+readonly\b", code):
                patterns.add("private_readonly")
            if re.search(r"<\s*[A-Z]\w*\s*>", code):
                patterns.add("generics")
            if re.search(r"\btype\s+\w+\s*=", code):
                patterns.add("type_alias")
            if re.search(r"\binterface\s+\w+", code):
                patterns.add("interface")
            if re.search(r"\bthrow\s+new\s+\w+Error", code):
                patterns.add("typed_error")
            if re.search(r"\/\*\*", code):
                patterns.add("jsdoc")
            patterns_per_file.append(patterns)

        if len(patterns_per_file) < 2:
            return 1.0

        # Consistency = how much patterns overlap across files
        all_patterns = set()
        for p in patterns_per_file:
            all_patterns |= p

        if not all_patterns:
            return 1.0

        # For each pattern, count in how many files it appears
        consistency_scores = []
        for pattern in all_patterns:
            count = sum(1 for p in patterns_per_file if pattern in p)
            ratio = count / len(patterns_per_file)
            # A pattern used in all files or no files is consistent
            # A pattern used in 50% of files is inconsistent
            consistency_scores.append(max(ratio, 1.0 - ratio))

        return sum(consistency_scores) / len(consistency_scores) if consistency_scores else 1.0

    def _measure_coherence(self, files: Dict[str, str]) -> Tuple[float, float, float]:
        """Measure cross-module coherence.

        Returns (import_coherence, type_reuse, dead_export_ratio).
        """
        # Collect exports and imports per file
        exports_by_file: Dict[str, set] = {}
        imports_by_file: Dict[str, set] = {}

        for filename, code in files.items():
            # Exported names
            exported = set()
            for m in re.finditer(r"\bexport\s+(?:class|interface|type|function|const|enum)\s+(\w+)", code):
                exported.add(m.group(1))
            for m in re.finditer(r"export\s*\{\s*([^}]+)\}", code):
                for name in m.group(1).split(","):
                    name = name.strip().split(" as ")[0].strip()
                    if name:
                        exported.add(name)
            exports_by_file[filename] = exported

            # Imported names
            imported = set()
            for m in re.finditer(r"import\s*\{([^}]+)\}\s*from", code):
                for name in m.group(1).split(","):
                    name = name.strip().split(" as ")[0].strip()
                    if name:
                        imported.add(name)
            imports_by_file[filename] = imported

        all_exports = set()
        all_imports = set()
        for exports in exports_by_file.values():
            all_exports |= exports
        for imports in imports_by_file.values():
            all_imports |= imports

        if not all_exports:
            return 1.0, 0.0, 0.0

        # Import coherence: what fraction of imports resolve to actual exports
        resolvable = all_imports & all_exports
        import_coherence = len(resolvable) / max(len(all_imports), 1)

        # Type reuse: exports used in other files / total exports
        used_exports = all_exports & all_imports
        type_reuse = len(used_exports) / max(len(all_exports), 1)

        # Dead exports: exported but never imported by anyone
        dead = all_exports - all_imports
        # Don't count index.ts re-exports as dead
        dead_ratio = len(dead) / max(len(all_exports), 1)

        return import_coherence, type_reuse, dead_ratio


# ── Learned Scorer ─────────────────────────────────────────────────

@dataclass
class ScoreDimension:
    """One dimension of quality scoring with learned weight."""
    name: str
    weight: float = 1.0                 # how important (learned)
    reference_value: float = 0.0        # target from reference profile
    tolerance: float = 0.2             # acceptable deviation
    direction: str = "higher_better"    # or "lower_better" or "closer_better"

    def score(self, actual: float) -> float:
        """Score this dimension 0-1 based on reference.

        Uses smooth sigmoid-like curves instead of cliff-edge scoring.
        Tolerance defines the "acceptable range" around the reference.
        """
        if self.direction == "higher_better":
            if self.reference_value <= 0.001:
                # No reference — reward any positive value
                return min(actual * 2.0, 1.0) if actual > 0 else 0.5
            ratio = actual / self.reference_value
            # Smooth: 50% at half reference, 100% at or above reference
            return min(ratio, 1.0)

        elif self.direction == "lower_better":
            if actual <= 0.001:
                return 1.0  # perfect: zero is best
            if self.reference_value <= 0.001:
                # Reference has none, penalize gradually
                return max(0.2, 1.0 - actual * 2.0)
            # Allow up to 2x reference before hitting 0
            ratio = actual / self.reference_value
            if ratio <= 1.0:
                return 1.0  # at or below reference = full score
            # Gradual degradation: 2x ref → 0.5, 4x ref → 0.25
            return max(0.1, 1.0 / ratio)

        else:  # closer_better
            diff = abs(actual - self.reference_value)
            # Use tolerance as the range where score is still >= 0.5
            tol = max(self.tolerance, 0.01)
            # Smooth gaussian-like: exp(-diff^2 / tol^2)
            return math.exp(-(diff / tol) ** 2 * 0.5)


class LearnedScorer:
    """Quality scorer that learns from reference projects.

    Instead of hardcoded weights:
      1. Profiles reference (Claude) projects to learn what "good" looks like
      2. Measures deviation from reference profile per dimension
      3. Adjusts weights based on what actually differs between good/bad code
      4. Produces a detailed quality report, not just a number
    """

    def __init__(self, reference_profiles: Optional[List[CodeProfile]] = None):
        self.reference: Optional[CodeProfile] = None
        self.dimensions: List[ScoreDimension] = []
        self._path: str = ""

        if reference_profiles:
            self.learn_from_profiles(reference_profiles)

    def learn_from_profiles(self, profiles: List[CodeProfile]):
        """Build reference profile from one or more gold-standard projects.

        Uses LOC-weighted average so larger projects have more influence.
        Also computes variance per dimension for tolerance calibration.
        """
        if not profiles:
            return

        # LOC-weighted average across reference projects
        ref = CodeProfile(name="reference_avg")
        total_loc = sum(max(p.total_loc, 1) for p in profiles)

        # Store per-dimension variance for tolerance calibration
        self._ref_variance: Dict[str, float] = {}

        for attr in CodeProfile.__dataclass_fields__:
            if attr in ("name",):
                continue
            values = [getattr(p, attr) for p in profiles]
            if all(isinstance(v, (int, float)) for v in values):
                # Weighted average
                weights = [max(p.total_loc, 1) / total_loc for p in profiles]
                avg = sum(v * w for v, w in zip(values, weights))
                setattr(ref, attr, avg)
                # Variance (for tolerance)
                if len(values) > 1:
                    variance = sum(w * (v - avg) ** 2 for v, w in zip(values, weights))
                    self._ref_variance[attr] = math.sqrt(variance)

        self.reference = ref
        self._source_profiles = list(profiles)
        self._build_dimensions()
        self._calibrate(profiles)

    def _build_dimensions(self):
        """Build scoring dimensions from reference profile.

        Tolerances are calibrated from variance across reference projects:
        if readonly_density varies a lot across Claude projects, the tolerance
        is wider (it's less discriminative).
        """
        ref = self.reference
        if not ref:
            return

        var = getattr(self, '_ref_variance', {})

        def tol(attr: str, default: float) -> float:
            """Get tolerance: max(observed stddev * 2, default)."""
            return max(var.get(attr, default) * 2.0, default)

        self.dimensions = [
            # Type system — highest weight, biggest differentiator
            ScoreDimension("readonly_density", weight=3.0,
                           reference_value=ref.readonly_density,
                           direction="higher_better"),
            ScoreDimension("generic_density", weight=2.5,
                           reference_value=ref.generic_density,
                           direction="higher_better"),
            ScoreDimension("union_density", weight=2.0,
                           reference_value=ref.union_density,
                           direction="higher_better"),
            ScoreDimension("type_alias_density", weight=1.5,
                           reference_value=ref.type_alias_density,
                           direction="higher_better"),
            ScoreDimension("any_density", weight=3.0,
                           reference_value=ref.any_density,
                           direction="lower_better"),

            # Sophisticated patterns — presence matters more than count
            ScoreDimension("discriminated_unions", weight=2.0,
                           reference_value=min(ref.discriminated_union_count, 1),
                           direction="higher_better"),
            ScoreDimension("branded_types", weight=0.5,
                           reference_value=min(ref.branded_type_count, 1),
                           direction="higher_better"),

            # Architecture — use variance-based tolerance
            ScoreDimension("private_ratio", weight=1.5,
                           reference_value=ref.private_ratio,
                           tolerance=tol("private_ratio", 0.3),
                           direction="closer_better"),
            ScoreDimension("avg_class_size", weight=0.8,
                           reference_value=ref.avg_class_size,
                           tolerance=tol("avg_class_size", 80),
                           direction="closer_better"),
            ScoreDimension("interface_to_class", weight=1.0,
                           reference_value=ref.interface_to_class_ratio,
                           direction="higher_better"),

            # Implementation depth — use variance-based tolerance
            ScoreDimension("complexity", weight=1.0,
                           reference_value=ref.avg_complexity,
                           tolerance=tol("avg_complexity", 0.04),
                           direction="closer_better"),
            ScoreDimension("error_handling", weight=1.5,
                           reference_value=ref.error_handling_density,
                           direction="higher_better"),
            ScoreDimension("validation", weight=0.8,
                           reference_value=ref.validation_density,
                           direction="higher_better"),

            # Consistency
            ScoreDimension("pattern_consistency", weight=2.0,
                           reference_value=ref.naming_consistency,
                           direction="higher_better"),

            # Coherence — very important
            ScoreDimension("import_coherence", weight=2.5,
                           reference_value=ref.import_coherence,
                           direction="higher_better"),
            ScoreDimension("type_reuse", weight=1.5,
                           reference_value=ref.type_reuse_ratio,
                           direction="higher_better"),
        ]

    def score(self, target: CodeProfile) -> Tuple[float, Dict[str, Tuple[float, float, str]]]:
        """Score a project against the reference profile.

        Returns (overall_score, {dimension: (score, weight, explanation)}).
        """
        if not self.dimensions:
            return 0.5, {}

        details: Dict[str, Tuple[float, float, str]] = {}
        total_weighted = 0.0
        total_weight = 0.0

        for dim in self.dimensions:
            actual = self._get_value(target, dim.name)
            ref_val = dim.reference_value
            dim_score = dim.score(actual)

            # Build explanation
            if dim.direction == "higher_better":
                if dim_score >= 0.8:
                    explain = f"{actual:.2f} vs ref {ref_val:.2f} — good"
                elif dim_score >= 0.4:
                    explain = f"{actual:.2f} vs ref {ref_val:.2f} — below target"
                else:
                    explain = f"{actual:.2f} vs ref {ref_val:.2f} — significant gap"
            elif dim.direction == "lower_better":
                if dim_score >= 0.8:
                    explain = f"{actual:.2f} vs ref {ref_val:.2f} — good (low)"
                else:
                    explain = f"{actual:.2f} vs ref {ref_val:.2f} — too high"
            else:
                diff = abs(actual - ref_val)
                explain = f"{actual:.2f} vs ref {ref_val:.2f} — diff={diff:.2f}"

            details[dim.name] = (dim_score, dim.weight, explain)
            total_weighted += dim_score * dim.weight
            total_weight += dim.weight

        overall = total_weighted / total_weight if total_weight > 0 else 0.5
        return overall, details

    def score_comparison(self, target: CodeProfile) -> str:
        """Generate a human-readable quality comparison report."""
        overall, details = self.score(target)

        lines = [
            f"Quality Score: {overall:.0%}",
            f"  (compared to reference: {self.reference.name})" if self.reference else "",
            "",
        ]

        # Group by quality level
        good = [(n, s, w, e) for n, (s, w, e) in details.items() if s >= 0.7]
        medium = [(n, s, w, e) for n, (s, w, e) in details.items() if 0.3 <= s < 0.7]
        poor = [(n, s, w, e) for n, (s, w, e) in details.items() if s < 0.3]

        if poor:
            lines.append("  GAPS (need improvement):")
            for name, score, weight, explain in sorted(poor, key=lambda x: x[1]):
                lines.append(f"    {name:<25} {score:.0%}  (weight={weight:.1f}) {explain}")

        if medium:
            lines.append("  ADEQUATE (could be better):")
            for name, score, weight, explain in sorted(medium, key=lambda x: x[1]):
                lines.append(f"    {name:<25} {score:.0%}  (weight={weight:.1f}) {explain}")

        if good:
            lines.append("  STRONG:")
            for name, score, weight, explain in sorted(good, key=lambda x: -x[1]):
                lines.append(f"    {name:<25} {score:.0%}  (weight={weight:.1f}) {explain}")

        return "\n".join(lines)

    def learn_weights_from_comparison(
        self, good_profiles: List[CodeProfile], bad_profiles: List[CodeProfile]
    ):
        """Automatically learn dimension weights from good/bad examples.

        Dimensions where good and bad differ most get higher weights.
        """
        if not good_profiles or not bad_profiles or not self.dimensions:
            return

        for dim in self.dimensions:
            good_vals = [self._get_value(p, dim.name) for p in good_profiles]
            bad_vals = [self._get_value(p, dim.name) for p in bad_profiles]

            good_mean = sum(good_vals) / len(good_vals)
            bad_mean = sum(bad_vals) / len(bad_vals)

            # The more different good and bad are, the more discriminative this dim is
            diff = abs(good_mean - bad_mean)
            max_val = max(abs(good_mean), abs(bad_mean), 0.01)
            discrimination = diff / max_val

            # Scale weight: base weight * (1 + discrimination)
            dim.weight *= (1.0 + discrimination * 2.0)

    def _get_value(self, profile: CodeProfile, dim_name: str) -> float:
        """Get the value for a dimension from a profile."""
        mapping = {
            "readonly_density": profile.readonly_density,
            "generic_density": profile.generic_density,
            "union_density": profile.union_density,
            "type_alias_density": profile.type_alias_density,
            "any_density": profile.any_density,
            "discriminated_unions": float(profile.discriminated_union_count > 0),
            "branded_types": float(profile.branded_type_count > 0),
            "private_ratio": profile.private_ratio,
            "avg_class_size": profile.avg_class_size,
            "interface_to_class": profile.interface_to_class_ratio,
            "complexity": profile.avg_complexity,
            "error_handling": profile.error_handling_density,
            "validation": profile.validation_density,
            "pattern_consistency": profile.naming_consistency,
            "import_coherence": profile.import_coherence,
            "type_reuse": profile.type_reuse_ratio,
        }
        return mapping.get(dim_name, 0.0)

    # ── Persistence ────────────────────────────────────────────

    def save(self, path: str):
        """Save learned scorer state."""
        data = {
            "reference": self.reference.to_dict() if self.reference else None,
            "dimensions": [
                {"name": d.name, "weight": d.weight,
                 "reference_value": d.reference_value,
                 "tolerance": d.tolerance, "direction": d.direction}
                for d in self.dimensions
            ],
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        self._path = path

    def _calibrate(self, reference_profiles: List[CodeProfile]):
        """Calibrate scorer so reference projects score ≥80%.

        After building dimensions from weighted average, we score each reference
        project. If any scores below 80%, we iteratively loosen the dimensions
        that hurt the most until the minimum reference score reaches the target.

        This prevents the scorer from being too strict on natural variation
        across reference projects (e.g., a CLI project vs a game engine will
        differ in class sizes, but both are high quality).
        """
        if not reference_profiles or not self.dimensions:
            return

        TARGET = 0.80
        MAX_ROUNDS = 10

        for _round in range(MAX_ROUNDS):
            # Score all reference projects
            scores_per_ref: List[Tuple[float, Dict[str, float]]] = []
            for prof in reference_profiles:
                overall, details = self.score(prof)
                dim_scores = {name: s for name, (s, _w, _e) in details.items()}
                scores_per_ref.append((overall, dim_scores))

            min_score = min(s for s, _ in scores_per_ref)

            if min_score >= TARGET:
                break  # all references score well enough

            # Find dimensions where reference projects score worst
            # (these are dimensions with too-tight constraints)
            dim_min_scores: Dict[str, float] = {}
            for dim in self.dimensions:
                worst = min(
                    ds.get(dim.name, 1.0) for _, ds in scores_per_ref
                )
                dim_min_scores[dim.name] = worst

            # Sort by worst score (fix the most problematic first)
            worst_dims = sorted(dim_min_scores.items(), key=lambda x: x[1])

            adjusted = False
            for dim_name, dim_min in worst_dims:
                if dim_min >= 0.85:
                    continue  # this dimension is fine

                dim = next((d for d in self.dimensions if d.name == dim_name), None)
                if not dim:
                    continue

                if dim.direction == "closer_better":
                    # Widen tolerance
                    dim.tolerance *= 1.5
                    adjusted = True
                elif dim.direction == "higher_better":
                    # Lower the reference bar slightly
                    dim.reference_value *= 0.85
                    adjusted = True
                elif dim.direction == "lower_better":
                    # Raise the acceptable ceiling
                    dim.reference_value *= 1.2
                    adjusted = True

                # Also reduce weight of consistently-bad dimensions
                if dim_min < 0.4:
                    dim.weight *= 0.7
                    adjusted = True

            if not adjusted:
                break  # nothing more to loosen

    @classmethod
    def load(cls, path: str) -> "LearnedScorer":
        """Load a saved scorer."""
        scorer = cls()
        if not os.path.exists(path):
            return scorer
        try:
            with open(path) as f:
                data = json.load(f)
            if data.get("reference"):
                scorer.reference = CodeProfile.from_dict(data["reference"])
            scorer.dimensions = [
                ScoreDimension(**d) for d in data.get("dimensions", [])
            ]
            scorer._path = path
        except (json.JSONDecodeError, TypeError, KeyError):
            pass
        return scorer
