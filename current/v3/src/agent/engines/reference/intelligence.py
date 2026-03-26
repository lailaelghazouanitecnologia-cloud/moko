"""
IntelligenceGenerator — synthesize Roska descriptors into Project Intelligence.

Reads workspace.yaml, meta.yaml, module.yaml, and file descriptors to produce
a rich .pi.yaml that captures EVERYTHING about a project: style, patterns,
features, algorithms, decisions, quality targets.

Automatic extraction (no LLM): metrics, style, dependency graph, quality targets.
LLM synthesis (2 calls): identity/patterns/features/decisions.
"""
from __future__ import annotations

import json
import math
import re
import statistics
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .models import (
    ProjectIntelligence, Metrics, MetricsGlobal, MetricsPerModule,
    MetricsPerType, MetricsPerFunction, StyleProfile, NamingStyle,
    ErrorHandlingStyle, AsyncStyle, TypingStyle, DocumentationStyle,
    OrganizationStyle, ArchPattern, Feature, DesignDecision,
    DependencyGraph, QualityTargets, Percentiles,
)

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore


class IntelligenceGenerator:
    """Generate Project Intelligence from Roska descriptors."""

    def __init__(self, out_dir: Path, llm=None, verbose: bool = False):
        self.out_dir = out_dir
        self.llm = llm
        self.verbose = verbose
        self.total_tokens = 0

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [intel] {msg}")

    def generate(self, project_name: str) -> ProjectIntelligence:
        """Generate full intelligence for a project."""
        ref_dir = self.out_dir / project_name

        # Load raw Roska data
        workspace = self._load_yaml(ref_dir / "workspace.yaml")
        meta = self._load_yaml(ref_dir / "graphs" / "meta.yaml")
        modules = self._load_modules(ref_dir, meta)
        descriptors = self._load_all_descriptors(ref_dir)

        pi = ProjectIntelligence(
            project=project_name,
            analyzed=date.today().isoformat(),
            source=f"references/{project_name}",
        )

        # ── Automatic extraction (no LLM) ───────────────────────
        self._log("extracting metrics...")
        pi.metrics = self._extract_metrics(workspace, meta, modules, descriptors)

        self._log("analyzing style...")
        pi.style = self._extract_style(descriptors, workspace)

        self._log("building dependency graph...")
        pi.dependency_graph = self._extract_dependency_graph(meta)

        self._log("computing quality targets...")
        pi.quality = self._extract_quality_targets(modules, descriptors)

        # Determine size tier
        loc = pi.metrics.glob.total_loc
        if loc < 5000:
            pi.size_tier = "small"
        elif loc < 20000:
            pi.size_tier = "medium"
        elif loc < 100000:
            pi.size_tier = "large"
        else:
            pi.size_tier = "massive"

        # Detect language from descriptors
        pi.language = self._detect_language(ref_dir)

        # ── LLM synthesis (patterns, features, decisions) ────────
        if self.llm:
            self._log("LLM: synthesizing patterns, features, decisions...")
            context = self._build_llm_context(workspace, meta, modules, descriptors)
            llm_result = self._llm_synthesis(context, project_name)
            if llm_result:
                pi.purpose = llm_result.get("purpose", "")
                pi.domain = llm_result.get("domain", "")
                pi.maturity = llm_result.get("maturity", "production")
                pi.patterns = self._parse_patterns(llm_result.get("patterns", []))
                pi.features = self._parse_features(llm_result.get("features", []))
                pi.decisions = self._parse_decisions(llm_result.get("decisions", []))
        else:
            # Fallback: basic identity from workspace
            pi.purpose = workspace.get("name", project_name) if workspace else project_name
            pi.domain = "unknown"
            pi.maturity = "unknown"

        return pi

    # ── Metrics Extraction ────────────────────────────────────────

    def _extract_metrics(self, workspace: dict, meta: dict,
                         modules: Dict[str, dict],
                         descriptors: List[dict]) -> Metrics:
        m = Metrics()

        # Global from workspace
        if workspace:
            m.glob.total_loc = workspace.get("total_lines", 0)
            m.glob.total_files = workspace.get("total_files", 0)

        # From meta graph
        if meta:
            nodes = [n for n in meta.get("nodes", []) if n.get("id") != "__root__"]
            m.glob.total_modules = len(nodes)

            stats = meta.get("stats", {})
            m.glob.total_types = stats.get("types", 0)
            m.glob.total_functions = stats.get("functions", 0)

            # Per-module metrics from node lines
            mod_locs = [n.get("lines", 0) for n in nodes if n.get("lines", 0) > 0]
            if mod_locs:
                m.per_module.avg_loc = statistics.mean(mod_locs)
                m.per_module.median_loc = statistics.median(mod_locs)
                m.per_module.max_loc = max(mod_locs)
                m.per_module.min_loc = min(mod_locs)
                if len(mod_locs) > 1:
                    m.per_module.std_dev = statistics.stdev(mod_locs)

        # Per-type and per-function from descriptors
        type_locs = []
        type_methods = []
        type_fields = []
        func_locs = []
        func_params = []
        async_count = 0
        total_funcs = 0

        for desc in descriptors:
            for t in desc.get("types", []):
                lines = t.get("lines", [0, 0])
                if isinstance(lines, list) and len(lines) == 2:
                    tloc = lines[1] - lines[0]
                    if tloc > 0:
                        type_locs.append(tloc)
                methods = t.get("methods", [])
                type_methods.append(len(methods))
                type_fields.append(len(t.get("fields", [])))

                for method in methods:
                    total_funcs += 1
                    if method.get("is_async"):
                        async_count += 1
                    mlines = method.get("lines", [0, 0])
                    if isinstance(mlines, list) and len(mlines) == 2:
                        floc = mlines[1] - mlines[0]
                        if floc > 0:
                            func_locs.append(floc)
                    sig = method.get("sig", "")
                    params = self._count_params(sig)
                    func_params.append(params)

            for f in desc.get("functions", []):
                total_funcs += 1
                if f.get("is_async"):
                    async_count += 1
                flines = f.get("lines", [0, 0])
                if isinstance(flines, list) and len(flines) == 2:
                    floc = flines[1] - flines[0]
                    if floc > 0:
                        func_locs.append(floc)
                sig = f.get("sig", "")
                func_params.append(self._count_params(sig))

        if type_locs:
            m.per_type.avg_loc = statistics.mean(type_locs)
            m.per_type.median_loc = statistics.median(type_locs)
        if type_methods:
            m.per_type.avg_methods = statistics.mean(type_methods)
            m.per_type.median_methods = statistics.median(type_methods)
        if type_fields:
            m.per_type.avg_fields = statistics.mean(type_fields)
        if func_locs:
            m.per_function.avg_loc = statistics.mean(func_locs)
        if func_params:
            m.per_function.avg_params = statistics.mean(func_params)
        if total_funcs > 0:
            m.per_function.async_ratio = async_count / total_funcs

        return m

    # ── Style Extraction ──────────────────────────────────────────

    def _extract_style(self, descriptors: List[dict],
                       workspace: dict) -> StyleProfile:
        s = StyleProfile()

        # Collect all names for analysis
        type_names = []
        method_names = []
        field_names = []
        func_names = []
        has_exceptions = False
        has_retry = False
        has_async = False
        async_style = ""
        has_dataclasses = False
        has_generics = False
        has_protocols = False
        docstring_richness = []
        file_locs = []
        files_with_one_class = 0
        files_with_multi_class = 0
        has_barrel = False
        decorator_set = set()

        for desc in descriptors:
            purpose = desc.get("purpose", "")
            if purpose:
                docstring_richness.append(len(purpose))

            file_path = desc.get("file", "")
            flines = desc.get("lines", 0)
            if flines:
                file_locs.append(flines)

            types_in_file = desc.get("types", [])
            if len(types_in_file) == 1:
                files_with_one_class += 1
            elif len(types_in_file) > 1:
                files_with_multi_class += 1

            for t in types_in_file:
                name = t.get("name", "")
                if name:
                    type_names.append(name)

                kind = t.get("kind", "")
                if kind in ("struct", "class") and t.get("bases"):
                    for base in t.get("bases", []):
                        if "Exception" in str(base) or "Error" in str(base):
                            has_exceptions = True

                for method in t.get("methods", []):
                    mname = method.get("name", "")
                    if mname:
                        method_names.append(mname)
                    if method.get("is_async"):
                        has_async = True
                    for dec in method.get("decorators", []):
                        decorator_set.add(dec)
                        if "retry" in dec.lower():
                            has_retry = True

                for field in t.get("fields", []):
                    fname = field.get("name", "")
                    if fname:
                        field_names.append(fname)
                    ftype = str(field.get("type", ""))
                    if "Generic" in ftype or "<" in ftype:
                        has_generics = True
                    if "Protocol" in ftype:
                        has_protocols = True

                bases = t.get("bases", [])
                for base in bases:
                    base_s = str(base)
                    if "dataclass" in base_s.lower() or kind == "struct":
                        has_dataclasses = True

            for f in desc.get("functions", []):
                fname = f.get("name", "")
                if fname:
                    func_names.append(fname)
                if f.get("is_async"):
                    has_async = True

            # Check imports for patterns
            for imp in desc.get("imports", []):
                sym = imp.get("sym", "")
                if "asyncio" in sym:
                    async_style = "asyncio"
                elif "async" in sym.lower() and not async_style:
                    async_style = "async/await"
                if "__init__" in file_path:
                    has_barrel = True

        # Naming analysis
        s.naming = self._analyze_naming(type_names, method_names, field_names, func_names)

        # Error handling
        s.error_handling.strategy = "exceptions" if has_exceptions else "mixed"
        s.error_handling.custom_exceptions = has_exceptions
        s.error_handling.retry_pattern = has_retry
        s.error_handling.graceful_degradation = has_retry  # correlated

        # Async
        s.async_style.style = async_style or ("asyncio" if has_async else "sync")
        if "asyncio" in async_style:
            s.async_style.blocking_workaround = "asyncio.to_thread"
        s.async_style.context_managers = "contextmanager" in decorator_set

        # Typing
        strictness = "basic"
        if has_generics and has_dataclasses:
            strictness = "moderate"
        if has_protocols:
            strictness = "strict"
        s.typing.strictness = strictness
        s.typing.dataclasses = has_dataclasses
        s.typing.generics = has_generics
        s.typing.protocols = has_protocols

        # Documentation
        if docstring_richness:
            avg_doc_len = statistics.mean(docstring_richness)
            if avg_doc_len > 100:
                s.documentation.module_docstrings = "rich"
            elif avg_doc_len > 30:
                s.documentation.module_docstrings = "brief"
            else:
                s.documentation.module_docstrings = "none"
        s.documentation.method_docstrings = "selective"
        s.documentation.inline_comments = "sparse"

        # Organization
        total_typed_files = files_with_one_class + files_with_multi_class
        if total_typed_files > 0:
            ratio = files_with_one_class / total_typed_files
            if ratio > 0.8:
                s.organization.file_per_class = "always"
            elif ratio > 0.5:
                s.organization.file_per_class = "mostly"
            else:
                s.organization.file_per_class = "mixed"
        s.organization.barrel_exports = has_barrel
        s.organization.max_file_loc = max(file_locs) if file_locs else 0
        s.organization.layer_separation = True  # from Roska layer analysis

        return s

    def _analyze_naming(self, type_names, method_names, field_names, func_names) -> NamingStyle:
        ns = NamingStyle()

        # Type naming
        pascal_types = sum(1 for n in type_names if n and n[0].isupper() and "_" not in n)
        if type_names and pascal_types / max(len(type_names), 1) > 0.7:
            ns.classes = "PascalCase"
        else:
            ns.classes = "mixed"

        # Method naming
        snake_methods = sum(1 for n in method_names if "_" in n and n == n.lower())
        camel_methods = sum(1 for n in method_names if not "_" in n and n and n[0].islower())
        if method_names:
            total = max(len(method_names), 1)
            if snake_methods / total > 0.7:
                ns.methods = "snake_case"
            elif camel_methods / total > 0.7:
                ns.methods = "camelCase"
            else:
                ns.methods = "mixed"

        # Module naming (from file paths — inferred)
        ns.modules = "snake_case"  # Python default

        # Private prefix
        private_names = [n for n in method_names + field_names if n.startswith("_") and not n.startswith("__")]
        if len(private_names) > 5:
            ns.private_prefix = "_"

        # Constants
        upper_names = [n for n in field_names if n == n.upper() and "_" in n and len(n) > 2]
        if upper_names:
            ns.constants = "UPPER_SNAKE"

        # Examples
        examples = []
        if type_names:
            examples.append(type_names[0])
        if method_names:
            examples.extend(method_names[:2])
        ns.examples = examples[:5]

        return ns

    # ── Dependency Graph ──────────────────────────────────────────

    def _extract_dependency_graph(self, meta: dict) -> DependencyGraph:
        dg = DependencyGraph()
        if not meta:
            return dg

        nodes = {n["id"]: n for n in meta.get("nodes", []) if n.get("id") != "__root__"}
        edges = meta.get("internal_edges", [])

        # Build adjacency: who depends on whom
        deps: Dict[str, set] = {nid: set() for nid in nodes}
        depended_on: Dict[str, int] = {nid: 0 for nid in nodes}

        for edge in edges:
            src = edge.get("from", "")
            dst = edge.get("to", "")
            if src in nodes and dst in nodes and src != dst:
                deps[src].add(dst)
                depended_on[dst] = depended_on.get(dst, 0) + 1

        # Find hub (most depended-on)
        if depended_on:
            dg.hub_module = max(depended_on, key=depended_on.get)

        # Topological layering
        remaining = set(nodes.keys())
        resolved = set()
        layers = []

        for _ in range(len(nodes) + 1):
            if not remaining:
                break
            layer = []
            for nid in list(remaining):
                real_deps = deps[nid] & remaining
                if real_deps <= resolved:
                    layer.append(nid)
            if not layer:
                # Circular — dump rest
                layer = sorted(remaining)
            for nid in layer:
                remaining.discard(nid)
                resolved.add(nid)
            layers.append(sorted(layer))

        dg.layers = layers
        dg.style = "layered" if len(layers) > 2 else "flat"

        # Coupling: avg fan-out
        fan_outs = [len(d) for d in deps.values()]
        avg_fan = statistics.mean(fan_outs) if fan_outs else 0
        if avg_fan < 1:
            dg.coupling = "loose"
        elif avg_fan < 2.5:
            dg.coupling = "moderate"
        else:
            dg.coupling = "tight"

        return dg

    # ── Quality Targets ───────────────────────────────────────────

    def _extract_quality_targets(self, modules: Dict[str, dict],
                                  descriptors: List[dict]) -> QualityTargets:
        qt = QualityTargets()

        type_locs = []
        type_method_counts = []
        func_locs = []
        param_counts = []
        has_error_handling = 0
        total_public_funcs = 0

        for desc in descriptors:
            for t in desc.get("types", []):
                lines = t.get("lines", [0, 0])
                if isinstance(lines, list) and len(lines) == 2:
                    tloc = lines[1] - lines[0]
                    if tloc > 0:
                        type_locs.append(tloc)
                type_method_counts.append(len(t.get("methods", [])))

                for method in t.get("methods", []):
                    mlines = method.get("lines", [0, 0])
                    if isinstance(mlines, list) and len(mlines) == 2:
                        floc = mlines[1] - mlines[0]
                        if floc > 0:
                            func_locs.append(floc)
                    sig = method.get("sig", "")
                    param_counts.append(self._count_params(sig))
                    vis = method.get("vis", "public")
                    if vis == "public" or not method.get("name", "").startswith("_"):
                        total_public_funcs += 1

            for f in desc.get("functions", []):
                flines = f.get("lines", [0, 0])
                if isinstance(flines, list) and len(flines) == 2:
                    floc = flines[1] - flines[0]
                    if floc > 0:
                        func_locs.append(floc)
                param_counts.append(self._count_params(f.get("sig", "")))

        qt.loc_per_type = self._percentiles(type_locs)
        qt.methods_per_type = self._percentiles(type_method_counts)
        qt.loc_per_function = self._percentiles(func_locs)
        qt.params_per_function = self._percentiles(param_counts)

        # Error handling assessment based on style analysis
        qt.error_handling = "moderate"  # default, refined by LLM
        qt.test_coverage = "none"  # TODO: detect test files

        return qt

    def _percentiles(self, values: List[float]) -> Percentiles:
        if not values:
            return Percentiles()
        s = sorted(values)
        n = len(s)
        return Percentiles(
            p25=s[max(0, n // 4)],
            median=statistics.median(s),
            p75=s[min(n - 1, 3 * n // 4)],
            max=max(s),
        )

    # ── LLM Synthesis ─────────────────────────────────────────────

    def _build_llm_context(self, workspace: dict, meta: dict,
                            modules: Dict[str, dict],
                            descriptors: List[dict]) -> str:
        """Build compact context for LLM synthesis (patterns + features)."""
        parts = []

        # Workspace overview
        if workspace:
            parts.append(f"## Project: {workspace.get('name', 'unknown')}")
            parts.append(f"Total: {workspace.get('total_lines', 0)} LOC, "
                          f"{workspace.get('total_files', 0)} files")
            mods = workspace.get("modules", [])
            if mods:
                parts.append("Modules:")
                for mod in mods:
                    parts.append(f"  - {mod.get('name')}: {mod.get('lines', 0)} LOC, "
                                  f"{mod.get('types', 0)} types, {mod.get('functions', 0)} funcs")
            parts.append("")

        # Module purposes (from module.yaml files)
        for mod_name, mod_data in modules.items():
            files = mod_data.get("files", [])
            if files:
                parts.append(f"## Module: {mod_name} ({mod_data.get('total_lines', 0)} LOC)")
                for f in files[:8]:  # cap at 8 files per module
                    purpose = f.get("purpose", "")
                    if purpose:
                        # Truncate long purposes
                        if len(purpose) > 200:
                            purpose = purpose[:200] + "..."
                        parts.append(f"  {f.get('file')}: {purpose}")
                parts.append("")

        # Rich descriptors: include type names + method signatures for key modules
        # Only include descriptors with >3 types (rich modules)
        rich_count = 0
        for desc in descriptors:
            types = desc.get("types", [])
            if len(types) < 2:
                continue
            if rich_count >= 15:  # cap context
                break

            file_path = desc.get("file", "unknown")
            parts.append(f"### {file_path}")
            for t in types[:5]:  # cap types per file
                name = t.get("name", "")
                kind = t.get("kind", "class")
                methods = t.get("methods", [])
                parts.append(f"  {kind} {name}: {len(methods)} methods, "
                              f"{len(t.get('fields', []))} fields")
                # Include key method signatures
                for m in methods[:6]:
                    sig = m.get("sig", "")
                    if sig:
                        async_prefix = "async " if m.get("is_async") else ""
                        parts.append(f"    {async_prefix}{m.get('name', '')}{sig}")
            parts.append("")
            rich_count += 1

        return "\n".join(parts)

    def _llm_synthesis(self, context: str, project_name: str) -> Optional[dict]:
        """Use LLM to synthesize patterns, features, and decisions."""
        if not self.llm:
            return None

        from ...llm.providers import LLMMessage

        system = """You are a software architect analyzing a codebase. Given Roska descriptors
(module structure, types, methods, signatures), extract:

Output JSON with these keys:
{
  "purpose": "one-sentence project purpose",
  "domain": "category (ai_agents, web_framework, cli_tool, game_engine, etc.)",
  "maturity": "prototype|alpha|beta|production",
  "patterns": [
    {
      "name": "pattern-name (kebab-case)",
      "what": "what this pattern does",
      "how": "algorithm/mechanism sketch",
      "components": ["component1", "component2"],
      "where": "module_name",
      "loc": 1500,
      "reusable_when": "when to apply this pattern"
    }
  ],
  "features": [
    {
      "name": "feature_name",
      "description": "what it does",
      "algorithm": "how it works technically",
      "key_insight": "the clever/important part",
      "modules": ["module1"],
      "loc": 1000,
      "complexity": "low|medium|high"
    }
  ],
  "decisions": [
    {
      "area": "persistence|error_handling|architecture|coupling|identity|etc",
      "choice": "what was chosen",
      "why": "rationale"
    }
  ]
}

Rules:
- Extract 3-8 patterns (recurring architectural solutions)
- Extract 5-12 features (concrete capabilities)
- Extract 3-8 decisions (key technical choices)
- Be SPECIFIC: include actual algorithm names, data structures, strategies
- LOC estimates should be reasonable
- Focus on what makes this project INTERESTING, not obvious boilerplate
- Output ONLY JSON."""

        user = f"Project: {project_name}\n\n{context}"

        try:
            resp = self.llm.complete_with_usage(
                [LLMMessage("system", system), LLMMessage("user", user)],
                temperature=0.3, max_tokens=4096,
            )
            self.total_tokens += resp.usage.total_tokens
            self._log(f"  LLM synthesis: {resp.usage.total_tokens} tokens")
            return self._parse_json(resp.content)
        except Exception as e:
            self._log(f"  LLM synthesis failed: {e}")
            return None

    def _parse_patterns(self, raw: list) -> List[ArchPattern]:
        patterns = []
        for p in raw:
            if not isinstance(p, dict):
                continue
            patterns.append(ArchPattern(
                name=p.get("name", ""),
                what=p.get("what", ""),
                how=p.get("how", ""),
                components=p.get("components", []),
                where=p.get("where", ""),
                loc=p.get("loc", 0),
                reusable_when=p.get("reusable_when", ""),
            ))
        return patterns

    def _parse_features(self, raw: list) -> List[Feature]:
        features = []
        for f in raw:
            if not isinstance(f, dict):
                continue
            features.append(Feature(
                name=f.get("name", ""),
                description=f.get("description", ""),
                algorithm=f.get("algorithm", ""),
                key_insight=f.get("key_insight", ""),
                modules=f.get("modules", []),
                loc=f.get("loc", 0),
                complexity=f.get("complexity", "medium"),
            ))
        return features

    def _parse_decisions(self, raw: list) -> List[DesignDecision]:
        decisions = []
        for d in raw:
            if not isinstance(d, dict):
                continue
            decisions.append(DesignDecision(
                area=d.get("area", ""),
                choice=d.get("choice", ""),
                why=d.get("why", ""),
            ))
        return decisions

    # ── Helpers ────────────────────────────────────────────────────

    def _load_yaml(self, path: Path) -> dict:
        if not path.exists() or yaml is None:
            return {}
        try:
            return yaml.safe_load(path.read_text()) or {}
        except Exception:
            return {}

    def _load_modules(self, ref_dir: Path, meta: dict) -> Dict[str, dict]:
        """Load module.yaml for each module in the meta graph."""
        modules = {}
        if not meta:
            return modules
        for node in meta.get("nodes", []):
            mod_id = node.get("id", "")
            if not mod_id or mod_id == "__root__":
                continue
            mod_yaml = ref_dir / mod_id / "module.yaml"
            data = self._load_yaml(mod_yaml)
            if data:
                modules[mod_id] = data
        return modules

    def _load_all_descriptors(self, ref_dir: Path) -> List[dict]:
        """Load all file-level YAML descriptors recursively."""
        descriptors = []
        if not ref_dir.exists() or yaml is None:
            return descriptors
        for yaml_file in sorted(ref_dir.rglob("*.yaml")):
            if yaml_file.name in ("workspace.yaml", "module.yaml", "meta.yaml", "deps.yaml"):
                continue
            if "graphs" in yaml_file.parts:
                continue
            try:
                data = yaml.safe_load(yaml_file.read_text())
                if isinstance(data, dict) and ("types" in data or "functions" in data):
                    descriptors.append(data)
            except Exception:
                continue
        return descriptors

    def _detect_language(self, ref_dir: Path) -> str:
        """Detect primary language from file extensions in descriptors."""
        py_count = 0
        ts_count = 0
        for yaml_file in ref_dir.rglob("*.yaml"):
            name = yaml_file.stem
            # Check parent directory for clues
            try:
                data = yaml.safe_load(yaml_file.read_text()) if yaml else {}
                file_path = data.get("file", "") if isinstance(data, dict) else ""
                if file_path.endswith(".py"):
                    py_count += 1
                elif file_path.endswith(".ts") or file_path.endswith(".tsx"):
                    ts_count += 1
            except Exception:
                continue
            if py_count + ts_count > 20:
                break  # enough to decide
        if py_count > ts_count:
            return "python"
        elif ts_count > py_count:
            return "typescript"
        return "mixed"

    def _count_params(self, sig: str) -> int:
        if not sig:
            return 0
        # Extract params between parentheses
        m = re.search(r'\(([^)]*)\)', sig)
        if not m:
            return 0
        params = m.group(1).strip()
        if not params or params == "self" or params == "cls":
            return 0
        # Remove self/cls
        params = re.sub(r'^(self|cls)\s*,?\s*', '', params)
        if not params:
            return 0
        return len([p for p in params.split(",") if p.strip()])

    def _parse_json(self, text: str) -> dict:
        text = text.strip()
        # Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        # Try extracting from markdown fences
        if "```" in text:
            parts = text.split("```")
            for part in parts[1:]:
                candidate = part.strip()
                if candidate.startswith("json"):
                    candidate = candidate[4:].strip()
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    continue
        # Try finding JSON object in text
        brace_start = text.find("{")
        if brace_start >= 0:
            # Find matching closing brace
            depth = 0
            for i in range(brace_start, len(text)):
                if text[i] == "{":
                    depth += 1
                elif text[i] == "}":
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(text[brace_start:i + 1])
                        except json.JSONDecodeError:
                            break
        raise ValueError(f"Could not parse JSON from: {text[:100]}...")
