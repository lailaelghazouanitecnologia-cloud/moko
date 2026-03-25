"""
QualityFeatures — extracts 35 code quality features from TypeScript source.

Analyzes code at the file level (not per-error like FixEngine features).
Features are cheap to compute (regex + counting, no external calls).

Feature categories:
  - Structure (10): LOC, functions, classes, nesting, imports
  - Types (8): any usage, generics, unions, interfaces, type aliases
  - Naming (5): camelCase consistency, semantic richness, generic names
  - Documentation (4): JSDoc coverage, algorithm docs, parameter docs
  - Patterns (8): error handling, DI, event-driven, hardcoded strings, stubs
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


FEATURE_NAMES = [
    # Structure
    "loc", "function_count", "class_count", "interface_count",
    "max_nesting", "avg_function_length", "import_count", "export_count",
    "helper_ratio", "file_complexity",
    # Types
    "any_count", "unknown_count", "generic_usage", "union_type_count",
    "type_alias_count", "record_any_count", "proper_return_types", "void_ratio",
    # Naming
    "camel_case_ratio", "semantic_name_score", "generic_name_ratio",
    "single_char_vars", "descriptive_param_ratio",
    # Documentation
    "jsdoc_coverage", "has_algorithm_docs", "param_doc_ratio", "inline_comment_density",
    # Patterns
    "has_error_handling", "has_dependency_injection", "has_event_pattern",
    "hardcoded_string_count", "stub_indicator_score", "private_field_access",
    "magic_number_count", "fluent_api_score",
    # Encapsulation & correctness
    "public_field_ratio", "readonly_ratio", "typo_score",
]


@dataclass
class QualityFeatures:
    """35 quality features extracted from a TypeScript file."""
    # Structure
    loc: int = 0
    function_count: int = 0
    class_count: int = 0
    interface_count: int = 0
    max_nesting: int = 0
    avg_function_length: float = 0.0
    import_count: int = 0
    export_count: int = 0
    helper_ratio: float = 0.0       # private methods / total methods
    file_complexity: float = 0.0     # cyclomatic-ish: branches per LOC

    # Types
    any_count: int = 0
    unknown_count: int = 0
    generic_usage: int = 0           # <T>, <K, V> etc.
    union_type_count: int = 0        # a | b
    type_alias_count: int = 0        # type X = ...
    record_any_count: int = 0        # Record<string, any>
    proper_return_types: float = 0.0 # % of functions with explicit return type
    void_ratio: float = 0.0          # % of void returns

    # Naming
    camel_case_ratio: float = 0.0
    semantic_name_score: float = 0.0
    generic_name_ratio: float = 0.0  # data, result, item, obj, tmp
    single_char_vars: int = 0
    descriptive_param_ratio: float = 0.0

    # Documentation
    jsdoc_coverage: float = 0.0      # % of public methods with JSDoc
    has_algorithm_docs: float = 0.0  # mentions of algorithm/formula/complexity
    param_doc_ratio: float = 0.0
    inline_comment_density: float = 0.0

    # Patterns
    has_error_handling: float = 0.0
    has_dependency_injection: float = 0.0
    has_event_pattern: float = 0.0
    hardcoded_string_count: int = 0
    stub_indicator_score: float = 0.0
    private_field_access: int = 0     # this.x['field'] bracket access
    magic_number_count: int = 0
    fluent_api_score: float = 0.0     # methods returning 'this'

    # Encapsulation & correctness
    public_field_ratio: float = 0.0   # public non-method fields / total fields
    readonly_ratio: float = 0.0       # readonly fields / total fields
    typo_score: float = 0.0           # detected typo indicators

    def to_dict(self) -> Dict[str, float]:
        """Convert to flat dict for DB storage and classifier."""
        result = {}
        for name in FEATURE_NAMES:
            val = getattr(self, name, 0)
            result[name] = float(val) if isinstance(val, (int, float, bool)) else 0.0
        return result

    def to_vector(self) -> List[float]:
        """Convert to numeric list for classifier training."""
        return [float(getattr(self, name, 0)) for name in FEATURE_NAMES]


# Generic/meaningless variable names
GENERIC_NAMES = {
    "data", "result", "item", "obj", "tmp", "temp", "val", "value",
    "ret", "res", "output", "input", "info", "json", "args", "params",
    "x", "y", "z", "a", "b", "c", "d", "e", "n", "m", "k", "v",
}

# Semantic name indicators (domain-meaningful)
SEMANTIC_INDICATORS = {
    "score", "weight", "threshold", "confidence", "priority", "depth",
    "finding", "evidence", "hypothesis", "step", "plan", "query",
    "paper", "citation", "reference", "node", "edge", "graph",
    "coverage", "similarity", "distance", "index", "cache", "pool",
}

# Stub indicators in code
STUB_PATTERNS = [
    r"// TODO",
    r"// FIXME",
    r"// HACK",
    r"throw new Error\(['\"]not implemented",
    r"return \{\} as ",
    r"return null.*// stub",
    r"// placeholder",
    r"console\.log\(",         # leftover debugging
]


class QualityFeatureExtractor:
    """Extract quality features from TypeScript source code."""

    def extract(self, code: str, filename: str = "") -> QualityFeatures:
        """Analyze a TypeScript file and extract all 35 features."""
        features = QualityFeatures()
        lines = code.split("\n")
        features.loc = len(lines)

        self._extract_structure(features, code, lines)
        self._extract_types(features, code, lines)
        self._extract_naming(features, code, lines)
        self._extract_documentation(features, code, lines)
        self._extract_patterns(features, code, lines)

        return features

    def extract_module(self, files: Dict[str, str]) -> QualityFeatures:
        """Aggregate features across all files in a module."""
        if not files:
            return QualityFeatures()

        all_features = [self.extract(code, name) for name, code in files.items()]

        # Aggregate: sum counts, average ratios
        agg = QualityFeatures()
        n = len(all_features)

        # Sum counts
        for attr in ["loc", "function_count", "class_count", "interface_count",
                      "import_count", "export_count", "any_count", "unknown_count",
                      "generic_usage", "union_type_count", "type_alias_count",
                      "record_any_count", "single_char_vars", "hardcoded_string_count",
                      "private_field_access", "magic_number_count"]:
            setattr(agg, attr, sum(getattr(f, attr) for f in all_features))

        # Max for nesting
        agg.max_nesting = max((f.max_nesting for f in all_features), default=0)

        # Average ratios
        for attr in ["avg_function_length", "helper_ratio", "file_complexity",
                      "proper_return_types", "void_ratio", "camel_case_ratio",
                      "semantic_name_score", "generic_name_ratio", "descriptive_param_ratio",
                      "jsdoc_coverage", "has_algorithm_docs", "param_doc_ratio",
                      "inline_comment_density", "has_error_handling",
                      "has_dependency_injection", "has_event_pattern",
                      "stub_indicator_score", "fluent_api_score",
                      "public_field_ratio", "readonly_ratio", "typo_score"]:
            total = sum(getattr(f, attr) for f in all_features)
            setattr(agg, attr, total / n if n > 0 else 0.0)

        return agg

    # ── Structure ────────────────────────────────────────────

    def _extract_structure(self, f: QualityFeatures, code: str, lines: List[str]):
        # Functions
        func_pattern = re.compile(
            r"(?:async\s+)?(?:private\s+|protected\s+|public\s+|static\s+)*"
            r"(?:function\s+\w+|(?:\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)"
        )
        func_starts = []
        for i, line in enumerate(lines):
            if func_pattern.search(line):
                func_starts.append(i)
        f.function_count = len(func_starts)

        # Classes
        f.class_count = len(re.findall(r"\bclass\s+\w+", code))

        # Interfaces
        f.interface_count = len(re.findall(r"\binterface\s+\w+", code))

        # Imports / Exports
        f.import_count = len(re.findall(r"^\s*import\s+", code, re.MULTILINE))
        f.export_count = len(re.findall(r"^\s*export\s+", code, re.MULTILINE))

        # Max nesting depth (brace counting)
        max_depth = 0
        depth = 0
        for ch in code:
            if ch == "{":
                depth += 1
                max_depth = max(max_depth, depth)
            elif ch == "}":
                depth = max(0, depth - 1)
        f.max_nesting = max_depth

        # Average function length (rough: lines between function starts)
        if len(func_starts) >= 2:
            lengths = []
            for i in range(len(func_starts) - 1):
                lengths.append(func_starts[i + 1] - func_starts[i])
            f.avg_function_length = sum(lengths) / len(lengths)
        elif len(func_starts) == 1:
            f.avg_function_length = float(f.loc - func_starts[0])

        # Helper ratio: private methods / total methods
        private_count = len(re.findall(r"\bprivate\s+\w+\s*\(", code))
        total_methods = f.function_count
        f.helper_ratio = private_count / total_methods if total_methods > 0 else 0.0

        # Complexity: branches per LOC
        branches = len(re.findall(r"\b(if|else|for|while|switch|case|catch)\b", code))
        f.file_complexity = branches / max(f.loc, 1)

    # ── Types ────────────────────────────────────────────────

    def _extract_types(self, f: QualityFeatures, code: str, lines: List[str]):
        f.any_count = len(re.findall(r"\bany\b", code))
        f.unknown_count = len(re.findall(r"\bunknown\b", code))
        f.generic_usage = len(re.findall(r"<\s*[A-Z]\w*(?:\s*,\s*[A-Z]\w*)*\s*>", code))
        f.union_type_count = len(re.findall(r"\w+\s*\|\s*\w+", code))
        f.type_alias_count = len(re.findall(r"^\s*(?:export\s+)?type\s+\w+\s*=", code, re.MULTILINE))
        f.record_any_count = len(re.findall(r"Record<[^>]*,\s*any\s*>", code))

        # Return type coverage
        func_sigs = re.findall(r"\)\s*(?::\s*([^{=]+))?\s*[{=]", code)
        if func_sigs:
            typed = sum(1 for sig in func_sigs if sig and sig.strip())
            f.proper_return_types = typed / len(func_sigs)
            void_count = sum(1 for sig in func_sigs if sig and "void" in sig)
            f.void_ratio = void_count / len(func_sigs)

    # ── Naming ───────────────────────────────────────────────

    def _extract_naming(self, f: QualityFeatures, code: str, lines: List[str]):
        # Extract all identifiers (simplified)
        identifiers = re.findall(r"\b([a-zA-Z_]\w*)\b", code)
        # Filter out keywords and very short
        keywords = {
            "import", "export", "from", "const", "let", "var", "function", "class",
            "interface", "type", "extends", "implements", "return", "if", "else",
            "for", "while", "switch", "case", "break", "continue", "new", "this",
            "true", "false", "null", "undefined", "void", "async", "await",
            "private", "public", "protected", "static", "readonly", "string",
            "number", "boolean", "any", "unknown", "never", "try", "catch",
            "throw", "typeof", "instanceof", "in", "of", "as", "is",
            "default", "super", "constructor",
        }
        user_ids = [id for id in identifiers if id not in keywords and len(id) > 1]

        if user_ids:
            # camelCase consistency
            camel = sum(1 for id in user_ids if re.match(r"^[a-z][a-zA-Z0-9]*$", id))
            f.camel_case_ratio = camel / len(user_ids)

            # Semantic names
            semantic = sum(
                1 for id in user_ids
                if any(s in id.lower() for s in SEMANTIC_INDICATORS)
            )
            f.semantic_name_score = semantic / len(user_ids)

            # Generic names
            generic = sum(1 for id in user_ids if id.lower() in GENERIC_NAMES)
            f.generic_name_ratio = generic / len(user_ids)

        # Single-char variables
        f.single_char_vars = len(re.findall(
            r"(?:const|let|var)\s+([a-z])\s*[=:]", code
        ))

        # Parameter descriptiveness
        params = re.findall(r"\(([^)]*)\)", code)
        param_names = []
        for p in params:
            for part in p.split(","):
                part = part.strip()
                name_match = re.match(r"(\w+)", part)
                if name_match:
                    param_names.append(name_match.group(1))
        if param_names:
            descriptive = sum(1 for p in param_names if len(p) > 3 and p not in GENERIC_NAMES)
            f.descriptive_param_ratio = descriptive / len(param_names)

    # ── Documentation ────────────────────────────────────────

    def _extract_documentation(self, f: QualityFeatures, code: str, lines: List[str]):
        # JSDoc blocks
        jsdoc_blocks = re.findall(r"/\*\*[\s\S]*?\*/", code)
        public_methods = re.findall(
            r"^\s*(?:public\s+|async\s+)*\w+\s*\([^)]*\)", code, re.MULTILINE
        )
        # Exclude constructor
        public_methods = [m for m in public_methods if "constructor" not in m]

        if public_methods:
            f.jsdoc_coverage = min(len(jsdoc_blocks) / len(public_methods), 1.0)

        # Algorithm documentation (mentions math/algorithm concepts)
        algo_words = [
            "algorithm", "complexity", "O(", "formula", "theorem",
            "bayesian", "probability", "coefficient", "entropy",
            "heuristic", "logarithm", "exponential", "decay",
            "weighted", "normalized", "TF-IDF", "bigram", "dice",
        ]
        algo_count = sum(
            1 for word in algo_words if word.lower() in code.lower()
        )
        f.has_algorithm_docs = min(algo_count / 3.0, 1.0)

        # @param documentation
        param_docs = len(re.findall(r"@param\s+\w+", code))
        total_params = len(re.findall(r"\((?:[^)]*,)*[^)]+\)", code))
        f.param_doc_ratio = param_docs / max(total_params, 1)

        # Inline comments
        inline_comments = len(re.findall(r"//\s*\S", code))
        f.inline_comment_density = inline_comments / max(f.loc, 1)

    # ── Patterns ─────────────────────────────────────────────

    def _extract_patterns(self, f: QualityFeatures, code: str, lines: List[str]):
        # Error handling
        try_count = len(re.findall(r"\btry\s*\{", code))
        catch_count = len(re.findall(r"\bcatch\s*\(", code))
        throw_count = len(re.findall(r"\bthrow\s+new\s+\w+Error", code))
        f.has_error_handling = min((try_count + catch_count + throw_count) / 3.0, 1.0)

        # Dependency injection (constructor params that are stored)
        constructor = re.search(r"constructor\s*\(([^)]*)\)", code)
        if constructor:
            params = constructor.group(1)
            if params.strip():
                param_count = len([p for p in params.split(",") if p.strip()])
                if param_count > 0:
                    f.has_dependency_injection = min(param_count / 3.0, 1.0)

        # Event pattern (callbacks, listeners, emit)
        event_indicators = len(re.findall(
            r"\b(emit|on[A-Z]\w+|addEventListener|subscribe|callback|listener)\b", code
        ))
        f.has_event_pattern = min(event_indicators / 2.0, 1.0)

        # Hardcoded strings (string literals > 20 chars, excluding imports)
        hardcoded = re.findall(r"['\"]([^'\"]{20,})['\"]", code)
        # Exclude import paths
        hardcoded = [h for h in hardcoded if not h.startswith("./") and not h.startswith("../")]
        f.hardcoded_string_count = len(hardcoded)

        # Stub indicators
        stub_score = 0
        for pattern in STUB_PATTERNS:
            matches = len(re.findall(pattern, code, re.IGNORECASE))
            stub_score += matches
        f.stub_indicator_score = min(stub_score / 5.0, 1.0)

        # Private field bracket access (anti-pattern)
        f.private_field_access = len(re.findall(r"this\.\w+\[", code))

        # Magic numbers (numeric literals not 0, 1, -1, 2)
        numbers = re.findall(r"(?<!=\s)(?<!\w)(\d+\.?\d*)", code)
        magic = [n for n in numbers if n not in ("0", "1", "2", "-1", "0.0", "1.0")]
        f.magic_number_count = len(magic)

        # Fluent API (methods returning this)
        return_this = len(re.findall(r"return\s+this\s*;", code))
        f.fluent_api_score = min(return_this / max(f.function_count, 1), 1.0)

        # Encapsulation: public fields that should be private
        # Class fields without private/protected/readonly
        all_fields = re.findall(
            r"^\s+((?:public|private|protected|readonly|static)\s+)*(\w+)\s*[:=]",
            code, re.MULTILINE
        )
        if all_fields:
            public_fields = sum(
                1 for mods, name in all_fields
                if mods and "public" in mods and "readonly" not in mods
                or (not mods and name not in ("constructor", "get", "set"))
            )
            f.public_field_ratio = public_fields / max(len(all_fields), 1)

        # Readonly ratio
        readonly_count = len(re.findall(r"\breadonly\b", code))
        total_fields = len(re.findall(r"^\s+\w+\s*[:=]", code, re.MULTILINE))
        f.readonly_ratio = readonly_count / max(total_fields, 1)

        # Typo detection: doubled words in identifiers (TypeTypeError, EventEventEmitter)
        typo_indicators = 0
        # Doubled type names: new TypeError → good, new TypeTypeError → typo
        typo_indicators += len(re.findall(r"\b(\w{3,})\1", code))  # repeated substrings
        # Common LLM typos
        typo_patterns = [
            r"\bsnange\b", r"\bsements\b", r"\bpPressedKeys\b",
            r"\bTypeTypeError\b", r"\bEventEventEmitter\b",
            r"\bRangeRangeError\b", r"\bframeInput\b",
        ]
        for pat in typo_patterns:
            typo_indicators += len(re.findall(pat, code))
        f.typo_score = min(typo_indicators / 3.0, 1.0)


def detect_issues(features: QualityFeatures) -> List[Tuple[str, str, str]]:
    """Detect quality issues from features.

    Returns list of (issue_type, severity, description).
    """
    issues = []

    # Stub detection
    if features.stub_indicator_score > 0.2:
        issues.append(("stub_impl", "critical",
                        f"Stub indicators found (score={features.stub_indicator_score:.2f})"))

    # Weak types
    if features.any_count > 3:
        issues.append(("weak_types", "major",
                        f"{features.any_count} uses of 'any' type"))
    if features.record_any_count > 0:
        issues.append(("weak_types", "major",
                        f"{features.record_any_count} Record<*, any> usages"))

    # Bad naming
    if features.generic_name_ratio > 0.15:
        issues.append(("bad_naming", "minor",
                        f"Generic name ratio {features.generic_name_ratio:.0%}"))
    if features.single_char_vars > 5:
        issues.append(("bad_naming", "minor",
                        f"{features.single_char_vars} single-char variables"))

    # Missing docs
    if features.jsdoc_coverage < 0.3 and features.function_count > 3:
        issues.append(("no_docs", "minor",
                        f"JSDoc coverage only {features.jsdoc_coverage:.0%}"))

    # Shallow algorithms
    if features.has_algorithm_docs < 0.1 and features.file_complexity < 0.02:
        issues.append(("shallow_algorithm", "major",
                        "Low complexity suggests stub implementations"))

    # Private field access anti-pattern
    if features.private_field_access > 2:
        issues.append(("private_access", "major",
                        f"{features.private_field_access} bracket accesses to private fields"))

    # Missing error handling
    if features.has_error_handling < 0.1 and features.function_count > 5:
        issues.append(("missing_error_handling", "minor",
                        "No try/catch or typed throws found"))

    # No type safety
    if features.union_type_count == 0 and features.type_alias_count == 0 and features.loc > 100:
        issues.append(("weak_types", "minor",
                        "No union types or type aliases (consider discriminated unions)"))

    # Magic numbers
    if features.magic_number_count > 10:
        issues.append(("hardcoded_template", "style",
                        f"{features.magic_number_count} magic numbers (extract to constants)"))

    # Poor encapsulation: public mutable fields
    if features.public_field_ratio > 0.3 and features.class_count > 0:
        issues.append(("poor_encapsulation", "major",
                        f"Public field ratio {features.public_field_ratio:.0%} — use private + getters"))

    # Low readonly usage
    if features.readonly_ratio < 0.1 and features.class_count > 0 and features.loc > 50:
        issues.append(("weak_types", "minor",
                        "Low readonly usage — mark immutable fields readonly"))

    # Typos in code
    if features.typo_score > 0.1:
        issues.append(("code_typos", "critical",
                        f"Possible typos detected (score={features.typo_score:.2f})"))

    return issues
