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
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

# Re-export for backwards compatibility
from .code_profile import CodeProfile
from .profile_extractor import ProfileExtractor


# ── Score Dimension ────────────────────────────────────────────────

# Maps dimension name → CodeProfile attribute name.
# Used by LearnedScorer to read values from profiles without a manual dict.
_DIM_TO_ATTR: Dict[str, str] = {
    "readonly_density": "readonly_density",
    "generic_density": "generic_density",
    "union_density": "union_density",
    "type_alias_density": "type_alias_density",
    "any_density": "any_density",
    "discriminated_unions": "discriminated_union_count",
    "branded_types": "branded_type_count",
    "private_ratio": "private_ratio",
    "avg_class_size": "avg_class_size",
    "interface_to_class": "interface_to_class_ratio",
    "complexity": "avg_complexity",
    "error_handling": "error_handling_density",
    "validation": "validation_density",
    "pattern_consistency": "naming_consistency",
    "import_coherence": "import_coherence",
    "type_reuse": "type_reuse_ratio",
    "optional_chaining": "optional_chaining_density",
    "nullish_coalescing": "nullish_coalescing_density",
    "ternary_ratio": "ternary_ratio",
    "literal_types": "literal_type_density",
    "boilerplate_ratio": "boilerplate_ratio",
    "comment_density": "comment_density",
    "unnecessary_comments": "unnecessary_comment_ratio",
    "exports_per_file": "avg_exports_per_file",
    "void_method_ratio": "void_method_ratio",
    "cognitive_complexity": "cognitive_complexity_avg",
    "max_nesting_depth": "max_nesting_depth",
    "max_function_length": "max_function_length",
    "long_function_ratio": "long_function_ratio",
    "parameter_count_avg": "parameter_count_avg",
    "high_param_ratio": "high_param_ratio",
    "early_return_ratio": "early_return_ratio",
    "single_responsibility": "single_responsibility",
    "instability_index": "instability_index",
    "circular_dependencies": "circular_dependency_count",
    "cohesion_ratio": "cohesion_ratio",
    "god_class_count": "god_class_count",
    "avg_identifier_length": "avg_identifier_length",
    "short_name_ratio": "short_name_ratio",
    "semantic_name_score": "semantic_name_score",
    "naming_uniformity": "naming_convention_uniformity",
    "magic_number_density": "magic_number_density",
    "error_boundary_coverage": "error_boundary_coverage",
    "empty_catch_count": "empty_catch_count",
    "null_safety_coverage": "null_safety_coverage",
    "duplicate_block_ratio": "duplicate_block_ratio",
    "unused_parameter_ratio": "unused_parameter_ratio",
    "commented_code_ratio": "commented_code_ratio",
    "interface_segregation": "interface_segregation_score",
    "dependency_injection": "dependency_injection_ratio",
    "immutability_score": "immutability_score",
    "guard_clause_ratio": "guard_clause_ratio",
}


@dataclass
class ScoreDimension:
    """One dimension of quality scoring with learned weight."""
    name: str
    weight: float = 1.0
    reference_value: float = 0.0
    tolerance: float = 0.2
    direction: str = "higher_better"    # or "lower_better" or "closer_better"

    def score(self, actual: float) -> float:
        """Score this dimension 0-1 based on reference."""
        if self.direction == "higher_better":
            if self.reference_value <= 0.001:
                return min(actual * 2.0, 1.0) if actual > 0 else 0.5
            ratio = actual / self.reference_value
            return min(ratio, 1.0)

        elif self.direction == "lower_better":
            if actual <= 0.001:
                return 1.0
            if self.reference_value <= 0.001:
                return max(0.2, 1.0 - actual * 2.0)
            ratio = actual / self.reference_value
            if ratio <= 1.0:
                return 1.0
            return max(0.1, 1.0 / ratio)

        else:  # closer_better
            diff = abs(actual - self.reference_value)
            tol = max(self.tolerance, 0.01)
            return math.exp(-(diff / tol) ** 2 * 0.5)


class LearnedScorer:
    """Quality scorer that learns from reference projects."""

    def __init__(self, reference_profiles: Optional[List[CodeProfile]] = None):
        self.reference: Optional[CodeProfile] = None
        self.dimensions: List[ScoreDimension] = []
        self._path: str = ""

        if reference_profiles:
            self.learn_from_profiles(reference_profiles)

    def learn_from_profiles(self, profiles: List[CodeProfile]):
        """Build reference profile from one or more gold-standard projects."""
        if not profiles:
            return

        ref = CodeProfile(name="reference_avg")
        total_loc = sum(max(p.total_loc, 1) for p in profiles)

        self._ref_variance: Dict[str, float] = {}

        for attr in CodeProfile.__dataclass_fields__:
            if attr in ("name",):
                continue
            values = [getattr(p, attr) for p in profiles]
            if all(isinstance(v, (int, float)) for v in values):
                weights = [max(p.total_loc, 1) / total_loc for p in profiles]
                avg = sum(v * w for v, w in zip(values, weights))
                setattr(ref, attr, avg)
                if len(values) > 1:
                    variance = sum(w * (v - avg) ** 2 for v, w in zip(values, weights))
                    self._ref_variance[attr] = math.sqrt(variance)

        self.reference = ref
        self._source_profiles = list(profiles)
        self._build_dimensions()
        self._calibrate(profiles)

    def _build_dimensions(self):
        """Build scoring dimensions from reference profile."""
        ref = self.reference
        if not ref:
            return

        var = getattr(self, '_ref_variance', {})

        def tol(attr: str, default: float) -> float:
            return max(var.get(attr, default) * 2.0, default)

        self.dimensions = [
            # Type system — highest weight
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
            ScoreDimension("discriminated_unions", weight=2.0,
                           reference_value=min(ref.discriminated_union_count, 1),
                           direction="higher_better"),
            ScoreDimension("branded_types", weight=0.5,
                           reference_value=min(ref.branded_type_count, 1),
                           direction="higher_better"),

            # Architecture
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

            # Implementation depth
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

            # Coherence
            ScoreDimension("import_coherence", weight=2.5,
                           reference_value=ref.import_coherence,
                           direction="higher_better"),
            ScoreDimension("type_reuse", weight=1.5,
                           reference_value=ref.type_reuse_ratio,
                           direction="higher_better"),

            # Code conciseness
            ScoreDimension("optional_chaining", weight=1.5,
                           reference_value=ref.optional_chaining_density,
                           direction="higher_better"),
            ScoreDimension("nullish_coalescing", weight=1.0,
                           reference_value=ref.nullish_coalescing_density,
                           direction="higher_better"),
            ScoreDimension("ternary_ratio", weight=0.8,
                           reference_value=ref.ternary_ratio,
                           tolerance=tol("ternary_ratio", 0.15),
                           direction="closer_better"),
            ScoreDimension("literal_types", weight=1.0,
                           reference_value=ref.literal_type_density,
                           direction="higher_better"),
            ScoreDimension("boilerplate_ratio", weight=2.0,
                           reference_value=ref.boilerplate_ratio,
                           direction="lower_better"),
            ScoreDimension("comment_density", weight=1.0,
                           reference_value=ref.comment_density,
                           tolerance=tol("comment_density", 3.0),
                           direction="closer_better"),
            ScoreDimension("unnecessary_comments", weight=1.5,
                           reference_value=ref.unnecessary_comment_ratio,
                           direction="lower_better"),
            ScoreDimension("exports_per_file", weight=0.5,
                           reference_value=ref.avg_exports_per_file,
                           tolerance=tol("avg_exports_per_file", 1.5),
                           direction="closer_better"),
            ScoreDimension("void_method_ratio", weight=0.5,
                           reference_value=ref.void_method_ratio,
                           tolerance=tol("void_method_ratio", 0.15),
                           direction="closer_better"),

            # Complexity & Structure
            ScoreDimension("cognitive_complexity", weight=2.0,
                           reference_value=ref.cognitive_complexity_avg,
                           tolerance=tol("cognitive_complexity_avg", 3.0),
                           direction="closer_better"),
            ScoreDimension("max_nesting_depth", weight=1.5,
                           reference_value=float(ref.max_nesting_depth),
                           tolerance=tol("max_nesting_depth", 2.0),
                           direction="closer_better"),
            ScoreDimension("max_function_length", weight=1.5,
                           reference_value=float(ref.max_function_length),
                           tolerance=tol("max_function_length", 30.0),
                           direction="lower_better"),
            ScoreDimension("long_function_ratio", weight=1.5,
                           reference_value=ref.long_function_ratio,
                           direction="lower_better"),
            ScoreDimension("parameter_count_avg", weight=1.0,
                           reference_value=ref.parameter_count_avg,
                           tolerance=tol("parameter_count_avg", 1.0),
                           direction="closer_better"),
            ScoreDimension("high_param_ratio", weight=1.0,
                           reference_value=ref.high_param_ratio,
                           direction="lower_better"),
            ScoreDimension("early_return_ratio", weight=1.0,
                           reference_value=ref.early_return_ratio,
                           direction="higher_better"),
            ScoreDimension("single_responsibility", weight=1.5,
                           reference_value=ref.single_responsibility,
                           tolerance=tol("single_responsibility", 0.2),
                           direction="higher_better"),

            # Coupling & Cohesion
            ScoreDimension("instability_index", weight=1.5,
                           reference_value=ref.instability_index,
                           tolerance=tol("instability_index", 0.2),
                           direction="closer_better"),
            ScoreDimension("circular_dependencies", weight=2.0,
                           reference_value=float(ref.circular_dependency_count),
                           direction="lower_better"),
            ScoreDimension("cohesion_ratio", weight=1.5,
                           reference_value=ref.cohesion_ratio,
                           direction="higher_better"),
            ScoreDimension("god_class_count", weight=2.0,
                           reference_value=float(ref.god_class_count),
                           direction="lower_better"),

            # Naming & Legibility
            ScoreDimension("avg_identifier_length", weight=1.0,
                           reference_value=ref.avg_identifier_length,
                           tolerance=tol("avg_identifier_length", 4.0),
                           direction="closer_better"),
            ScoreDimension("short_name_ratio", weight=1.0,
                           reference_value=ref.short_name_ratio,
                           direction="lower_better"),
            ScoreDimension("semantic_name_score", weight=1.0,
                           reference_value=ref.semantic_name_score,
                           direction="higher_better"),
            ScoreDimension("naming_uniformity", weight=1.0,
                           reference_value=ref.naming_convention_uniformity,
                           direction="higher_better"),
            ScoreDimension("magic_number_density", weight=1.5,
                           reference_value=ref.magic_number_density,
                           direction="lower_better"),

            # Error Handling & Robustness
            ScoreDimension("error_boundary_coverage", weight=1.5,
                           reference_value=ref.error_boundary_coverage,
                           direction="higher_better"),
            ScoreDimension("empty_catch_count", weight=2.0,
                           reference_value=float(ref.empty_catch_count),
                           direction="lower_better"),
            ScoreDimension("null_safety_coverage", weight=1.5,
                           reference_value=ref.null_safety_coverage,
                           direction="higher_better"),

            # Duplication & Dead Code
            ScoreDimension("duplicate_block_ratio", weight=2.0,
                           reference_value=ref.duplicate_block_ratio,
                           direction="lower_better"),
            ScoreDimension("unused_parameter_ratio", weight=1.0,
                           reference_value=ref.unused_parameter_ratio,
                           direction="lower_better"),
            ScoreDimension("commented_code_ratio", weight=1.0,
                           reference_value=ref.commented_code_ratio,
                           direction="lower_better"),

            # Design Patterns
            ScoreDimension("interface_segregation", weight=1.0,
                           reference_value=ref.interface_segregation_score,
                           tolerance=tol("interface_segregation_score", 3.0),
                           direction="lower_better"),
            ScoreDimension("dependency_injection", weight=1.5,
                           reference_value=ref.dependency_injection_ratio,
                           direction="higher_better"),
            ScoreDimension("immutability_score", weight=1.5,
                           reference_value=ref.immutability_score,
                           direction="higher_better"),
            ScoreDimension("guard_clause_ratio", weight=1.0,
                           reference_value=ref.guard_clause_ratio,
                           direction="higher_better"),
        ]

    def _get_value(self, profile: CodeProfile, dim_name: str) -> float:
        """Get the value for a dimension from a profile.

        Uses _DIM_TO_ATTR mapping instead of a manual 60-line dict.
        """
        attr = _DIM_TO_ATTR.get(dim_name)
        if attr:
            return float(getattr(profile, attr, 0.0))
        # For boolean-like dimensions
        if dim_name == "discriminated_unions":
            return float(profile.discriminated_union_count > 0)
        if dim_name == "branded_types":
            return float(profile.branded_type_count > 0)
        return 0.0

    def score(self, target: CodeProfile) -> Tuple[float, Dict[str, Tuple[float, float, str]]]:
        """Score a project against the reference profile."""
        if not self.dimensions:
            return 0.5, {}

        details: Dict[str, Tuple[float, float, str]] = {}
        total_weighted = 0.0
        total_weight = 0.0

        for dim in self.dimensions:
            actual = self._get_value(target, dim.name)
            ref_val = dim.reference_value
            dim_score = dim.score(actual)

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
        """Automatically learn dimension weights from good/bad examples."""
        if not good_profiles or not bad_profiles or not self.dimensions:
            return

        for dim in self.dimensions:
            good_vals = [self._get_value(p, dim.name) for p in good_profiles]
            bad_vals = [self._get_value(p, dim.name) for p in bad_profiles]

            good_mean = sum(good_vals) / len(good_vals)
            bad_mean = sum(bad_vals) / len(bad_vals)

            diff = abs(good_mean - bad_mean)
            max_val = max(abs(good_mean), abs(bad_mean), 0.01)
            discrimination = diff / max_val

            dim.weight *= (1.0 + discrimination * 2.0)

    def _calibrate(self, reference_profiles: List[CodeProfile]):
        """Calibrate scorer so reference projects score >=80%."""
        if not reference_profiles or not self.dimensions:
            return

        TARGET = 0.80
        MAX_ROUNDS = 10

        for _round in range(MAX_ROUNDS):
            scores_per_ref: List[Tuple[float, Dict[str, float]]] = []
            for prof in reference_profiles:
                overall, details = self.score(prof)
                dim_scores = {name: s for name, (s, _w, _e) in details.items()}
                scores_per_ref.append((overall, dim_scores))

            min_score = min(s for s, _ in scores_per_ref)

            if min_score >= TARGET:
                break

            dim_min_scores: Dict[str, float] = {}
            for dim in self.dimensions:
                worst = min(ds.get(dim.name, 1.0) for _, ds in scores_per_ref)
                dim_min_scores[dim.name] = worst

            worst_dims = sorted(dim_min_scores.items(), key=lambda x: x[1])

            adjusted = False
            for dim_name, dim_min in worst_dims:
                if dim_min >= 0.85:
                    continue

                dim = next((d for d in self.dimensions if d.name == dim_name), None)
                if not dim:
                    continue

                if dim.direction == "closer_better":
                    dim.tolerance *= 1.5
                    adjusted = True
                elif dim.direction == "higher_better":
                    dim.reference_value *= 0.85
                    adjusted = True
                elif dim.direction == "lower_better":
                    dim.reference_value *= 1.2
                    adjusted = True

                if dim_min < 0.4:
                    dim.weight *= 0.7
                    adjusted = True

            if not adjusted:
                break

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
