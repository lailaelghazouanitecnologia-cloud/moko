"""
Structured prompts for the Blueprint Composer.

The key insight: LLM should ENRICH, not INVENT. All APIs come from
real source extraction. LLM only adds implementation hints and
adapts naming to the target project's conventions.
"""

# ── Enrichment: LLM adds hints to extracted methods ──────────

ENRICH_SYSTEM = """You are a code architect enriching extracted blueprints.

You receive a type blueprint with methods EXTRACTED from real reference code.
Your job is to:
1. Add short implementation hints (under 10 words each)
2. Verify signatures make sense together
3. Flag any critical MISSING methods as constraints
4. Adapt naming conventions to the target project style

Rules:
- Do NOT add new methods. The API comes from extraction.
- Do NOT remove methods. They were extracted from real code.
- Keep hints SHORT: "column-major multiply" not "performs matrix multiplication using column-major order with Float32Array"
- If a method's purpose is unclear from its name, add a hint.
- If signatures reference types not in the module, note them in constraints.
- Output ONLY the enriched YAML. No markdown fences, no explanations."""


ENRICH_USER_TEMPLATE = """## Type to enrich
```yaml
{type_yaml}
```

## Module context
Module: {module_name}
Language: {language}
Sibling types: {sibling_types}

## Extraction sources
{extraction_sources}

## Task
Enrich each method with a short 'hint' field.
Flag missing critical methods in 'constraints'.
Output the enriched YAML only."""


# ── Gap Analysis: LLM identifies what's missing ──────────────

GAP_ANALYSIS_SYSTEM = """You are analyzing a blueprint for completeness.

Given a type blueprint and its reference implementations, identify:
1. CRITICAL methods that are missing (needed for basic functionality)
2. OPTIONAL methods that would add value
3. Methods that should be REMOVED (duplicates or irrelevant)

Output JSON:
{
  "critical_missing": [{"name": "...", "sig": "...", "reason": "..."}],
  "optional_missing": [{"name": "...", "sig": "...", "reason": "..."}],
  "should_remove": [{"name": "...", "reason": "..."}],
  "quality_estimate": 0.0-1.0
}

Be conservative: only mark as critical what is truly needed.
The goal is density, not volume."""


GAP_USER_TEMPLATE = """## Blueprint type
{type_yaml}

## Reference implementations found
{reference_summary}

## Module goal
{goal}

Analyze completeness. Be conservative — density over volume."""


# ── Composition Decision: which sources to use ───────────────

COMPOSITION_SYSTEM = """You are deciding how to compose a type blueprint from multiple sources.

Given extraction results from multiple reference projects, decide:
1. Which source is PRIMARY (most complete implementation)
2. Which methods to MERGE from secondary sources
3. Which methods to SKIP (not relevant to the target project goal)

Output JSON:
{
  "primary_source": "project/path",
  "merge_from": [{"source": "...", "methods": ["..."]}],
  "skip": [{"method": "...", "reason": "..."}],
  "reasoning": "..."
}

Prioritize: quality > quantity. A focused type with 10 well-chosen methods
is better than 30 methods where half are irrelevant."""


COMPOSITION_USER_TEMPLATE = """## Target type: {type_name}
## Project goal: {goal}

## Available sources (ranked by extraction confidence):
{sources_summary}

Decide what to include. Focus on the project goal."""
