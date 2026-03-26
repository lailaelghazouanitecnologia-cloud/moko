"""
CodeProfile — statistical profile of a codebase's quality characteristics.

Extracted from learned_scorer.py for modularity. Each metric is a normalized
density (per 100 LOC or per-file ratio) so projects of different sizes are comparable.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict


@dataclass
class CodeProfile:
    """Statistical profile of a codebase's quality characteristics."""
    # Identity
    name: str = ""
    total_loc: int = 0
    total_files: int = 0

    # Type system usage (per 100 LOC)
    readonly_density: float = 0.0
    generic_density: float = 0.0
    union_density: float = 0.0
    type_alias_density: float = 0.0
    any_density: float = 0.0
    unknown_density: float = 0.0

    # Pattern sophistication
    discriminated_union_count: int = 0
    branded_type_count: int = 0
    const_assertion_count: int = 0
    mapped_type_count: int = 0
    conditional_type_count: int = 0

    # Architecture (ratios)
    avg_class_size: float = 0.0
    avg_method_count: float = 0.0
    private_ratio: float = 0.0
    interface_to_class_ratio: float = 0.0
    export_ratio: float = 0.0

    # Implementation depth
    avg_complexity: float = 0.0
    avg_function_length: float = 0.0
    error_handling_density: float = 0.0
    validation_density: float = 0.0

    # Consistency
    complexity_stddev: float = 0.0
    method_count_stddev: float = 0.0
    naming_consistency: float = 0.0

    # Cross-module coherence
    import_coherence: float = 0.0
    type_reuse_ratio: float = 0.0
    dead_export_ratio: float = 0.0

    # Code conciseness
    comment_density: float = 0.0
    unnecessary_comment_ratio: float = 0.0
    optional_chaining_density: float = 0.0
    nullish_coalescing_density: float = 0.0
    ternary_ratio: float = 0.0
    boilerplate_ratio: float = 0.0
    literal_type_density: float = 0.0
    avg_exports_per_file: float = 0.0
    void_method_ratio: float = 0.0

    # Complexity & Structure (ts_analyzer)
    cognitive_complexity_avg: float = 0.0
    max_nesting_depth: int = 0
    avg_nesting_depth: float = 0.0
    max_function_length: int = 0
    long_function_ratio: float = 0.0
    parameter_count_avg: float = 0.0
    high_param_ratio: float = 0.0
    return_point_count_avg: float = 0.0
    early_return_ratio: float = 0.0
    single_responsibility: float = 0.0

    # Coupling & Cohesion
    afferent_coupling_avg: float = 0.0
    efferent_coupling_avg: float = 0.0
    instability_index: float = 0.0
    dependency_depth: int = 0
    circular_dependency_count: int = 0
    cohesion_ratio: float = 0.0
    module_size_variance: float = 0.0
    god_class_count: int = 0

    # Naming & Legibility
    avg_identifier_length: float = 0.0
    short_name_ratio: float = 0.0
    semantic_name_score: float = 0.0
    naming_convention_uniformity: float = 0.0
    magic_number_density: float = 0.0
    meaningful_constant_ratio: float = 0.0

    # Error Handling & Robustness
    error_boundary_coverage: float = 0.0
    empty_catch_count: int = 0
    assertion_density: float = 0.0
    null_safety_coverage: float = 0.0
    unhandled_promise_ratio: float = 0.0

    # Duplication & Dead Code
    duplicate_block_ratio: float = 0.0
    dead_code_ratio: float = 0.0
    unused_parameter_ratio: float = 0.0
    commented_code_ratio: float = 0.0

    # Design Patterns
    interface_segregation_score: float = 0.0
    dependency_injection_ratio: float = 0.0
    immutability_score: float = 0.0
    factory_pattern_count: int = 0
    guard_clause_ratio: float = 0.0

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "CodeProfile":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})

    def get_metric(self, name: str) -> float:
        """Get a metric value by name. Returns 0.0 if not found."""
        return float(getattr(self, name, 0.0))
