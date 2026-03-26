"""Data models for Project Intelligence (.pi.yaml)."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore


# ── Metrics ──────────────────────────────────────────────────────────

@dataclass
class MetricsGlobal:
    total_loc: int = 0
    total_modules: int = 0
    total_types: int = 0
    total_functions: int = 0

@dataclass
class MetricsPerModule:
    avg_loc: float = 0.0
    median_loc: float = 0.0
    max_loc: int = 0
    min_loc: int = 0
    std_dev: float = 0.0

@dataclass
class MetricsPerType:
    avg_loc: float = 0.0
    median_loc: float = 0.0
    avg_methods: float = 0.0
    median_methods: float = 0.0
    avg_fields: float = 0.0

@dataclass
class MetricsPerFunction:
    avg_loc: float = 0.0
    avg_params: float = 0.0
    async_ratio: float = 0.0

@dataclass
class Metrics:
    glob: MetricsGlobal = field(default_factory=MetricsGlobal)
    per_module: MetricsPerModule = field(default_factory=MetricsPerModule)
    per_type: MetricsPerType = field(default_factory=MetricsPerType)
    per_function: MetricsPerFunction = field(default_factory=MetricsPerFunction)


# ── Style ────────────────────────────────────────────────────────────

@dataclass
class NamingStyle:
    modules: str = ""           # snake_case, kebab-case, etc.
    classes: str = ""           # PascalCase
    methods: str = ""           # camelCase, snake_case
    constants: str = ""         # UPPER_SNAKE
    private_prefix: str = ""    # "_", "#", none
    examples: List[str] = field(default_factory=list)

@dataclass
class ErrorHandlingStyle:
    strategy: str = ""          # exceptions, result_types, error_codes
    custom_exceptions: bool = False
    retry_pattern: bool = False
    graceful_degradation: bool = False
    empty_catches: str = "unknown"  # none, rare, common

@dataclass
class AsyncStyle:
    style: str = ""             # asyncio, promises, callbacks, none
    blocking_workaround: str = ""
    context_managers: bool = False

@dataclass
class TypingStyle:
    strictness: str = ""        # none, basic, moderate, strict
    dataclasses: bool = False
    generics: bool = False
    protocols: bool = False
    optional_handling: str = ""

@dataclass
class DocumentationStyle:
    module_docstrings: str = ""  # none, brief, rich
    method_docstrings: str = ""  # none, selective, all
    inline_comments: str = ""    # none, sparse, moderate, heavy
    style: str = ""              # google, numpy, jsdoc, none

@dataclass
class OrganizationStyle:
    file_per_class: str = ""     # always, mostly, mixed
    barrel_exports: bool = False
    max_file_loc: int = 0
    layer_separation: bool = False

@dataclass
class StyleProfile:
    naming: NamingStyle = field(default_factory=NamingStyle)
    error_handling: ErrorHandlingStyle = field(default_factory=ErrorHandlingStyle)
    async_style: AsyncStyle = field(default_factory=AsyncStyle)
    typing: TypingStyle = field(default_factory=TypingStyle)
    documentation: DocumentationStyle = field(default_factory=DocumentationStyle)
    organization: OrganizationStyle = field(default_factory=OrganizationStyle)


# ── Patterns, Features, Decisions ────────────────────────────────────

@dataclass
class ArchPattern:
    name: str = ""
    what: str = ""              # what does this pattern do
    how: str = ""               # how does it work (algorithm sketch)
    components: List[str] = field(default_factory=list)
    where: str = ""             # which module(s)
    loc: int = 0
    reusable_when: str = ""     # when should this pattern be applied

@dataclass
class Feature:
    name: str = ""
    description: str = ""
    algorithm: str = ""         # how it works technically
    key_insight: str = ""       # the clever part
    modules: List[str] = field(default_factory=list)
    loc: int = 0
    complexity: str = ""        # low, medium, high

@dataclass
class DesignDecision:
    area: str = ""              # persistence, error_handling, architecture, etc.
    choice: str = ""            # what was chosen
    why: str = ""               # rationale


# ── Dependency Graph ─────────────────────────────────────────────────

@dataclass
class DependencyGraph:
    layers: List[List[str]] = field(default_factory=list)  # [[utils], [config, platform], ...]
    coupling: str = ""          # loose, moderate, tight
    style: str = ""             # layered, flat, microservice
    hub_module: str = ""        # most depended-on module


# ── Quality Targets ──────────────────────────────────────────────────

@dataclass
class Percentiles:
    p25: float = 0.0
    median: float = 0.0
    p75: float = 0.0
    max: float = 0.0

@dataclass
class QualityTargets:
    loc_per_type: Percentiles = field(default_factory=Percentiles)
    methods_per_type: Percentiles = field(default_factory=Percentiles)
    loc_per_function: Percentiles = field(default_factory=Percentiles)
    params_per_function: Percentiles = field(default_factory=Percentiles)
    error_handling: str = ""    # none, low, moderate, high
    test_coverage: str = ""     # none, minimal, moderate, high


# ── Top-level Intelligence ───────────────────────────────────────────

@dataclass
class ProjectIntelligence:
    """Complete intelligence profile for a reference project."""
    project: str = ""
    analyzed: str = ""
    source: str = ""

    # Identity
    purpose: str = ""
    domain: str = ""
    language: str = ""
    size_tier: str = ""         # small(<5K), medium(<20K), large(<100K), massive(100K+)
    maturity: str = ""          # prototype, alpha, beta, production

    # Sections
    metrics: Metrics = field(default_factory=Metrics)
    style: StyleProfile = field(default_factory=StyleProfile)
    patterns: List[ArchPattern] = field(default_factory=list)
    features: List[Feature] = field(default_factory=list)
    decisions: List[DesignDecision] = field(default_factory=list)
    dependency_graph: DependencyGraph = field(default_factory=DependencyGraph)
    quality: QualityTargets = field(default_factory=QualityTargets)

    def save(self, path: Path):
        """Save as .pi.yaml."""
        if yaml is None:
            raise RuntimeError("pyyaml required")
        data = _to_dict(self)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.dump(data, default_flow_style=False,
                                   allow_unicode=True, sort_keys=False, width=120))

    def save_markdown(self, path: Path):
        """Save human-readable .pi.md report."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(self._render_markdown())

    @classmethod
    def load(cls, path: Path) -> "ProjectIntelligence":
        """Load from .pi.yaml."""
        if yaml is None:
            raise RuntimeError("pyyaml required")
        data = yaml.safe_load(path.read_text())
        return _from_dict(cls, data)

    def _render_markdown(self) -> str:
        lines = []
        lines.append(f"# Project Intelligence: {self.project}")
        lines.append("")
        lines.append(f"> {self.purpose}")
        lines.append(f"> **Domain**: {self.domain} | **Language**: {self.language} "
                      f"| **Size**: {self.size_tier} | **Maturity**: {self.maturity}")
        lines.append("")

        # Metrics
        m = self.metrics
        lines.append("## Metrics")
        lines.append("")
        lines.append(f"| Metric | Value |")
        lines.append(f"|--------|-------|")
        lines.append(f"| Total LOC | {m.glob.total_loc:,} |")
        lines.append(f"| Modules | {m.glob.total_modules} |")
        lines.append(f"| Types | {m.glob.total_types} |")
        lines.append(f"| Functions | {m.glob.total_functions} |")
        lines.append(f"| Avg LOC/module | {m.per_module.avg_loc:.0f} |")
        lines.append(f"| Median LOC/type | {m.per_type.median_loc:.0f} |")
        lines.append(f"| Avg methods/type | {m.per_type.avg_methods:.1f} |")
        lines.append(f"| Async ratio | {m.per_function.async_ratio:.0%} |")
        lines.append("")

        # Style
        s = self.style
        lines.append("## Programming Style")
        lines.append("")
        lines.append(f"**Naming**: {s.naming.modules} modules, {s.naming.classes} classes, "
                      f"{s.naming.methods} methods")
        if s.naming.examples:
            lines.append(f"  Examples: {', '.join(f'`{e}`' for e in s.naming.examples)}")
        lines.append(f"**Error handling**: {s.error_handling.strategy}"
                      + (", retry patterns" if s.error_handling.retry_pattern else "")
                      + (", graceful degradation" if s.error_handling.graceful_degradation else ""))
        lines.append(f"**Async**: {s.async_style.style}"
                      + (f" ({s.async_style.blocking_workaround})" if s.async_style.blocking_workaround else ""))
        lines.append(f"**Typing**: {s.typing.strictness}"
                      + (", generics" if s.typing.generics else "")
                      + (", dataclasses" if s.typing.dataclasses else ""))
        lines.append(f"**Docs**: {s.documentation.module_docstrings} module docs, "
                      f"{s.documentation.inline_comments} comments")
        lines.append(f"**Organization**: {s.organization.file_per_class} file-per-class, "
                      f"barrel exports: {'yes' if s.organization.barrel_exports else 'no'}")
        lines.append("")

        # Patterns
        if self.patterns:
            lines.append("## Architectural Patterns")
            lines.append("")
            for p in self.patterns:
                lines.append(f"### {p.name}")
                lines.append(f"**What**: {p.what}")
                lines.append(f"**How**: {p.how}")
                lines.append(f"**Components**: {', '.join(p.components)}")
                lines.append(f"**Where**: {p.where} ({p.loc:,} LOC)")
                lines.append(f"**Reusable when**: {p.reusable_when}")
                lines.append("")

        # Features
        if self.features:
            lines.append("## Features")
            lines.append("")
            lines.append("| Feature | Description | Algorithm | Complexity | LOC |")
            lines.append("|---------|-------------|-----------|------------|-----|")
            for f in self.features:
                lines.append(f"| **{f.name}** | {f.description} | {f.algorithm} | {f.complexity} | {f.loc:,} |")
            lines.append("")

        # Decisions
        if self.decisions:
            lines.append("## Design Decisions")
            lines.append("")
            lines.append("| Area | Choice | Rationale |")
            lines.append("|------|--------|-----------|")
            for d in self.decisions:
                lines.append(f"| {d.area} | {d.choice} | {d.why} |")
            lines.append("")

        # Dependency graph
        dg = self.dependency_graph
        if dg.layers:
            lines.append("## Dependency Graph")
            lines.append("")
            lines.append(f"**Style**: {dg.style} | **Coupling**: {dg.coupling} | "
                          f"**Hub**: {dg.hub_module}")
            lines.append("```")
            for i, layer in enumerate(dg.layers):
                prefix = f"L{i}"
                lines.append(f"  {prefix}: [{', '.join(layer)}]")
            lines.append("```")
            lines.append("")

        # Quality
        q = self.quality
        lines.append("## Quality Calibration")
        lines.append("")
        lines.append("| Metric | P25 | Median | P75 | Max |")
        lines.append("|--------|-----|--------|-----|-----|")
        lines.append(f"| LOC/type | {q.loc_per_type.p25:.0f} | {q.loc_per_type.median:.0f} "
                      f"| {q.loc_per_type.p75:.0f} | {q.loc_per_type.max:.0f} |")
        lines.append(f"| Methods/type | {q.methods_per_type.p25:.0f} | {q.methods_per_type.median:.0f} "
                      f"| {q.methods_per_type.p75:.0f} | {q.methods_per_type.max:.0f} |")
        lines.append(f"| LOC/function | {q.loc_per_function.p25:.0f} | {q.loc_per_function.median:.0f} "
                      f"| {q.loc_per_function.p75:.0f} | {q.loc_per_function.max:.0f} |")
        lines.append(f"| Error handling: {q.error_handling} | Test coverage: {q.test_coverage} |")
        lines.append("")

        return "\n".join(lines)


def _to_dict(obj) -> dict:
    """Convert dataclass to dict, handling nested dataclasses and lists."""
    if hasattr(obj, '__dataclass_fields__'):
        result = {}
        for k, v in obj.__dataclass_fields__.items():
            val = getattr(obj, k)
            if hasattr(val, '__dataclass_fields__'):
                result[k] = _to_dict(val)
            elif isinstance(val, list):
                result[k] = [_to_dict(item) if hasattr(item, '__dataclass_fields__') else item
                             for item in val]
            else:
                result[k] = val
        return result
    return obj


def _from_dict(cls, data: dict):
    """Reconstruct dataclass from dict."""
    if data is None:
        return cls()
    if not isinstance(data, dict):
        return cls()

    import dataclasses
    import typing

    # Map of known list item types by field name
    _LIST_TYPES = {
        "patterns": ArchPattern,
        "features": Feature,
        "decisions": DesignDecision,
        "layers": None,  # List[List[str]] — leave as-is
        "examples": None,
        "components": None,
        "modules": None,
    }

    fields = {f.name: f for f in dataclasses.fields(cls)}
    kwargs = {}
    for name, f in fields.items():
        if name not in data:
            continue
        val = data[name]
        ftype = f.type

        # Resolve string annotations
        if isinstance(ftype, str):
            ftype_str = ftype.strip("'\"")
            # Check module-level types
            local_types = {
                "Metrics": Metrics, "StyleProfile": StyleProfile,
                "DependencyGraph": DependencyGraph, "QualityTargets": QualityTargets,
                "MetricsGlobal": MetricsGlobal, "MetricsPerModule": MetricsPerModule,
                "MetricsPerType": MetricsPerType, "MetricsPerFunction": MetricsPerFunction,
                "NamingStyle": NamingStyle, "ErrorHandlingStyle": ErrorHandlingStyle,
                "AsyncStyle": AsyncStyle, "TypingStyle": TypingStyle,
                "DocumentationStyle": DocumentationStyle, "OrganizationStyle": OrganizationStyle,
                "Percentiles": Percentiles,
            }
            if ftype_str in local_types:
                ftype = local_types[ftype_str]

        # Dataclass field → recurse
        if hasattr(ftype, '__dataclass_fields__') and isinstance(val, dict):
            kwargs[name] = _from_dict(ftype, val)
            continue

        # List field → check for known item types
        if isinstance(val, list):
            item_cls = _LIST_TYPES.get(name)
            if item_cls and hasattr(item_cls, '__dataclass_fields__'):
                kwargs[name] = [_from_dict(item_cls, v) if isinstance(v, dict) else v
                                for v in val]
            else:
                kwargs[name] = val
            continue

        kwargs[name] = val

    return cls(**kwargs)
