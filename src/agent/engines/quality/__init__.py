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
    TypeStrategy, NamingStrategy, StructureStrategy,
    DocStrategy, PromptHintStrategy, StrategyResult,
)

__all__ = (
    "QualityEngine",
    "QualityResult",
    "QualityDB",
    "QualityClassifier",
    "QualityFeatureExtractor",
    "QualityFeatures",
    "QualityPrediction",
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
    auto_fixes: int = 0          # 0-token fixes
    prompt_fixes: int = 0        # LLM-assisted fixes
    tokens_used: int = 0
    quality_before: float = 0.0  # 0-1 score
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


class QualityEngine:
    """Main orchestrator for code quality analysis and improvement.

    Usage in pipeline:
        engine = QualityEngine(project_dir)
        result = engine.analyze_module("search", files)
        result = engine.improve_module("search", files, llm=provider)
    """

    def __init__(self, project_dir: str, db_path: str = ""):
        self.project_dir = Path(project_dir)
        self.db_path = db_path or str(self.project_dir / ".quality_db.jsonl")

        # Core components
        self.db = QualityDB(self.db_path)
        self.extractor = QualityFeatureExtractor()
        self.classifier = QualityClassifier(self.db)
        self.context_engine: Optional["ContextEngine"] = None

        # Strategies (0-token fixes)
        self.type_strategy = TypeStrategy()
        self.naming_strategy = NamingStrategy()
        self.structure_strategy = StructureStrategy()
        self.doc_strategy = DocStrategy()
        self.prompt_builder = PromptHintStrategy()

        # Retrain classifier if enough data
        if len(self.db.records) >= 30:
            self.classifier.train()

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
    ) -> Tuple[Dict[str, str], QualityResult]:
        """Analyze and improve all files in a module.

        Returns (improved_files, result).
        """
        result = QualityResult(module=module_name)
        improved_files = dict(files)  # mutable copy

        # Step 1: Analyze
        agg_features = self.extractor.extract_module(files)
        result.quality_before = self._compute_score(agg_features)

        # Detect issues per file
        file_issues: Dict[str, List[Tuple[str, str, str]]] = {}
        all_issues: List[QualityIssue] = []

        for filename, code in files.items():
            _, issues = self.analyze_file(code, filename)
            if issues:
                file_issues[filename] = issues
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

        # Step 2: Apply auto-fixes (0 tokens)
        for filename, issues in file_issues.items():
            code = improved_files[filename]
            features_dict = self.extractor.extract(code, filename).to_dict()

            for itype, severity, desc in issues:
                prediction = self.classifier.predict(
                    itype, self.extractor.extract(code, filename)
                )

                if prediction.strategy == "auto":
                    fix_result = self._apply_auto_fix(code, prediction)
                    if fix_result and fix_result.fixed_code:
                        code = fix_result.fixed_code
                        result.auto_fixes += fix_result.changes_made

                        # Record success
                        self.db.record_quality(
                            issue_type=itype,
                            severity=severity,
                            features=features_dict,
                            action=prediction.action,
                            strategy="auto",
                            success=True,
                            quality_delta=0.1,
                            tokens_cost=0,
                            module=module_name,
                            file_pattern=filename,
                        )

            improved_files[filename] = code

        # Step 3: Build LLM prompts for remaining issues (if LLM available)
        llm_calls = 0
        if llm and max_llm_calls > 0:
            for filename, issues in file_issues.items():
                if llm_calls >= max_llm_calls:
                    break

                code = improved_files[filename]
                features = self.extractor.extract(code, filename)
                remaining_issues = detect_issues(features)

                # Filter to issues that need LLM
                llm_issues = [
                    (it, sev, desc) for it, sev, desc in remaining_issues
                    if sev in ("critical", "major")
                ]

                if not llm_issues:
                    continue

                # Build targeted prompt
                predictions = self.classifier.predict_all(llm_issues, features)
                hints = [p.hint for p in predictions if p.hint]

                # Get examples from DB
                examples = []
                for p in predictions[:2]:
                    pairs = self.db.patterns_for_type(p.issue_type)
                    examples.extend(pairs[:1])

                prompt = self.prompt_builder.build_prompt(
                    code, llm_issues, hints, examples
                )

                # Call LLM
                try:
                    improved_code = self._call_llm(llm, prompt, code)
                    if improved_code and len(improved_code) > len(code) * 0.5:
                        improved_files[filename] = improved_code
                        result.prompt_fixes += len(llm_issues)
                        llm_calls += 1

                        # Record
                        for itype, sev, desc in llm_issues:
                            self.db.record_quality(
                                issue_type=itype,
                                severity=sev,
                                features=features.to_dict(),
                                action="llm_rewrite",
                                strategy="llm_rewrite",
                                success=True,
                                quality_delta=0.2,
                                module=module_name,
                                file_pattern=filename,
                            )
                except Exception:
                    pass

        # Step 4: Compute final quality
        final_features = self.extractor.extract_module(improved_files)
        result.quality_after = self._compute_score(final_features)
        result.issues_fixed = result.auto_fixes + result.prompt_fixes
        result.tokens_used = 0  # TODO: track from LLM calls

        # Step 5: Retrain if enough data
        if len(self.db.records) >= 30:
            self.classifier.train()
            self.db.save()

        return improved_files, result

    # ── Auto-fix dispatch ────────────────────────────────────

    def _apply_auto_fix(
        self, code: str, prediction: QualityPrediction
    ) -> Optional[StrategyResult]:
        """Apply the predicted auto-fix strategy."""
        features_dict = self.extractor.extract(code).to_dict()

        if prediction.action == "add_types":
            return self.type_strategy.apply(code, features_dict)
        elif prediction.action == "rename":
            return self.naming_strategy.apply(code, features_dict)
        elif prediction.action == "restructure" or prediction.action == "extract_constants":
            return self.structure_strategy.apply(code, features_dict)
        elif prediction.action == "add_docs":
            return self.doc_strategy.apply(code, features_dict)
        return None

    # ── Quality scoring ──────────────────────────────────────

    def _compute_score(self, features: QualityFeatures) -> float:
        """Compute overall quality score 0-1 from features.

        Weighted formula based on what makes Claude's code better:
          - Type safety: 25%
          - Naming quality: 20%
          - Algorithm depth: 20%
          - Documentation: 15%
          - Structure: 20%
        """
        score = 0.0

        # Type safety (25%): penalize any, reward unions/generics
        type_score = 1.0
        if features.loc > 0:
            any_ratio = features.any_count / max(features.loc / 50, 1)
            type_score -= min(any_ratio, 0.5)
        if features.union_type_count > 0:
            type_score += 0.1
        if features.generic_usage > 0:
            type_score += 0.1
        if features.type_alias_count > 0:
            type_score += 0.1
        type_score = max(0, min(type_score, 1.0))
        score += type_score * 0.25

        # Naming quality (20%)
        name_score = features.camel_case_ratio * 0.4
        name_score += features.semantic_name_score * 3.0  # boost semantic names
        name_score += (1.0 - features.generic_name_ratio) * 0.3
        name_score += features.descriptive_param_ratio * 0.3
        name_score = max(0, min(name_score, 1.0))
        score += name_score * 0.20

        # Algorithm depth (20%): complexity + no stubs
        algo_score = min(features.file_complexity * 20, 1.0)  # 0.05 branches/LOC = 1.0
        algo_score *= (1.0 - features.stub_indicator_score)
        algo_score += features.has_algorithm_docs * 0.3
        algo_score = max(0, min(algo_score, 1.0))
        score += algo_score * 0.20

        # Documentation (15%)
        doc_score = features.jsdoc_coverage * 0.5
        doc_score += features.has_algorithm_docs * 0.3
        doc_score += min(features.inline_comment_density * 10, 0.2)
        doc_score = max(0, min(doc_score, 1.0))
        score += doc_score * 0.15

        # Structure (20%): DI, events, helpers, no private access
        struct_score = features.has_dependency_injection * 0.3
        struct_score += features.has_event_pattern * 0.2
        struct_score += features.helper_ratio * 0.3
        struct_score += features.fluent_api_score * 0.2
        if features.private_field_access > 0:
            struct_score -= 0.2
        struct_score = max(0, min(struct_score, 1.0))
        score += struct_score * 0.20

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

    # ── Reporting ────────────────────────────────────────────

    def report(self) -> str:
        """Generate a summary report of quality DB stats."""
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

        return "\n".join(lines)
