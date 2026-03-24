"""
Features — COMPATIBILITY SHIM during migration.

Re-exports from duel/features.py. Will be removed in a future phase.
"""
from ..duel.features import FeatureAnalyzer, Feature, FeatureDiscussion, FeaturesReport

__all__ = ["FeatureAnalyzer", "Feature", "FeatureDiscussion", "FeaturesReport"]
