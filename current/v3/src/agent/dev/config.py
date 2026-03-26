"""Centralized configuration for the dev pipeline.

All magic numbers, LLM parameters, and pipeline thresholds live here.
Pass PipelineConfig / LLMConfig to constructors instead of raw dicts.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class LLMConfig:
    """LLM call parameters — shared across decomposer, translator, intelligence."""
    provider: str = "groq"
    model: Optional[str] = None
    temperature: float = 0.4
    decompose_max_tokens: int = 3000
    translate_max_tokens: int = 4096
    intelligence_max_tokens: int = 6000
    fix_max_tokens: int = 4096


@dataclass(frozen=True)
class DecomposerConfig:
    """Thresholds for task decomposition."""
    max_types_per_module: int = 12
    target_loc_per_type_min: int = 80
    target_loc_per_type_max: int = 500
    feature_loc_scale: float = 0.3         # 30% of reference LOC
    feature_loc_scale_min: float = 0.15
    feature_loc_scale_max: float = 0.5


@dataclass(frozen=True)
class FixConfig:
    """Compile-fix loop parameters."""
    max_iterations: int = 4
    post_merge_max_rounds: int = 4


@dataclass(frozen=True)
class FeatureASTConfig:
    """Feature AST selection thresholds."""
    min_loc_for_maybe_prompt: int = 500    # only ask user about >500 LOC features
    max_interactive_maybes: int = 10       # cap interactive questions


@dataclass
class PipelineConfig:
    """Top-level pipeline configuration, built from CLI args or defaults."""
    llm: LLMConfig = field(default_factory=LLMConfig)
    decomposer: DecomposerConfig = field(default_factory=DecomposerConfig)
    fix: FixConfig = field(default_factory=FixConfig)
    feature_ast: FeatureASTConfig = field(default_factory=FeatureASTConfig)

    verbose: bool = False
    interactive: bool = True
    pre_features: Optional[list[str]] = None
    budget_chars: int = 20000

    @classmethod
    def from_dict(cls, d: dict) -> PipelineConfig:
        """Build from CLI config dict (backwards compatible)."""
        return cls(
            llm=LLMConfig(
                provider=d.get("provider", "groq"),
                model=d.get("model"),
            ),
            verbose=d.get("verbose", False),
            interactive=d.get("interactive", True),
            pre_features=d.get("pre_features"),
            budget_chars=d.get("budget_chars", 20000),
        )
