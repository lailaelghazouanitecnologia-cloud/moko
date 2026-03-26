"""
Experiment engine — data-driven decisions via variant generation and evaluation.

Replaces LLM-debating-itself (discussant) with measurable experimentation:
  1. Generate 2-3 variants of a module/type with different approaches
  2. Evaluate each with real metrics (tsc, LOC, density, imports) — 0 LLM tokens
  3. Combine winning parts from each variant
  4. Store features with metrics for reuse across projects
"""
from .variants import VariantGenerator, Variant
from .evaluator import VariantEvaluator, EvalResult
from .combiner import VariantCombiner
from .features import FeatureStore, Feature

__all__ = [
    "VariantGenerator", "Variant",
    "VariantEvaluator", "EvalResult",
    "VariantCombiner",
    "FeatureStore", "Feature",
]
