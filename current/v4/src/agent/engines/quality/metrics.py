"""
Shared code metrics extraction — single source of truth for regex-based counting.

Eliminates duplication across quality_features.py, style_profile.py, and
learned_scorer.py which all computed the same regex patterns independently.

Feature scopes for cross-language KNN:
  UNIVERSAL   — transfers across languages without transformation
  NORMALIZED  — concept compatible, implementation differs by language
  TS_ONLY     — None in non-TypeScript languages
"""
import re
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional


class FeatureScope(Enum):
    UNIVERSAL = "universal"     # cross-language KNN without transformation
    NORMALIZED = "normalized"   # compatible with normalization between languages
    TS_ONLY = "ts_only"         # ignored in cross-language KNN


# Feature name → scope mapping
FEATURE_SCOPES: Dict[str, FeatureScope] = {
    # UNIVERSAL (12) — transfer without transformation
    "loc": FeatureScope.UNIVERSAL,
    "function_count": FeatureScope.UNIVERSAL,
    "class_count": FeatureScope.UNIVERSAL,
    "branch_count": FeatureScope.UNIVERSAL,
    "avg_identifier_length": FeatureScope.UNIVERSAL,
    "identifier_count": FeatureScope.UNIVERSAL,
    "inline_comment_count": FeatureScope.UNIVERSAL,
    "try_count": FeatureScope.UNIVERSAL,
    "catch_count": FeatureScope.UNIVERSAL,
    "throw_count": FeatureScope.UNIVERSAL,
    "event_indicator_count": FeatureScope.UNIVERSAL,
    "return_this_count": FeatureScope.UNIVERSAL,
    # Ratios (UNIVERSAL)
    "camel_case_ratio": FeatureScope.UNIVERSAL,
    "semantic_name_score": FeatureScope.UNIVERSAL,
    "generic_name_ratio": FeatureScope.UNIVERSAL,
    "algo_doc_score": FeatureScope.UNIVERSAL,

    # NORMALIZED (3) — concept compatible, value varies by language
    "any_count": FeatureScope.NORMALIZED,        # TS: any, Python: untyped params
    "generic_count": FeatureScope.NORMALIZED,     # TS: <T>, Python: TypeVar
    "readonly_count": FeatureScope.NORMALIZED,    # TS: readonly, Python: frozen

    # TS_ONLY (rest)
    "unknown_count": FeatureScope.TS_ONLY,
    "union_count": FeatureScope.TS_ONLY,
    "type_alias_count": FeatureScope.TS_ONLY,
    "record_any_count": FeatureScope.TS_ONLY,
    "interface_count": FeatureScope.TS_ONLY,
    "import_count": FeatureScope.TS_ONLY,
    "export_count": FeatureScope.TS_ONLY,
    "private_count": FeatureScope.TS_ONLY,
    "jsdoc_count": FeatureScope.TS_ONLY,
    "public_method_count": FeatureScope.TS_ONLY,
    "param_doc_count": FeatureScope.TS_ONLY,
    "typed_error_count": FeatureScope.TS_ONLY,
    "generic_error_count": FeatureScope.TS_ONLY,
    "optional_chaining_count": FeatureScope.TS_ONLY,
    "nullish_coalescing_count": FeatureScope.TS_ONLY,
    "ternary_count": FeatureScope.TS_ONLY,
    "const_count": FeatureScope.TS_ONLY,
    "let_count": FeatureScope.TS_ONLY,
}

# Convenience sets
UNIVERSAL_FEATURES = {k for k, v in FEATURE_SCOPES.items() if v == FeatureScope.UNIVERSAL}
NORMALIZED_FEATURES = {k for k, v in FEATURE_SCOPES.items() if v == FeatureScope.NORMALIZED}
CROSS_LANGUAGE_FEATURES = UNIVERSAL_FEATURES | NORMALIZED_FEATURES


@dataclass
class CodeMetrics:
    """Common metrics extracted from code via regex.

    All UNIVERSAL and NORMALIZED fields are always populated.
    TS_ONLY fields may be None for non-TypeScript languages.
    """
    language: str = "typescript"
    loc: int = 0

    # Types
    any_count: int = 0
    unknown_count: int = 0
    generic_count: int = 0
    union_count: int = 0
    type_alias_count: int = 0
    record_any_count: int = 0
    readonly_count: int = 0

    # Structure
    class_count: int = 0
    interface_count: int = 0
    function_count: int = 0
    import_count: int = 0
    export_count: int = 0
    private_count: int = 0

    # Naming
    camel_case_ratio: float = 0.0
    semantic_name_score: float = 0.0
    generic_name_ratio: float = 0.0
    avg_identifier_length: float = 0.0
    identifier_count: int = 0

    # Documentation
    jsdoc_count: int = 0
    public_method_count: int = 0
    inline_comment_count: int = 0
    param_doc_count: int = 0

    # Patterns
    try_count: int = 0
    catch_count: int = 0
    throw_count: int = 0
    branch_count: int = 0
    event_indicator_count: int = 0
    return_this_count: int = 0

    # Error handling detail
    typed_error_count: int = 0
    generic_error_count: int = 0

    # Conciseness
    optional_chaining_count: int = 0
    nullish_coalescing_count: int = 0
    ternary_count: int = 0
    const_count: int = 0
    let_count: int = 0

    # Algorithm docs
    algo_doc_score: float = 0.0

    # Empty catch ratio (cross-language)
    empty_catch_ratio: float = 0.0

    def to_knn_vector(self, cross_language: bool = False) -> Dict[str, float]:
        """Convert to dict for KNN comparison.

        cross_language=True: only UNIVERSAL + NORMALIZED features.
        cross_language=False: all features (same language only).
        """
        result = {}
        allowed = CROSS_LANGUAGE_FEATURES if cross_language else set(FEATURE_SCOPES.keys())
        for name in allowed:
            val = getattr(self, name, None)
            if val is not None:
                result[name] = float(val)
        return result


# ── Constants ──────────────────────────────────────────────

TS_KEYWORDS = frozenset({
    "import", "export", "from", "const", "let", "var", "function", "class",
    "interface", "type", "extends", "implements", "return", "if", "else",
    "for", "while", "switch", "case", "break", "continue", "new", "this",
    "true", "false", "null", "undefined", "void", "async", "await",
    "private", "public", "protected", "static", "readonly", "string",
    "number", "boolean", "any", "unknown", "never", "try", "catch",
    "throw", "typeof", "instanceof", "in", "of", "as", "is",
    "default", "super", "constructor",
})

GENERIC_NAMES = frozenset({
    "data", "result", "item", "obj", "tmp", "temp", "val", "value",
    "ret", "res", "output", "input", "info", "json", "args", "params",
    "x", "y", "z", "a", "b", "c", "d", "e", "n", "m", "k", "v",
})

SEMANTIC_INDICATORS = frozenset({
    "score", "weight", "threshold", "confidence", "priority", "depth",
    "finding", "evidence", "hypothesis", "step", "plan", "query",
    "paper", "citation", "reference", "node", "edge", "graph",
    "coverage", "similarity", "distance", "index", "cache", "pool",
})

ALGO_WORDS = [
    "algorithm", "complexity", "O(", "formula", "theorem",
    "bayesian", "probability", "coefficient", "entropy",
    "heuristic", "logarithm", "exponential", "decay",
    "weighted", "normalized", "TF-IDF", "bigram", "dice",
]


# ── Core extraction ────────────────────────────────────────

def extract_metrics(code: str) -> CodeMetrics:
    """Extract all common metrics from TypeScript code. Single source of truth."""
    m = CodeMetrics()
    lines = code.split("\n")
    m.loc = len(lines)

    # Types
    m.any_count = len(re.findall(r"\bany\b", code))
    m.unknown_count = len(re.findall(r"\bunknown\b", code))
    m.generic_count = len(re.findall(r"<\s*[A-Z]\w*(?:\s*,\s*[A-Z]\w*)*\s*>", code))
    m.union_count = len(re.findall(r"\w+\s*\|\s*\w+", code))
    m.type_alias_count = len(re.findall(
        r"^\s*(?:export\s+)?type\s+\w+\s*=", code, re.MULTILINE
    ))
    m.record_any_count = len(re.findall(r"Record<[^>]*,\s*any\s*>", code))
    m.readonly_count = len(re.findall(r"\breadonly\b", code))

    # Structure
    m.class_count = len(re.findall(r"\bclass\s+\w+", code))
    m.interface_count = len(re.findall(r"\binterface\s+\w+", code))
    m.import_count = len(re.findall(r"^\s*import\s+", code, re.MULTILINE))
    m.export_count = len(re.findall(r"^\s*export\s+", code, re.MULTILINE))
    m.private_count = len(re.findall(r"\bprivate\s+\w+\s*\(", code))

    # Function counting (same regex as quality_features)
    func_pattern = re.compile(
        r"(?:async\s+)?(?:private\s+|protected\s+|public\s+|static\s+)*"
        r"(?:function\s+\w+|(?:\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)"
    )
    m.function_count = sum(1 for line in lines if func_pattern.search(line))

    # Naming
    identifiers = re.findall(r"\b([a-zA-Z_]\w*)\b", code)
    user_ids = [i for i in identifiers if i not in TS_KEYWORDS and len(i) > 1]
    m.identifier_count = len(user_ids)

    if user_ids:
        camel = sum(1 for i in user_ids if re.match(r"^[a-z][a-zA-Z0-9]*$", i))
        m.camel_case_ratio = camel / len(user_ids)

        semantic = sum(
            1 for i in user_ids
            if any(s in i.lower() for s in SEMANTIC_INDICATORS)
        )
        m.semantic_name_score = semantic / len(user_ids)

        generic = sum(1 for i in user_ids if i.lower() in GENERIC_NAMES)
        m.generic_name_ratio = generic / len(user_ids)

        m.avg_identifier_length = sum(len(i) for i in user_ids) / len(user_ids)

    # Documentation
    m.jsdoc_count = len(re.findall(r"/\*\*[\s\S]*?\*/", code))
    public_methods = re.findall(
        r"^\s*(?:public\s+|async\s+)*\w+\s*\([^)]*\)", code, re.MULTILINE
    )
    m.public_method_count = len([p for p in public_methods if "constructor" not in p])
    m.inline_comment_count = len(re.findall(r"//\s*\S", code))
    m.param_doc_count = len(re.findall(r"@param\s+\w+", code))

    # Algorithm docs
    algo_count = sum(1 for word in ALGO_WORDS if word.lower() in code.lower())
    m.algo_doc_score = min(algo_count / 3.0, 1.0)

    # Patterns
    m.try_count = len(re.findall(r"\btry\s*\{", code))
    m.catch_count = len(re.findall(r"\bcatch\s*\(", code))
    m.throw_count = len(re.findall(r"\bthrow\s+new\s+\w+Error", code))
    m.branch_count = len(re.findall(r"\b(if|else|for|while|switch|case|catch)\b", code))
    m.event_indicator_count = len(re.findall(
        r"\b(emit|on[A-Z]\w+|addEventListener|subscribe|callback|listener)\b", code
    ))
    m.return_this_count = len(re.findall(r"return\s+this\s*;", code))

    # Error handling detail
    m.typed_error_count = len(re.findall(r"new\s+(?:Type|Range|Reference|Syntax)Error", code))
    m.generic_error_count = len(re.findall(r"new\s+Error\(", code))

    # Conciseness
    m.optional_chaining_count = len(re.findall(r"\?\.\w", code))
    m.nullish_coalescing_count = len(re.findall(r"\?\?\s", code))
    m.ternary_count = len(re.findall(r"[^?]\?[^?.:]\S.*:", code))
    m.const_count = len(re.findall(r"\bconst\b", code))
    m.let_count = len(re.findall(r"\blet\b", code))

    return m
