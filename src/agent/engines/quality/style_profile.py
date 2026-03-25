"""
StyleProfile — learns and stores a user's coding style preferences.

Instead of imposing "Claude's style" universally, this module observes:
  1. User's existing code (reference projects, manual edits)
  2. Manual corrections the user makes to generated code
  3. Style patterns across their codebase

From these observations, builds a weighted profile that adjusts:
  - QualityEngine scoring weights
  - Which issues to flag vs ignore
  - How auto-fix strategies behave
  - What hints to give the LLM

The profile is persistent (JSON) and evolves with each project.
"""

import json
import os
import re
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple
from pathlib import Path


@dataclass
class StylePreference:
    """A single style dimension with observed preference."""
    dimension: str          # e.g. "naming_convention", "doc_density"
    value: float            # 0.0-1.0 (how strongly user prefers this)
    confidence: float       # 0.0-1.0 (how sure we are)
    observations: int = 0   # number of data points

    def update(self, observed_value: float, weight: float = 1.0):
        """Bayesian-ish update: blend new observation with existing."""
        self.observations += 1
        # Exponential moving average, higher weight for more observations
        alpha = weight / (self.observations + weight)
        self.value = (1 - alpha) * self.value + alpha * observed_value
        self.confidence = min(1.0, self.observations / 20.0)  # saturates at 20 obs


# All style dimensions we track
STYLE_DIMENSIONS = [
    # Naming
    "naming_camel_case",        # prefers camelCase (vs snake_case, etc.)
    "naming_verbose",           # prefers verbose names (vs short/abbreviated)
    "naming_semantic",          # uses domain-specific names
    "naming_hungarian",         # uses type prefixes (iCount, sName)

    # Types
    "types_strict",             # avoids any, uses unknown/generics
    "types_unions",             # uses discriminated unions
    "types_generics",           # uses generic constraints
    "types_aliases",            # defines type aliases

    # Documentation
    "docs_jsdoc",               # writes JSDoc on public methods
    "docs_inline",              # uses inline // comments
    "docs_algorithm",           # documents algorithm complexity/math
    "docs_param",               # documents parameters
    "docs_minimal",             # prefers minimal docs (code speaks)

    # Structure
    "struct_small_functions",   # prefers small focused functions
    "struct_helpers",           # extracts private helpers
    "struct_di",                # uses dependency injection
    "struct_events",            # uses event-driven patterns
    "struct_fluent",            # uses fluent/builder APIs
    "struct_functional",        # prefers functional style
    "struct_oop",               # prefers OOP with classes

    # Error handling
    "errors_typed",             # uses TypeError/RangeError (vs generic Error)
    "errors_defensive",         # validates inputs defensively
    "errors_graceful",          # graceful degradation (try/catch everywhere)

    # Code style
    "style_explicit_returns",   # always writes explicit return types
    "style_early_return",       # uses early returns (guard clauses)
    "style_ternary",            # uses ternary operators
    "style_readonly",           # marks fields readonly
    "style_const",              # prefers const over let
]


# ── Default Style (Claude-like) ─────────────────────────────
# These are the defaults when no user profile exists.
# Based on analysis of Claude-generated TypeScript code:
#   - Strict types: no 'any', heavy use of generics/unions
#   - Strong encapsulation: readonly, private fields
#   - OOP with DI and events
#   - Moderate documentation (JSDoc on public, algorithm notes)
#   - Early returns, const-first
#
# Inheritance: user observations override these. If confidence > 0
# on a dimension, the user's value takes precedence.

CLAUDE_DEFAULT_STYLE: Dict[str, float] = {
    # Naming — descriptive, semantic, camelCase
    "naming_camel_case": 0.9,
    "naming_verbose": 0.7,
    "naming_semantic": 0.8,
    "naming_hungarian": 0.05,

    # Types — strict, no any, generics + unions everywhere
    "types_strict": 0.95,
    "types_unions": 0.85,
    "types_generics": 0.8,
    "types_aliases": 0.7,

    # Documentation — moderate (JSDoc on public, algorithm notes)
    "docs_jsdoc": 0.7,
    "docs_inline": 0.4,
    "docs_algorithm": 0.6,
    "docs_param": 0.6,
    "docs_minimal": 0.2,

    # Structure — OOP with DI, events, small functions
    "struct_small_functions": 0.8,
    "struct_helpers": 0.7,
    "struct_di": 0.8,
    "struct_events": 0.7,
    "struct_fluent": 0.3,
    "struct_functional": 0.3,
    "struct_oop": 0.8,

    # Errors — typed exceptions, defensive
    "errors_typed": 0.8,
    "errors_defensive": 0.2,
    "errors_graceful": 0.5,

    # Code style — readonly, const, early returns
    "style_explicit_returns": 0.8,
    "style_early_return": 0.7,
    "style_ternary": 0.5,
    "style_readonly": 0.9,
    "style_const": 0.9,
}


@dataclass
class StyleProfile:
    """Persistent coding style profile for a user/project.

    Inheritance model:
      - CLAUDE_DEFAULT_STYLE provides sensible defaults
      - User observations (from reference projects, corrections) override defaults
      - If confidence > 0 on a dimension, user's value wins
      - If confidence == 0, Claude default is used
    """
    name: str = "default"
    preferences: Dict[str, StylePreference] = field(default_factory=dict)
    correction_history: List[Dict] = field(default_factory=list)
    source_projects: List[str] = field(default_factory=list)

    def __post_init__(self):
        # Initialize dimensions with Claude defaults (not neutral 0.5)
        for dim in STYLE_DIMENSIONS:
            if dim not in self.preferences:
                default_val = CLAUDE_DEFAULT_STYLE.get(dim, 0.5)
                self.preferences[dim] = StylePreference(
                    dimension=dim, value=default_val, confidence=0.0
                )

    def get(self, dimension: str) -> float:
        """Get preference value for a dimension (0-1)."""
        pref = self.preferences.get(dimension)
        return pref.value if pref else 0.5

    def confidence(self, dimension: str) -> float:
        """Get confidence for a dimension (0-1)."""
        pref = self.preferences.get(dimension)
        return pref.confidence if pref else 0.0

    def update(self, dimension: str, value: float, weight: float = 1.0):
        """Update a preference from an observation."""
        if dimension not in self.preferences:
            self.preferences[dimension] = StylePreference(
                dimension=dimension, value=0.5, confidence=0.0
            )
        self.preferences[dimension].update(value, weight)

    def strong_preferences(self, threshold: float = 0.6) -> Dict[str, float]:
        """Get preferences we're confident about (confidence > threshold)."""
        return {
            dim: pref.value
            for dim, pref in self.preferences.items()
            if pref.confidence >= threshold
        }

    def effective_preferences(self) -> Dict[str, float]:
        """Get effective preferences using inheritance model.

        For each dimension:
          - If user has observations (confidence > 0), use their learned value
          - Otherwise, use CLAUDE_DEFAULT_STYLE value
        This ensures hints are always emitted even without user data.
        """
        result: Dict[str, float] = {}
        for dim in STYLE_DIMENSIONS:
            pref = self.preferences.get(dim)
            if pref and pref.confidence > 0:
                result[dim] = pref.value  # user override
            else:
                result[dim] = CLAUDE_DEFAULT_STYLE.get(dim, 0.5)  # default
        return result

    def has_user_observations(self) -> bool:
        """Check if any dimension has been learned from user data."""
        return any(
            pref.confidence > 0 for pref in self.preferences.values()
        )

    def to_prompt_hints(self) -> List[str]:
        """Convert preferences to LLM prompt hints.

        Uses inheritance: Claude defaults when no user data,
        user preferences when learned. Returns max 8 hints.
        Ordered by impact: type safety > encapsulation > structure > naming.
        """
        hints = []
        # Use effective preferences (defaults + user overrides)
        eff = self.effective_preferences()

        # Types & encapsulation FIRST — biggest quality gap vs Claude
        if eff.get("types_strict", 0.5) > 0.7:
            hints.append("Never use 'any'. Prefer unknown, generics, or specific interfaces.")
        if eff.get("style_readonly", 0.5) > 0.7:
            hints.append("Mark ALL constructor-only fields as 'private readonly'. Use ReadonlyArray<T>.")
        if eff.get("types_generics", 0.5) > 0.7:
            hints.append("Use generic type parameters <T> for reusable containers, handlers, and stores.")
        if eff.get("types_unions", 0.5) > 0.7:
            hints.append("Use discriminated unions: type Result = {kind:'ok';value:T}|{kind:'error';error:string}.")
        if eff.get("types_aliases", 0.5) > 0.7:
            hints.append("Define type aliases for domain concepts (e.g., type TaskId = string & {__brand:'TaskId'}).")

        # Naming
        if eff.get("naming_semantic", 0.5) > 0.7:
            hints.append("Use domain-specific names, not generic ones (data, result, item).")

        # Documentation
        if eff.get("docs_minimal", 0.5) > 0.7:
            hints.append("Minimal documentation. Let the code speak for itself.")
        elif eff.get("docs_jsdoc", 0.5) > 0.7:
            hints.append("Add JSDoc to all public methods with @param descriptions.")
        if eff.get("docs_algorithm", 0.5) > 0.7:
            hints.append("Document algorithm complexity and mathematical foundations.")

        # Structure
        if eff.get("struct_small_functions", 0.5) > 0.7:
            hints.append("Keep functions small and focused. Extract helpers.")
        if eff.get("struct_di", 0.5) > 0.7:
            hints.append("Use dependency injection in constructors.")
        if eff.get("struct_events", 0.5) > 0.7:
            hints.append("Use event-driven patterns (callbacks, emitters).")
        if eff.get("struct_functional", 0.5) > 0.7:
            hints.append("Prefer functional style: pure functions, immutable data.")
        elif eff.get("struct_oop", 0.5) > 0.7:
            hints.append("Use OOP with classes, encapsulation, and inheritance.")

        # Error handling
        if eff.get("errors_typed", 0.5) > 0.7:
            hints.append("Use typed exceptions (TypeError, RangeError) not generic Error.")
        # NOTE: removed "validate all inputs defensively" — causes excessive boilerplate.
        # TypeScript's type system handles parameter validation.

        # Code style — conciseness
        if eff.get("style_early_return", 0.5) > 0.7:
            hints.append("Use early returns (guard clauses) to reduce nesting.")
        hints.append("Use ?. and ?? operators instead of null checks and || defaults.")
        hints.append("NO unnecessary comments. Do not add JSDoc that restates the method name.")
        hints.append("Do NOT add typeof/instanceof checks on typed parameters — trust the type system.")
        return hints[:10]  # cap to avoid prompt bloat

    def to_quality_weights(self) -> Dict[str, float]:
        """Convert preferences to QualityEngine scoring weights.

        Returns adjusted weights for the 5 quality dimensions:
        type_safety, naming, algorithm, documentation, structure
        """
        weights = {
            "type_safety": 0.25,
            "naming": 0.20,
            "algorithm": 0.20,
            "documentation": 0.15,
            "structure": 0.20,
        }

        # Adjust based on user preferences
        if self.get("types_strict") > 0.7:
            weights["type_safety"] += 0.05
        elif self.get("types_strict") < 0.3:
            weights["type_safety"] -= 0.05

        if self.get("docs_minimal") > 0.7:
            weights["documentation"] -= 0.05
            weights["algorithm"] += 0.05  # redistribute
        elif self.get("docs_jsdoc") > 0.7:
            weights["documentation"] += 0.05

        if self.get("naming_semantic") > 0.7:
            weights["naming"] += 0.05

        if self.get("struct_di") > 0.7 or self.get("struct_events") > 0.7:
            weights["structure"] += 0.05

        # Normalize to sum to 1.0
        total = sum(weights.values())
        return {k: v / total for k, v in weights.items()}

    # ── Persistence ──────────────────────────────────────────

    def save(self, path: str):
        """Save profile to JSON."""
        data = {
            "name": self.name,
            "preferences": {
                dim: {
                    "value": pref.value,
                    "confidence": pref.confidence,
                    "observations": pref.observations,
                }
                for dim, pref in self.preferences.items()
            },
            "correction_history": self.correction_history[-100:],  # keep last 100
            "source_projects": self.source_projects,
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def load(cls, path: str) -> "StyleProfile":
        """Load profile from JSON."""
        if not os.path.exists(path):
            return cls()
        with open(path) as f:
            data = json.load(f)
        profile = cls(name=data.get("name", "default"))
        for dim, pdata in data.get("preferences", {}).items():
            profile.preferences[dim] = StylePreference(
                dimension=dim,
                value=pdata["value"],
                confidence=pdata["confidence"],
                observations=pdata.get("observations", 0),
            )
        profile.correction_history = data.get("correction_history", [])
        profile.source_projects = data.get("source_projects", [])
        return profile


class StyleAnalyzer:
    """Analyzes code to extract style preferences."""

    def analyze_code(self, code: str, filename: str = "") -> Dict[str, float]:
        """Extract style signals from a code sample.

        Returns dict of dimension -> observed_value (0-1).
        """
        signals: Dict[str, float] = {}
        lines = code.split("\n")
        loc = len(lines)
        if loc < 5:
            return signals

        # ── Naming ───────────────────────────────────────────
        identifiers = re.findall(r"\b([a-zA-Z_]\w{2,})\b", code)
        if identifiers:
            # camelCase ratio
            camel = sum(1 for i in identifiers if re.match(r"^[a-z][a-zA-Z0-9]*$", i))
            signals["naming_camel_case"] = camel / len(identifiers)

            # Verbose: average identifier length
            avg_len = sum(len(i) for i in identifiers) / len(identifiers)
            signals["naming_verbose"] = min(avg_len / 15.0, 1.0)

            # Semantic names
            semantic_words = {
                "score", "weight", "threshold", "confidence", "priority",
                "finding", "evidence", "hypothesis", "step", "plan",
                "node", "edge", "graph", "coverage", "similarity",
            }
            semantic = sum(
                1 for i in identifiers
                if any(s in i.lower() for s in semantic_words)
            )
            signals["naming_semantic"] = min(semantic / max(len(identifiers) * 0.05, 1), 1.0)

        # ── Types ────────────────────────────────────────────
        any_count = len(re.findall(r"\bany\b", code))
        signals["types_strict"] = 1.0 - min(any_count / max(loc / 20, 1), 1.0)

        union_count = len(re.findall(r"\w+\s*\|\s*\w+", code))
        signals["types_unions"] = min(union_count / max(loc / 50, 1), 1.0)

        generic_count = len(re.findall(r"<\s*[A-Z]\w*(?:\s*,\s*[A-Z]\w*)*\s*>", code))
        signals["types_generics"] = min(generic_count / max(loc / 30, 1), 1.0)

        alias_count = len(re.findall(r"^\s*(?:export\s+)?type\s+\w+\s*=", code, re.MULTILINE))
        signals["types_aliases"] = min(alias_count / max(loc / 100, 1), 1.0)

        # ── Documentation ────────────────────────────────────
        jsdoc_count = len(re.findall(r"/\*\*", code))
        public_methods = len(re.findall(
            r"^\s*(?:public\s+|async\s+)*\w+\s*\([^)]*\)", code, re.MULTILINE
        ))
        signals["docs_jsdoc"] = jsdoc_count / max(public_methods, 1)

        inline_comments = len(re.findall(r"//\s*\S", code))
        signals["docs_inline"] = min(inline_comments / max(loc / 10, 1), 1.0)

        algo_words = ["algorithm", "O(", "formula", "bayesian", "entropy", "weighted"]
        algo_count = sum(1 for w in algo_words if w.lower() in code.lower())
        signals["docs_algorithm"] = min(algo_count / 2.0, 1.0)

        param_docs = len(re.findall(r"@param\s+\w+", code))
        signals["docs_param"] = min(param_docs / max(public_methods, 1), 1.0)

        # Minimal docs: low jsdoc + low inline = minimal preference
        if signals.get("docs_jsdoc", 0) < 0.2 and signals.get("docs_inline", 0) < 0.1:
            signals["docs_minimal"] = 0.8
        else:
            signals["docs_minimal"] = 0.2

        # ── Structure ────────────────────────────────────────
        func_count = len(re.findall(r"(?:function\s+\w+|\w+\s*\([^)]*\)\s*[:{])", code))
        if func_count > 0:
            # Avg function length (rough)
            signals["struct_small_functions"] = 1.0 - min(
                (loc / func_count) / 50.0, 1.0
            )

        private_count = len(re.findall(r"\bprivate\s+\w+\s*\(", code))
        signals["struct_helpers"] = min(private_count / max(func_count, 1), 1.0)

        # DI: constructor with injected params
        constructor = re.search(r"constructor\s*\(([^)]+)\)", code)
        if constructor:
            params = len([p for p in constructor.group(1).split(",") if p.strip()])
            signals["struct_di"] = min(params / 3.0, 1.0)
        else:
            signals["struct_di"] = 0.0

        # Events
        event_words = len(re.findall(r"\b(emit|on[A-Z]\w+|subscribe|callback|listener)\b", code))
        signals["struct_events"] = min(event_words / 3.0, 1.0)

        # Fluent
        return_this = len(re.findall(r"return\s+this\s*;", code))
        signals["struct_fluent"] = min(return_this / max(func_count, 1), 1.0)

        # OOP vs functional
        class_count = len(re.findall(r"\bclass\s+\w+", code))
        arrow_funcs = len(re.findall(r"=>\s*[{\(]", code))
        if class_count > 0 or arrow_funcs > 0:
            oop_signal = class_count / (class_count + max(arrow_funcs / 5, 0.1))
            signals["struct_oop"] = oop_signal
            signals["struct_functional"] = 1.0 - oop_signal

        # ── Error handling ───────────────────────────────────
        typed_errors = len(re.findall(r"new\s+(?:Type|Range|Reference|Syntax)Error", code))
        generic_errors = len(re.findall(r"new\s+Error\(", code))
        if typed_errors + generic_errors > 0:
            signals["errors_typed"] = typed_errors / (typed_errors + generic_errors)

        try_count = len(re.findall(r"\btry\s*\{", code))
        signals["errors_defensive"] = min(try_count / max(func_count / 3, 1), 1.0)
        signals["errors_graceful"] = signals["errors_defensive"]

        # ── Code style ───────────────────────────────────────
        explicit_returns = len(re.findall(r"\)\s*:\s*\w+", code))
        signals["style_explicit_returns"] = min(
            explicit_returns / max(func_count, 1), 1.0
        )

        early_returns = len(re.findall(r"^\s*if\s*\([^)]*\)\s*return\b", code, re.MULTILINE))
        signals["style_early_return"] = min(early_returns / max(func_count / 2, 1), 1.0)

        ternary_count = len(re.findall(r"\?\s*[^:]+\s*:", code))
        signals["style_ternary"] = min(ternary_count / max(loc / 20, 1), 1.0)

        readonly_count = len(re.findall(r"\breadonly\b", code))
        signals["style_readonly"] = min(readonly_count / max(loc / 50, 1), 1.0)

        const_count = len(re.findall(r"\bconst\b", code))
        let_count = len(re.findall(r"\blet\b", code))
        if const_count + let_count > 0:
            signals["style_const"] = const_count / (const_count + let_count)

        return signals

    def analyze_correction(
        self, original: str, corrected: str
    ) -> Dict[str, float]:
        """Analyze a manual correction to extract style preferences.

        Compares original (generated) vs corrected (user-edited) code
        to detect what the user changed and why.
        """
        orig_signals = self.analyze_code(original)
        corr_signals = self.analyze_code(corrected)

        # The corrected version represents what the user WANTS
        # Where they differ significantly, the corrected value is the preference
        preferences: Dict[str, float] = {}
        for dim in STYLE_DIMENSIONS:
            orig_val = orig_signals.get(dim, 0.5)
            corr_val = corr_signals.get(dim, 0.5)
            delta = abs(corr_val - orig_val)

            if delta > 0.1:
                # Significant change — user has a preference
                preferences[dim] = corr_val

        return preferences

    def learn_from_project(
        self, profile: StyleProfile, project_dir: str
    ) -> int:
        """Analyze all .ts files in a project to learn user style.

        Returns number of files analyzed.
        """
        path = Path(project_dir)
        if not path.exists():
            return 0

        files_analyzed = 0
        for ts_file in path.rglob("*.ts"):
            try:
                code = ts_file.read_text()
                if len(code.strip()) < 50:
                    continue
                signals = self.analyze_code(code, ts_file.name)
                for dim, value in signals.items():
                    profile.update(dim, value, weight=0.5)  # lower weight per file
                files_analyzed += 1
            except Exception:
                continue

        if project_dir not in profile.source_projects:
            profile.source_projects.append(project_dir)

        return files_analyzed

    def learn_from_correction(
        self, profile: StyleProfile, original: str, corrected: str,
        filename: str = "",
    ):
        """Learn from a manual correction with higher weight."""
        preferences = self.analyze_correction(original, corrected)
        for dim, value in preferences.items():
            profile.update(dim, value, weight=3.0)  # corrections weigh 3x

        profile.correction_history.append({
            "file": filename,
            "dimensions_changed": list(preferences.keys()),
            "values": {k: round(v, 3) for k, v in preferences.items()},
        })


def build_style_context(
    profile: StyleProfile,
    existing_context: str = "",
    type_name: str = "",
    module_name: str = "",
) -> str:
    """Build style hints that ADD VALUE beyond what context already shows.

    If the LLM already sees reference code with readonly fields, OOP classes,
    and unions — it doesn't need hints for those. Only emit hints for
    dimensions the context doesn't demonstrate.

    Args:
        profile: The user's style profile
        existing_context: The full prompt context (sibling code, cross-module, etc.)
        type_name: The type being generated (for specific hints)
        module_name: The module being generated
    """
    if not profile:
        return ""

    all_hints = profile.to_prompt_hints()
    if not all_hints:
        return ""

    # If no existing context, emit all hints
    if not existing_context:
        parts = ["## Style"]
        for h in all_hints:
            parts.append(f"- {h}")
        return "\n".join(parts)

    # Filter: only keep hints for things NOT visible in context
    ctx_lower = existing_context.lower()
    filtered = []
    for hint in all_hints:
        if _hint_already_visible(hint, ctx_lower):
            continue
        filtered.append(hint)

    if not filtered:
        return ""

    parts = ["## Style"]
    for h in filtered:
        parts.append(f"- {h}")
    return "\n".join(parts)


def _hint_already_visible(hint: str, context_lower: str) -> bool:
    """Check if a hint's concept is already demonstrated in the context code.

    Returns True if the context already shows this pattern → skip the hint.
    Returns False if the pattern is NOT visible → keep the hint.
    """
    hint_lower = hint.lower()

    # Type safety: always emit (absence of 'any' is hard to demonstrate)
    if "'any'" in hint_lower or "unknown" in hint_lower:
        return False

    # Naming: can't infer from context, always emit
    if "domain-specific" in hint_lower or "semantic" in hint_lower:
        return False

    # Small functions: can't see from signatures alone
    if "small and focused" in hint_lower:
        return False

    # These CAN be verified in context
    checks = [
        ("readonly", ["readonly "]),
        ("opp", ["export class ", "class "]),      # typo-safe
        ("oop", ["export class ", "class "]),
        ("classes", ["export class ", "class "]),
        ("functional", ["=> {"]),
        ("dependency injection", ["constructor(private", "constructor( private"]),
        ("event-driven", ["emit(", ".on(", "subscribe(", "listener"]),
        ("event pattern", ["emit(", ".on(", "subscribe(", "listener"]),
        ("typed exception", ["typeerror", "rangeerror", "syntaxerror"]),
        ("early return", ["if (", "return "]),     # too common, usually visible
        ("jsdoc", ["/**"]),
        ("discriminated union", [" | '", ' | "']),
        ("union", [" | '"]),
        ("fluent", ["return this"]),
    ]

    for keyword, patterns in checks:
        if keyword in hint_lower:
            if any(p in context_lower for p in patterns):
                return True  # visible → skip

    return False  # not visible → keep
