"""Compaction — COMPATIBILITY SHIM. Real code lives in tools.compaction."""
from ..tools.compaction import (
    CompactedContext,
    needs_compaction,
    compact_type_summary,
    prepare_translation_context,
    build_prior_layers_context,
    topo_sort_types,
    generate_contracts,
    validate_imports,
    validate_enums,
    _extract_type_references,
    compact_type_oneliner,
    compact_layer_summary,
)

__all__ = [
    "CompactedContext", "needs_compaction", "compact_type_summary",
    "prepare_translation_context", "build_prior_layers_context",
    "topo_sort_types", "generate_contracts", "validate_imports",
    "validate_enums", "_extract_type_references",
    "compact_type_oneliner", "compact_layer_summary",
]
