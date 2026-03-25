"""
BlueprintComposer — composes blueprints from multiple real sources.

The core principle: APIs come from EXTRACTION, not LLM invention.

Composition flow:
  1. EmissionIndex finds relevant descriptors for a type
  2. SourceExtractor extracts real signatures from source code
  3. SemanticStore deduplicates across projects (mul ≈ multiply)
  4. CodeBlockStore provides previously-used high-quality blocks
  5. Composer merges all sources by priority/confidence
  6. LLM only ENRICHES: adds hints, adapts naming, flags gaps

This replaces the old generate_blueprint() which made 1 LLM call
that invented everything from sparse descriptor names.
"""
from __future__ import annotations

import yaml
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from ...dev.blueprint import ModuleBlueprint, TypeBlueprint, MethodSpec, FieldSpec
from ...dev.emission import EmissionIndex
from ...llm.providers import LLMProvider, LLMMessage
from ..embedding.store import SemanticStore
from ..embedding.similarity import NameNormalizer
from ..memory.block_store import CodeBlockStore
from ..prompt.composer_prompts import (
    ENRICH_SYSTEM, ENRICH_USER_TEMPLATE,
    GAP_ANALYSIS_SYSTEM, GAP_USER_TEMPLATE,
)
from .extractor import SourceExtractor, ExtractedType, ExtractedMethod


@dataclass
class CompositionSource:
    """One source of data for composing a type blueprint."""
    origin: str                  # "extraction", "store", "emission", "llm"
    project: str                 # source project name
    type_name: str
    methods: list[ExtractedMethod] = field(default_factory=list)
    fields: list[FieldSpec] = field(default_factory=list)
    extends: str = ""
    confidence: float = 0.0      # how reliable (extraction=0.95, store=0.8, emission=0.5)
    descriptor_path: str = ""

    @property
    def method_names(self) -> set[str]:
        return {m.name for m in self.methods}


@dataclass
class CompositionPlan:
    """Plan for how to compose a TypeBlueprint from multiple sources."""
    type_name: str
    sources: list[CompositionSource] = field(default_factory=list)
    merge_strategy: str = "priority"  # priority, union, intersection
    estimated_coverage: float = 0.0
    needs_llm_enrichment: bool = True
    total_unique_methods: int = 0


class BlueprintComposer:
    """Composes blueprints from multiple real sources.

    Orchestrates: EmissionIndex + SourceExtractor + SemanticStore + CodeBlockStore
    to build TypeBlueprints from real code, not LLM invention.
    """

    def __init__(self, llm: LLMProvider,
                 emission_index: EmissionIndex = None,
                 extractor: SourceExtractor = None,
                 semantic_store: SemanticStore = None,
                 block_store: CodeBlockStore = None,
                 verbose: bool = False):
        self.llm = llm
        self.emission = emission_index
        self.extractor = extractor
        self.semantic = semantic_store
        self.block_store = block_store
        self.verbose = verbose
        self.total_tokens = 0

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [composer] {msg}")

    @staticmethod
    def _sanitize_yaml_values(text: str) -> str:
        """Quote YAML values that contain characters that break parsing."""
        import re
        result_lines = []
        for line in text.split('\n'):
            m = re.match(r'^(\s*)(type|sig|hint|default|description):\s*(.+)$', line)
            if m:
                indent, key, value = m.group(1), m.group(2), m.group(3)
                if not ((value.startswith('"') and value.endswith('"')) or
                        (value.startswith("'") and value.endswith("'"))):
                    needs_quote = (
                        ':' in value or '<' in value or '>' in value or
                        '[' in value or ']' in value or '{' in value or
                        '}' in value or '#' in value or '|' in value or
                        value.lower() in ('true', 'false', 'yes', 'no', 'null',
                                          'on', 'off', 'string', 'boolean',
                                          'number', 'object', 'array')
                    )
                    if needs_quote:
                        escaped = value.replace('\\', '\\\\').replace('"', '\\"')
                        line = f'{indent}{key}: "{escaped}"'
            result_lines.append(line)
        return '\n'.join(result_lines)

    # ── Main API ────────────────────────────────────────────

    def compose_module(self, module_name: str, type_names: list[str],
                       goal: str, language: str = "typescript",
                       target_dir: str = "") -> ModuleBlueprint:
        """Compose a complete ModuleBlueprint from real sources.

        This replaces translator.generate_blueprint() with extraction-first approach.
        """
        self._log(f"composing module: {module_name} ({len(type_names)} types)")

        types = []
        for type_name in type_names:
            plan = self._plan_composition(type_name, goal)
            type_bp = self._execute_composition(plan, module_name, language, target_dir)
            types.append(type_bp)

        module = ModuleBlueprint(
            name=module_name,
            language=language,
            target_dir=target_dir or f"src/{module_name}",
            types=types,
            description=goal,
        )

        total_methods = sum(len(t.methods) + len(t.static_members) for t in types)
        self._log(f"composed {module_name}: {len(types)} types, {total_methods} methods")
        return module

    def compose_type(self, type_name: str, goal: str,
                     module_name: str = "", language: str = "typescript",
                     target_dir: str = "") -> TypeBlueprint:
        """Compose a single TypeBlueprint from real sources."""
        plan = self._plan_composition(type_name, goal)
        return self._execute_composition(plan, module_name, language, target_dir)

    # ── Composition Planning ────────────────────────────────

    def _plan_composition(self, type_name: str, goal: str) -> CompositionPlan:
        """Plan how to compose a type: gather sources, estimate coverage."""
        plan = CompositionPlan(type_name=type_name)

        # 1. Emission: find relevant descriptors
        descriptor_paths = []
        if self.emission:
            dummy_bp = TypeBlueprint(name=type_name)
            matches = self.emission.query(dummy_bp, max_results=8)
            for match in matches:
                descriptor_paths.append(match.descriptor_path)
                self._log(f"  emission: {match.descriptor_path} "
                          f"(score={match.score:.1f}, type={match.type_name})")

        # 2. Extraction: get real signatures from source code
        if self.extractor and descriptor_paths:
            extracted_types = self.extractor.extract_for_type(type_name, descriptor_paths)
            for ext in extracted_types:
                source = CompositionSource(
                    origin="extraction",
                    project=ext.descriptor_path.split("/")[0] if ext.descriptor_path else "",
                    type_name=ext.name,
                    methods=ext.methods + ext.static_methods,
                    fields=ext.fields,
                    extends=ext.extends,
                    confidence=0.95 if ext.methods and ext.methods[0].signature else 0.6,
                    descriptor_path=ext.descriptor_path,
                )
                plan.sources.append(source)
                self._log(f"  extracted: {ext.name} from {ext.source_file} "
                          f"({len(ext.methods)} methods, conf={source.confidence:.2f})")

        # 3. Semantic store: find similar types/methods
        if self.semantic:
            sem_matches = self.semantic.search_for_type(
                type_name,
                method_names=[],  # we don't know methods yet for new types
                top_k=10,
            )
            # Group by parent type
            type_methods: dict[str, list] = {}
            for sm in sem_matches:
                if sm.entry.kind == "method":
                    key = f"{sm.entry.source}:{sm.entry.parent_type}"
                    type_methods.setdefault(key, []).append(sm)

            for key, methods in type_methods.items():
                source_path = methods[0].entry.source
                parent = methods[0].entry.parent_type
                avg_score = sum(m.score for m in methods) / len(methods)
                # Only add if not already covered by extraction
                already_covered = any(
                    s.origin == "extraction" and s.type_name.lower() == parent.lower()
                    for s in plan.sources
                )
                if not already_covered and avg_score > 0.3:
                    source = CompositionSource(
                        origin="store",
                        project=source_path.split("/")[0] if "/" in source_path else "",
                        type_name=parent,
                        confidence=min(avg_score / 3.0, 0.8),
                        descriptor_path=source_path,
                    )
                    plan.sources.append(source)

        # 4. Block store: find previously-used blocks
        if self.block_store:
            stored = self.block_store.find_by_name(type_name, kind="method")
            stored += self.block_store.find_by_parent(type_name)
            if stored:
                methods_from_store = []
                for block in stored[:20]:
                    methods_from_store.append(ExtractedMethod(
                        name=block.name,
                        signature=block.signature,
                        params=[],
                        return_type="",
                        body_hint=block.content[:80],
                        complexity=block.lines,
                        source=block.source,
                    ))
                if methods_from_store:
                    plan.sources.append(CompositionSource(
                        origin="block_store",
                        project="stored",
                        type_name=type_name,
                        methods=methods_from_store,
                        confidence=0.85,
                    ))

        # Estimate coverage
        all_methods = set()
        for source in plan.sources:
            all_methods.update(m.name.lower() for m in source.methods)
        plan.total_unique_methods = len(all_methods)
        plan.estimated_coverage = min(len(all_methods) / max(8, len(all_methods)), 1.0)
        plan.needs_llm_enrichment = any(
            not m.signature for s in plan.sources for m in s.methods
        ) or plan.total_unique_methods < 3

        self._log(f"  plan: {len(plan.sources)} sources, "
                  f"{plan.total_unique_methods} unique methods, "
                  f"coverage={plan.estimated_coverage:.0%}, "
                  f"llm_enrich={plan.needs_llm_enrichment}")

        return plan

    # ── Composition Execution ──────────────────────────────

    def _execute_composition(self, plan: CompositionPlan,
                             module_name: str, language: str,
                             target_dir: str) -> TypeBlueprint:
        """Execute the composition plan: merge sources → TypeBlueprint."""
        # Merge methods by priority (highest confidence first)
        sorted_sources = sorted(plan.sources, key=lambda s: s.confidence, reverse=True)

        seen_methods: dict[str, MethodSpec] = {}  # normalized_name → MethodSpec
        fields: dict[str, FieldSpec] = {}
        extends = ""
        all_refs = []

        for source in sorted_sources:
            # Take extends from highest-confidence source
            if source.extends and not extends:
                extends = source.extends

            # Merge methods with deduplication
            for method in source.methods:
                norm_name = NameNormalizer.normalized_str(method.name)

                # Check for semantic duplicates
                is_duplicate = False
                for existing_norm in seen_methods:
                    sim = NameNormalizer.similarity(method.name, existing_norm.replace("_", ""))
                    if sim > 0.7:
                        is_duplicate = True
                        # Keep the one with a signature
                        existing = seen_methods[existing_norm]
                        if method.signature and not existing.sig:
                            seen_methods[existing_norm] = method.to_method_spec()
                        break

                if not is_duplicate:
                    seen_methods[norm_name] = method.to_method_spec()

            # Merge fields
            for f in source.fields:
                if f.name not in fields:
                    fields[f.name] = f

            if source.descriptor_path:
                all_refs.append(source.descriptor_path)

        # Build TypeBlueprint
        methods = []
        static_members = []
        for spec in seen_methods.values():
            if spec.is_static:
                static_members.append(spec)
            else:
                methods.append(spec)

        from ...dev.translator import to_kebab_case
        type_name = plan.type_name
        target_file = ""
        if target_dir:
            target_file = f"{target_dir}/{to_kebab_case(type_name)}.ts"

        type_bp = TypeBlueprint(
            name=type_name,
            kind="class",
            target_file=target_file,
            extends=extends,
            fields=list(fields.values()),
            methods=methods,
            static_members=static_members,
            references=all_refs[:10],
            description=f"Composed from {len(plan.sources)} sources",
        )

        # LLM enrichment: add hints, flag gaps
        if plan.needs_llm_enrichment and self.llm:
            type_bp = self._llm_enrich(type_bp, plan, module_name, language)

        self._log(f"  composed {type_name}: {len(methods)} methods, "
                  f"{len(static_members)} static, {len(fields)} fields")

        # Store methods in block store for future reuse
        if self.block_store:
            for m in methods + static_members:
                self.block_store.store_method(
                    name=m.name,
                    signature=m.sig,
                    body_hint=m.hint,
                    source=f"composed:{module_name}/{type_name}",
                    parent_type=type_name,
                    language=language,
                )

        return type_bp

    # ── LLM Enrichment ──────────────────────────────────────

    def _llm_enrich(self, type_bp: TypeBlueprint, plan: CompositionPlan,
                    module_name: str, language: str) -> TypeBlueprint:
        """LLM enriches an extracted blueprint: adds hints, does NOT invent API."""
        type_yaml = yaml.dump(type_bp.to_dict(), default_flow_style=False,
                              allow_unicode=True, sort_keys=False, width=120)

        # Summarize extraction sources
        source_lines = []
        for source in plan.sources[:5]:
            source_lines.append(
                f"- {source.origin} from {source.project}/{source.type_name} "
                f"(confidence={source.confidence:.2f}, {len(source.methods)} methods)"
            )

        sibling_types = ""  # will be filled by caller if needed

        user = ENRICH_USER_TEMPLATE.format(
            type_yaml=type_yaml,
            module_name=module_name,
            language=language,
            sibling_types=sibling_types,
            extraction_sources="\n".join(source_lines),
            prior_layers="",
        )

        try:
            resp = self.llm.complete_with_usage(
                [LLMMessage("system", ENRICH_SYSTEM),
                 LLMMessage("user", user)],
                temperature=0.2, max_tokens=4096,
            )
            self.total_tokens += resp.usage.total_tokens

            # Parse enriched YAML
            clean = resp.content.strip()
            clean = clean.strip("`").strip()
            if clean.startswith("yaml"):
                clean = clean[4:].strip()

            # Sanitize YAML values that break parsing (unquoted types with colons, etc.)
            clean = self._sanitize_yaml_values(clean)
            enriched_data = yaml.safe_load(clean)
            if enriched_data and isinstance(enriched_data, dict):
                enriched = TypeBlueprint.from_dict(enriched_data)
                # Preserve fields that LLM might have dropped
                if not enriched.methods and type_bp.methods:
                    return type_bp  # LLM broke it, keep original
                self._log(f"  enriched {type_bp.name}: "
                          f"{len(enriched.methods)} methods (was {len(type_bp.methods)})")
                return enriched
        except Exception as e:
            self._log(f"  enrichment failed: {e}, keeping original")

        return type_bp

    def run_gap_analysis(self, type_bp: TypeBlueprint,
                         reference_summary: str,
                         goal: str) -> dict:
        """Analyze a composed blueprint for gaps.

        Returns dict with critical_missing, optional_missing, should_remove.
        """
        type_yaml = yaml.dump(type_bp.to_dict(), default_flow_style=False,
                              allow_unicode=True, sort_keys=False, width=120)

        user = GAP_USER_TEMPLATE.format(
            type_yaml=type_yaml,
            reference_summary=reference_summary,
            goal=goal,
        )

        try:
            resp = self.llm.complete_with_usage(
                [LLMMessage("system", GAP_ANALYSIS_SYSTEM),
                 LLMMessage("user", user)],
                temperature=0.2, max_tokens=2048,
            )
            self.total_tokens += resp.usage.total_tokens

            import json
            import re
            text = resp.content.strip()
            # Extract JSON from possible markdown
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
            return json.loads(text)
        except Exception as e:
            self._log(f"  gap analysis failed: {e}")
            return {"critical_missing": [], "optional_missing": [],
                    "should_remove": [], "quality_estimate": 0.5}

    # ── Relevance Filter ────────────────────────────────────

    def _should_include_method(self, method: ExtractedMethod,
                               goal: str, existing: set[str],
                               source_count: int) -> bool:
        """Decide if a method is worth including. Balance over volume."""
        # Always include if it appears in multiple sources
        if source_count >= 2:
            return True

        # Skip trivial getters/setters (< 3 lines, starts with get/set)
        if method.complexity < 3 and (
            method.name.startswith("get") or method.name.startswith("set")
        ):
            return False

        # Skip if semantically duplicate of existing
        for existing_name in existing:
            if NameNormalizer.similarity(method.name, existing_name) > 0.7:
                return False

        return True
