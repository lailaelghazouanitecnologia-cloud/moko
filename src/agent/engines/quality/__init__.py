"""
QualityEngine — code quality analysis, auto-fix, and learning pipeline.

Parallel to FixEngine (which handles TSC errors), QualityEngine handles
code *quality* — the difference between "compiles" and "production-ready."

Layered intelligence:
  Layer 0: Feature extraction — 35 quality features per file (0 tokens)
  Layer 1: Issue detection — heuristic pattern matching (0 tokens)
  Layer 2: Classification — predict best fix action (0 tokens after training)
  Layer 3: Auto-fix — programmatic repairs: types, naming, docs, structure (0 tokens)
  Layer 4: Prompt hints — targeted LLM prompts with learned examples (fewer tokens)
  Layer 5: LLM rewrite — only for complex issues surviving layers 0-3

Learning loop: every quality observation + resolution is recorded in QualityDB.
After 30+ records, the classifier trains a decision tree.
Each project improves the next.
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    from ..context import ContextEngine

from .quality_db import QualityDB, QualityRecord
from .quality_features import (
    QualityFeatureExtractor, QualityFeatures, detect_issues, FEATURE_NAMES,
)
from .quality_classifier import QualityClassifier, QualityPrediction
from .quality_strategies import (
    TypeStrategy, NamingStrategy, StructureStrategy, EncapsulationStrategy,
    ErrorHandlingStrategy, DocStrategy, PromptHintStrategy, StrategyResult,
)
from .style_profile import (
    StyleProfile, StyleAnalyzer, StylePreference,
    build_style_context, STYLE_DIMENSIONS, CLAUDE_DEFAULT_STYLE,
)
from .code_profile import CodeProfile
from .profile_extractor import ProfileExtractor
from .learned_scorer import LearnedScorer, ScoreDimension
from .global_db import GlobalQualityDB, GlobalQualityRecord
from .context_metrics import extract_context_metrics, ModuleContextMetrics
from .embedder import build_embedder, EmbedderConfig, TFIDFEmbedder
from .ast_detection import detect_with_ast, HAS_AST_GREP
from .adapters import get_adapter, LanguageAdapter, TypeScriptAdapter

__all__ = (
    "QualityEngine",
    "QualityResult",
    "ImprovementReport",
    "QualityDB",
    "QualityClassifier",
    "QualityFeatureExtractor",
    "QualityFeatures",
    "QualityPrediction",
    "StyleProfile",
    "StyleAnalyzer",
    "build_style_context",
    "LearnedScorer",
    "ProfileExtractor",
    "CodeProfile",
    "GlobalQualityDB",
    "GlobalQualityRecord",
)


@dataclass
class QualityIssue:
    """A detected quality issue with its prediction."""
    issue_type: str
    severity: str
    description: str
    prediction: Optional[QualityPrediction] = None
    fixed: bool = False
    tokens_used: int = 0


@dataclass
class QualityResult:
    """Result of analyzing and improving one module."""
    module: str
    issues_found: int = 0
    issues_fixed: int = 0
    auto_fixes: int = 0
    prompt_fixes: int = 0
    tokens_used: int = 0
    quality_before: float = 0.0
    quality_after: float = 0.0
    issues: List[QualityIssue] = field(default_factory=list)

    def summary(self) -> str:
        delta = self.quality_after - self.quality_before
        return (
            f"{self.module}: {self.issues_found} issues, "
            f"{self.issues_fixed} fixed ({self.auto_fixes} auto, {self.prompt_fixes} LLM), "
            f"quality {self.quality_before:.0%}→{self.quality_after:.0%} "
            f"(Δ{delta:+.0%}), {self.tokens_used} tokens"
        )


@dataclass
class ImprovementReport:
    """Complete observability for improve_module()."""
    module_name: str
    score_before: float = 0.0
    score_after: float = 0.0

    @property
    def delta(self) -> float:
        return self.score_after - self.score_before

    @property
    def improved(self) -> bool:
        return self.delta > 0.01

    @property
    def issues_fixed(self) -> int:
        return sum(self.issues_resolved.values())

    @property
    def issues_found(self) -> int:
        return sum(self.issues_detected.values())

    @property
    def auto_fixes(self) -> int:
        return sum(self.auto_fixes_applied.values())

    @property
    def prompt_fixes(self) -> int:
        return self.llm_calls_made

    @property
    def quality_before(self) -> float:
        return self.score_before

    @property
    def quality_after(self) -> float:
        return self.score_after

    # Issues
    issues_detected: Dict[str, int] = field(default_factory=dict)
    issues_resolved: Dict[str, int] = field(default_factory=dict)

    # Strategies
    auto_fixes_applied: Dict[str, int] = field(default_factory=dict)
    auto_fixes_failed: Dict[str, int] = field(default_factory=dict)
    escalated_to_llm: List[str] = field(default_factory=list)

    # LLM
    llm_calls_made: int = 0
    tokens_used: int = 0

    # Per-strategy delta
    delta_by_strategy: Dict[str, float] = field(default_factory=dict)

    # Per-file
    files_improved: List[str] = field(default_factory=list)
    files_unchanged: List[str] = field(default_factory=list)

    def summary(self) -> str:
        return (
            f"{self.module_name}: {self.score_before:.2f} → {self.score_after:.2f} "
            f"(Δ{self.delta:+.2f}) | "
            f"issues: {sum(self.issues_detected.values())} detected, "
            f"{sum(self.issues_resolved.values())} resolved | "
            f"LLM: {self.llm_calls_made} calls ({self.tokens_used} tokens)"
        )


class QualityEngine:
    """Main orchestrator for code quality analysis and improvement.

    Usage in pipeline:
        engine = QualityEngine(project_dir, project_name="x86vm")
        result = engine.analyze_module("search", files)
        files, report = engine.improve_module("search", files, llm=provider)
    """

    def __init__(
        self,
        project_dir: str,
        db_path: str = "",
        project_name: str = "",
        context_engine: Optional["ContextEngine"] = None,
    ):
        self.project_dir = Path(project_dir)
        self.project_name = project_name or self.project_dir.name
        self.db_path = db_path or str(self.project_dir / ".quality_db.jsonl")

        # Local JSONL (audit log) + Global SQLite (cross-project learning)
        self.db = QualityDB(self.db_path)

        # Embedder (TF-IDF default, MiniLM if available)
        self.embedder = build_embedder(EmbedderConfig(backend="auto"))
        self.global_db = GlobalQualityDB(embedding_dim=self.embedder.dimension)
        self._run_id = GlobalQualityDB.new_run_id()

        self.extractor = QualityFeatureExtractor()
        self.classifier = QualityClassifier(self.db, self.global_db)
        self.context_engine: Optional["ContextEngine"] = context_engine

        # Language adapter (TypeScript default)
        self.adapter: LanguageAdapter = get_adapter("typescript")

        # Style profile
        self.style_analyzer = StyleAnalyzer()
        self.style_path = self._resolve_style_path()
        self.style_profile = StyleProfile.load(self.style_path) if os.path.exists(self.style_path) else StyleProfile()

        # Strategies (0-token fixes)
        self.type_strategy = TypeStrategy()
        self.naming_strategy = NamingStrategy()
        self.structure_strategy = StructureStrategy()
        self.encapsulation_strategy = EncapsulationStrategy()
        self.error_handling_strategy = ErrorHandlingStrategy()
        self.doc_strategy = DocStrategy()
        self.prompt_builder = PromptHintStrategy()

        # Learned scorer
        self.profile_extractor = ProfileExtractor()
        scorer_path = str(self.project_dir / ".learned_scorer.json")
        self.learned_scorer = LearnedScorer.load(scorer_path)
        self._scorer_path = scorer_path

        # Retrain classifier if enough cross-project data
        if self.global_db.total_records() >= 10 or len(self.db.records) >= 30:
            self.classifier.train()

    def _resolve_style_path(self) -> str:
        """Find the workspace-level style profile.

        Walks up from project_dir to find the workspace root (has src/agent/),
        then stores .style_profile.json there. Falls back to project_dir.
        """
        current = self.project_dir
        for _ in range(5):
            candidate = current / ".style_profile.json"
            if candidate.exists():
                return str(candidate)
            # Check if this looks like workspace root
            if (current / "src" / "agent").exists():
                return str(candidate)
            parent = current.parent
            if parent == current:
                break
            current = parent
        # Fallback: store in project dir
        return str(self.project_dir / ".style_profile.json")

    def set_context_engine(self, ctx: "ContextEngine"):
        """Wire context engine for cross-module type info."""
        self.context_engine = ctx

    # ── Analysis (read-only, no modifications) ───────────────

    def analyze_file(self, code: str, filename: str = "") -> Tuple[QualityFeatures, List[Tuple[str, str, str]]]:
        """Extract features and detect issues for a single file."""
        features = self.extractor.extract(code, filename)
        issues = detect_issues(features)
        return features, issues

    def analyze_module(
        self, module_name: str, files: Dict[str, str]
    ) -> QualityResult:
        """Analyze all files in a module without modifying anything."""
        result = QualityResult(module=module_name)

        # Aggregate features
        agg_features = self.extractor.extract_module(files)
        result.quality_before = self._compute_score(agg_features)

        # Detect issues per file
        all_issues: List[QualityIssue] = []
        for filename, code in files.items():
            _, issues = self.analyze_file(code, filename)
            for itype, severity, desc in issues:
                prediction = self.classifier.predict(itype, agg_features)
                all_issues.append(QualityIssue(
                    issue_type=itype,
                    severity=severity,
                    description=f"[{filename}] {desc}",
                    prediction=prediction,
                ))

        result.issues = all_issues
        result.issues_found = len(all_issues)
        result.quality_after = result.quality_before  # no changes yet
        return result

    # ── Improvement (modifies code) ──────────────────────────

    def improve_module(
        self,
        module_name: str,
        files: Dict[str, str],
        llm=None,
        max_llm_calls: int = 3,
    ) -> Tuple[Dict[str, str], ImprovementReport]:
        """Analyze and improve all files in a module.

        Returns (improved_files, report) with full observability.
        """
        report = ImprovementReport(module_name=module_name)
        improved_files = dict(files)

        # Step 1: Analyze
        agg_features = self.extractor.extract_module(files)
        report.score_before = self._compute_score(agg_features)

        file_issues: Dict[str, List[Tuple[str, str, str]]] = {}
        for filename, code in files.items():
            _, issues = self.analyze_file(code, filename)
            if issues:
                file_issues[filename] = issues
            for itype, severity, desc in issues:
                report.issues_detected[itype] = report.issues_detected.get(itype, 0) + 1

        # Step 2: Auto-fixes (0 tokens)
        for filename, issues in file_issues.items():
            code = improved_files[filename]
            ctx = extract_context_metrics(filename, self.context_engine)
            file_changed = False

            for itype, severity, desc in issues:
                prediction = self.classifier.predict(
                    itype, self.extractor.extract(code, filename)
                )

                if prediction.strategy != "auto":
                    continue

                features_before = self.extractor.extract(code, filename)
                score_before = self._compute_score(features_before)

                fix_result = self._apply_auto_fix(code, prediction)

                if fix_result.applied:
                    code = fix_result.code
                    features_after = self.extractor.extract(code, filename)
                    score_after = self._compute_score(features_after)
                    real_delta = score_after - score_before
                    file_changed = True

                    report.auto_fixes_applied[prediction.action] = \
                        report.auto_fixes_applied.get(prediction.action, 0) + 1
                    report.issues_resolved[itype] = \
                        report.issues_resolved.get(itype, 0) + 1
                    report.delta_by_strategy[prediction.action] = \
                        report.delta_by_strategy.get(prediction.action, 0) + real_delta
                else:
                    score_before = self._compute_score(features_before)
                    score_after = score_before
                    real_delta = 0.0
                    report.auto_fixes_failed[prediction.action] = \
                        report.auto_fixes_failed.get(prediction.action, 0) + 1

                # Record in both local audit log and global DB
                self.db.record_quality(
                    issue_type=itype, severity=severity,
                    features=features_before.to_dict(),
                    action=prediction.action, strategy="auto",
                    success=fix_result.applied and real_delta > 0,
                    quality_delta=real_delta, tokens_cost=0,
                    module=module_name, file_pattern=filename,
                )
                self.global_db.record(GlobalQualityRecord(
                    project_name=self.project_name,
                    issue_type=itype, severity=severity,
                    features=features_before.to_dict(),
                    action=prediction.action, strategy="auto",
                    applied=fix_result.applied,
                    score_before=score_before, score_after=score_after,
                    quality_delta=real_delta, tokens_used=0,
                    module_role=ctx.module_role,
                    consumers_count=ctx.consumers_count,
                    dependency_depth=ctx.dependency_depth,
                    run_id=self._run_id,
                ))

            improved_files[filename] = code
            if file_changed:
                report.files_improved.append(filename)

        # Step 3: LLM fixes for remaining critical/major issues
        if llm and max_llm_calls > 0:
            for filename, issues in file_issues.items():
                if report.llm_calls_made >= max_llm_calls:
                    break

                code = improved_files[filename]
                features = self.extractor.extract(code, filename)
                remaining = detect_issues(features)
                llm_issues = [
                    (it, sev, desc) for it, sev, desc in remaining
                    if sev in ("critical", "major")
                ]
                if not llm_issues:
                    continue

                for it, _, _ in llm_issues:
                    report.escalated_to_llm.append(it)

                predictions = self.classifier.predict_all(llm_issues, features)
                hints = [p.hint for p in predictions if p.hint]
                hints.extend(self.style_profile.to_prompt_hints())

                # Get examples from global DB first, fallback to local
                examples = []
                for p in predictions[:2]:
                    global_patterns = self.global_db.patterns_for_type(p.issue_type, limit=1)
                    if global_patterns:
                        examples.extend([(gp["action"], str(gp["delta"])) for gp in global_patterns[:1]])
                    else:
                        pairs = self.db.patterns_for_type(p.issue_type)
                        examples.extend(pairs[:1])

                prompt = self.prompt_builder.build_prompt(code, llm_issues, hints, examples)

                try:
                    improved_code = self._call_llm(llm, prompt, code)
                    if improved_code and len(improved_code) > len(code) * 0.5:
                        score_before = self._compute_score(features)
                        new_features = self.extractor.extract(improved_code, filename)
                        score_after = self._compute_score(new_features)
                        real_delta = score_after - score_before

                        improved_files[filename] = improved_code
                        report.llm_calls_made += 1
                        if filename not in report.files_improved:
                            report.files_improved.append(filename)

                        ctx = extract_context_metrics(filename, self.context_engine)
                        for itype, sev, desc in llm_issues:
                            report.issues_resolved[itype] = \
                                report.issues_resolved.get(itype, 0) + 1
                            self.db.record_quality(
                                issue_type=itype, severity=sev,
                                features=features.to_dict(),
                                action="llm_rewrite", strategy="llm_rewrite",
                                success=real_delta > 0, quality_delta=real_delta,
                                module=module_name, file_pattern=filename,
                            )
                            self.global_db.record(GlobalQualityRecord(
                                project_name=self.project_name,
                                issue_type=itype, severity=sev,
                                features=features.to_dict(),
                                action="llm_rewrite", strategy="llm_rewrite",
                                applied=True,
                                score_before=score_before, score_after=score_after,
                                quality_delta=real_delta,
                                module_role=ctx.module_role,
                                consumers_count=ctx.consumers_count,
                                dependency_depth=ctx.dependency_depth,
                                run_id=self._run_id,
                            ))
                except Exception:
                    pass

        # Step 4: Final scoring
        final_features = self.extractor.extract_module(improved_files)
        report.score_after = self._compute_score(final_features)

        # Track unchanged files
        for filename in files:
            if filename not in report.files_improved:
                report.files_unchanged.append(filename)

        # Step 5: Retrain if enough data
        if self.global_db.total_records() >= 10:
            self.classifier.train()
        if len(self.db.records) >= 30:
            self.db.save()

        return improved_files, report

    # ── Auto-fix dispatch ────────────────────────────────────

    def _apply_auto_fix(
        self, code: str, prediction: QualityPrediction
    ) -> StrategyResult:
        """Apply the predicted auto-fix strategy. Always returns StrategyResult."""
        features_dict = self.extractor.extract(code).to_dict()

        strategies = {
            "add_types": self.type_strategy,
            "rename": self.naming_strategy,
            "restructure": self.structure_strategy,
            "extract_constants": self.structure_strategy,
            "encapsulate": self.encapsulation_strategy,
            "add_error_handling": self.error_handling_strategy,
            "add_docs": self.doc_strategy,
        }
        strategy = strategies.get(prediction.action)
        if strategy:
            return strategy.apply(code, features_dict)
        return StrategyResult(code=code, applied=False)

    # ── Quality scoring ──────────────────────────────────────

    def _compute_score(self, features: QualityFeatures) -> float:
        """Compute overall quality score 0-1 from features.

        Weights adapt to user's style profile. Default:
          - Type safety: 25%   (any count, generics, unions, readonly)
          - Naming quality: 15%
          - Algorithm depth: 20%
          - Documentation: 10%
          - Structure: 15%     (DI, events, helpers)
          - Encapsulation: 15% (readonly, private, public_field_ratio)

        Tuned from comparing AVA (55-67%) vs Claude (64-70%) outputs.
        Key differentiators: any usage, readonly, generics, encapsulation.
        """
        w = self.style_profile.to_quality_weights()
        score = 0.0

        # Type safety: heavily penalize any, reward generics/unions
        type_score = 1.0
        if features.loc > 0:
            # Stricter: 1 any per 20 LOC is bad (was 50)
            any_ratio = features.any_count / max(features.loc / 20, 1)
            type_score -= min(any_ratio * 0.8, 0.7)  # up to -70% for heavy any usage
        if features.union_type_count > 0:
            type_score += 0.1
        if features.generic_usage > 0:
            # Scale: 1-5 generics = +0.1, 5+ = +0.15
            type_score += min(features.generic_usage / 30, 0.15)
        if features.type_alias_count > 0:
            type_score += 0.05
        # Penalize Record<*, any> specifically
        if features.record_any_count > 0:
            type_score -= min(features.record_any_count * 0.1, 0.3)
        type_score = max(0, min(type_score, 1.0))
        score += type_score * w.get("type_safety", 0.25)

        # Naming quality (15%)
        name_score = features.camel_case_ratio * 0.4
        name_score += features.semantic_name_score * 3.0
        name_score += (1.0 - features.generic_name_ratio) * 0.3
        name_score += features.descriptive_param_ratio * 0.3
        # Penalize typos
        if features.typo_score > 0:
            name_score -= features.typo_score * 0.5
        name_score = max(0, min(name_score, 1.0))
        score += name_score * w.get("naming", 0.15)

        # Algorithm depth: complexity + no stubs
        # Small utility files (<30 LOC): exempt from algorithm depth penalty
        # These are typically index.ts, constants.ts, types-only files
        if features.loc < 30:
            algo_score = 0.6  # neutral — not good or bad
        else:
            algo_score = min(features.file_complexity * 20, 1.0)
            algo_score *= (1.0 - features.stub_indicator_score)
            algo_score += features.has_algorithm_docs * 0.3
        algo_score = max(0, min(algo_score, 1.0))
        score += algo_score * w.get("algorithm", 0.20)

        # Documentation (10%)
        doc_score = features.jsdoc_coverage * 0.5
        doc_score += features.has_algorithm_docs * 0.3
        doc_score += min(features.inline_comment_density * 10, 0.2)
        doc_score = max(0, min(doc_score, 1.0))
        score += doc_score * w.get("documentation", 0.10)

        # Structure: DI, events, helpers (15%)
        struct_score = features.has_dependency_injection * 0.3
        struct_score += features.has_event_pattern * 0.2
        struct_score += features.helper_ratio * 0.3
        struct_score += features.fluent_api_score * 0.2
        if features.private_field_access > 0:
            struct_score -= 0.2
        struct_score = max(0, min(struct_score, 1.0))
        score += struct_score * w.get("structure", 0.15)

        # Encapsulation (15% — new, key differentiator AVA vs Claude)
        encap_score = 0.0
        # Readonly ratio: Claude averages 1.2-1.7, AVA 0.06-0.44
        encap_score += min(features.readonly_ratio * 0.5, 0.4)
        # Penalize public mutable fields
        encap_score += (1.0 - features.public_field_ratio) * 0.4
        # Reward private helpers
        encap_score += features.helper_ratio * 0.2
        encap_score = max(0, min(encap_score, 1.0))
        score += encap_score * w.get("encapsulation", 0.15)

        return max(0, min(score, 1.0))

    # ── LLM integration ─────────────────────────────────────

    def _call_llm(self, llm, prompt: str, code: str) -> Optional[str]:
        """Call LLM for quality improvement. Returns improved code or None."""
        full_prompt = f"{prompt}\n\n```typescript\n{code}\n```"

        # Use the provider's generate method
        if hasattr(llm, "generate"):
            response = llm.generate(full_prompt)
        elif hasattr(llm, "chat"):
            response = llm.chat(full_prompt)
        else:
            return None

        # Extract code from response
        text = str(response)
        if "```typescript" in text:
            start = text.index("```typescript") + len("```typescript")
            end = text.index("```", start)
            return text[start:end].strip()
        if "```" in text:
            start = text.index("```") + 3
            # Skip language tag
            newline = text.index("\n", start)
            end = text.index("```", newline)
            return text[newline:end].strip()

        return text.strip() if text.strip() else None

    # ── Style learning ─────────────────────────────────────

    def learn_style_from_project(self, project_dir: str) -> int:
        """Analyze an existing project to learn user's coding style.

        Call this with reference projects before generation.
        Returns number of files analyzed.
        """
        count = self.style_analyzer.learn_from_project(
            self.style_profile, project_dir
        )
        if count > 0:
            self.style_profile.save(self.style_path)
        return count

    def learn_style_from_correction(
        self, original: str, corrected: str, filename: str = ""
    ):
        """Learn from a manual user correction (high weight).

        Call this whenever the user edits generated code.
        """
        self.style_analyzer.learn_from_correction(
            self.style_profile, original, corrected, filename
        )
        self.style_profile.save(self.style_path)

    def learn_reference_profile(self, project_dir: str, name: str = "") -> Optional[CodeProfile]:
        """Profile a reference project to calibrate quality scoring.

        Call with gold-standard (Claude) projects. The scorer learns what
        "good code" looks like: pattern densities, architecture ratios,
        coherence metrics. All future scoring compares against this profile.
        """
        profile = self.profile_extractor.extract_project(project_dir, name=name)
        if profile.total_loc < 10:
            return None

        # Add to scorer's reference pool
        existing = [self.learned_scorer.reference] if self.learned_scorer.reference else []
        existing.append(profile)
        self.learned_scorer.learn_from_profiles(existing)
        self.learned_scorer.save(self._scorer_path)
        return profile

    def score_project(self, project_dir: str, name: str = "") -> Tuple[float, str]:
        """Score a project using the learned reference profile.

        Returns (score, detailed_report).
        If no reference profile learned yet, falls back to feature-based scoring.
        """
        profile = self.profile_extractor.extract_project(project_dir, name=name)
        if not self.learned_scorer.dimensions:
            # Fallback to old scorer
            files = self._read_project_files(project_dir)
            features = self.extractor.extract_module(files)
            score = self._compute_score(features)
            return score, f"Quality: {score:.0%} (feature-based, no reference profile)"

        overall, details = self.learned_scorer.score(profile)
        report = self.learned_scorer.score_comparison(profile)
        return overall, report

    def compare_projects(self, dir_a: str, dir_b: str,
                         name_a: str = "A", name_b: str = "B") -> str:
        """Compare two projects side by side with learned scoring.

        Great for AVA vs Claude comparisons.
        """
        prof_a = self.profile_extractor.extract_project(dir_a, name=name_a)
        prof_b = self.profile_extractor.extract_project(dir_b, name=name_b)

        lines = [
            f"{'Metric':<30} {name_a:>12} {name_b:>12} {'Gap':>10}",
            "─" * 66,
        ]

        comparisons = [
            ("LOC", prof_a.total_loc, prof_b.total_loc, "n"),
            ("Files", prof_a.total_files, prof_b.total_files, "n"),
            ("readonly/100 LOC", prof_a.readonly_density, prof_b.readonly_density, "h"),
            ("generics/100 LOC", prof_a.generic_density, prof_b.generic_density, "h"),
            ("unions/100 LOC", prof_a.union_density, prof_b.union_density, "h"),
            ("type aliases/100 LOC", prof_a.type_alias_density, prof_b.type_alias_density, "h"),
            ("any/100 LOC", prof_a.any_density, prof_b.any_density, "l"),
            ("discriminated unions", prof_a.discriminated_union_count, prof_b.discriminated_union_count, "h"),
            ("branded types", prof_a.branded_type_count, prof_b.branded_type_count, "h"),
            ("private ratio", prof_a.private_ratio, prof_b.private_ratio, "h"),
            ("interface/class ratio", prof_a.interface_to_class_ratio, prof_b.interface_to_class_ratio, "h"),
            ("avg complexity", prof_a.avg_complexity, prof_b.avg_complexity, "n"),
            ("error handling/100 LOC", prof_a.error_handling_density, prof_b.error_handling_density, "h"),
            ("validation/100 LOC", prof_a.validation_density, prof_b.validation_density, "h"),
            ("pattern consistency", prof_a.naming_consistency, prof_b.naming_consistency, "h"),
            ("import coherence", prof_a.import_coherence, prof_b.import_coherence, "h"),
            ("type reuse", prof_a.type_reuse_ratio, prof_b.type_reuse_ratio, "h"),
        ]

        for metric, val_a, val_b, direction in comparisons:
            if isinstance(val_a, int):
                s_a, s_b = f"{val_a}", f"{val_b}"
            else:
                s_a, s_b = f"{val_a:.2f}", f"{val_b:.2f}"

            if isinstance(val_a, (int, float)) and isinstance(val_b, (int, float)):
                if val_b > 0.001:
                    ratio = val_a / val_b
                    if direction == "h":
                        if ratio >= 1:
                            gap = f"{ratio:.1f}x"
                        elif ratio > 0:
                            gap = f"{1/ratio:.1f}x behind"
                        else:
                            gap = "missing"
                    elif direction == "l":
                        gap = f"{ratio:.1f}x" if ratio <= 1 else f"{ratio:.1f}x worse"
                    else:
                        gap = f"{ratio:.1f}x"
                elif val_a > 0:
                    gap = f"{name_a} only"
                else:
                    gap = "—"
            else:
                gap = "—"

            lines.append(f"{metric:<30} {s_a:>12} {s_b:>12} {gap:>10}")

        # Score both if reference exists
        if self.learned_scorer.dimensions:
            score_a, _ = self.learned_scorer.score(prof_a)
            score_b, _ = self.learned_scorer.score(prof_b)
            lines.extend([
                "─" * 66,
                f"{'Learned Score':<30} {score_a:>11.0%} {score_b:>11.0%}",
            ])

        return "\n".join(lines)

    def _read_project_files(self, project_dir: str) -> Dict[str, str]:
        """Read all .ts files from a project."""
        files = {}
        src_dir = Path(project_dir)
        if (src_dir / "src").exists():
            src_dir = src_dir / "src"
        for ts_file in src_dir.rglob("*.ts"):
            try:
                files[str(ts_file)] = ts_file.read_text()
            except Exception:
                pass
        return files

    def get_style_hints(self) -> List[str]:
        """Get current style hints for LLM prompts."""
        return self.style_profile.to_prompt_hints()

    def get_style_context(
        self, existing_context: str = "",
        type_name: str = "", module_name: str = "",
    ) -> str:
        """Get style hints that add value beyond what context already shows.

        If the LLM already sees reference code demonstrating readonly, OOP,
        unions — those hints are skipped. Only emits what the context
        doesn't already demonstrate.
        """
        return build_style_context(
            self.style_profile, existing_context,
            type_name, module_name,
        )

    def style_report(self) -> str:
        """Report current style profile."""
        strong = self.style_profile.strong_preferences(0.4)
        if not strong:
            return "Style profile: not enough data yet."

        lines = ["Style Profile (confident preferences):"]
        for dim, value in sorted(strong.items(), key=lambda x: -x[1]):
            conf = self.style_profile.confidence(dim)
            bar = "█" * int(value * 10) + "░" * (10 - int(value * 10))
            lines.append(f"  {dim:<30} {bar} {value:.2f} (conf: {conf:.0%})")
        return "\n".join(lines)

    # ── Reporting ────────────────────────────────────────────

    def report(self) -> str:
        """Generate a summary report of quality DB stats + style."""
        stats = self.db.stats()
        lines = [
            "QualityEngine Report",
            "=" * 40,
            f"Total observations: {stats['total']}",
            f"Success rate: {stats['success_rate']:.0%}",
            f"Avg quality delta: {stats.get('avg_quality_delta', 0):.2f}",
            f"Total tokens: {stats.get('tokens_total', 0)}",
            "",
            "By issue type:",
        ]
        for itype, data in stats.get("by_type", {}).items():
            rate = data["successes"] / data["count"] if data["count"] > 0 else 0
            lines.append(f"  {itype}: {data['count']} ({rate:.0%} success, {data['tokens']} tokens)")

        lines.append("")
        lines.append("By strategy:")
        for strategy, count in stats.get("by_strategy", {}).items():
            lines.append(f"  {strategy}: {count}")

        if self.classifier.trained_on > 0:
            lines.append(f"\nClassifier: trained on {self.classifier.trained_on} records")

        # Style profile summary
        lines.append("")
        lines.append(self.style_report())

        return "\n".join(lines)
