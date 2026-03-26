"""
FixEngine — intelligent compile-fix pipeline with learning.

Layered intelligence, each layer reduces work for the next:

  Layer -1: Classifier — predicts fix action from ErrorDB (learned, 0 tokens)
  Layer 0:  Auto-fix — programmatic repairs (syntax, typos — 0 tokens)
  Layer 1:  Index-assisted — resolve imports via LiveIndex (0 tokens)
  Layer 2:  Cascade detection — 47 errors → 3 root causes (0 tokens)
  Layer 3:  Smart prompt — root causes + hints (fewer tokens)
  Layer 4:  LLM fix — only errors that survive layers -1 to 2

Learning loop: every resolution (success or failure) is recorded in ErrorDB.
After 30+ records, the classifier trains a decision tree from features.
Each project generated makes the engine smarter.
"""
from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from ..context import ContextEngine

from .intelligence import TscError, ErrorCluster, ErrorIntelligence
from .strategies import (
    SyntaxStrategy, ImportStrategy, ConstructorTypoStrategy, StrategyResult,
)
from .error_db import ErrorDB, ErrorRecord
from .features import FeatureExtractor, ErrorFeatures
from .classifier import FixClassifier, Prediction

__all__ = (
    "FixEngine",
    "FixResult",
    "TscError",
    "ErrorCluster",
    "ErrorIntelligence",
    "ErrorDB",
    "FixClassifier",
)

# Regex to parse tsc error output
_TSC_ERROR_RE = re.compile(
    r'^(.+?)\((\d+),\d+\):\s+error\s+(TS\d+):\s+(.+)$',
    re.MULTILINE,
)

FIX_SYSTEM = """You are fixing TypeScript compiler errors in generated code.

Rules:
1. Fix ONLY the listed ROOT CAUSE errors. Cascade errors will disappear on their own.
2. Preserve all existing functionality and logic.
3. Output the COMPLETE fixed file — not a diff, not a partial snippet.
4. If a type is missing, add the appropriate import or define it.
5. If a property doesn't exist on a type, check the context for the correct API.
6. Do NOT add comments like "// fixed" or "// changed".
7. Pay special attention to HINTS — they tell you exactly what's wrong.
8. Output ONLY the source code. No markdown fences, no explanations."""


@dataclass
class FixIteration:
    """Record of one fix attempt."""
    iteration: int
    errors_before: int
    errors_after: int
    auto_fixed: int = 0
    llm_fixed: int = 0
    tokens_used: int = 0
    changes: list[str] = field(default_factory=list)


@dataclass
class FixResult:
    """Complete result of the fix pipeline for a module."""
    module: str
    iterations: list[FixIteration] = field(default_factory=list)
    initial_errors: int = 0
    final_errors: int = 0
    total_tokens: int = 0
    auto_fixes_applied: int = 0

    @property
    def success(self) -> bool:
        return self.final_errors == 0

    def summary(self) -> str:
        auto = f", {self.auto_fixes_applied} auto-fixed" if self.auto_fixes_applied else ""
        return (f"{self.module}: {self.initial_errors}→{self.final_errors} errors, "
                f"{len(self.iterations)} rounds, {self.total_tokens:,} tokens{auto}")


class FixEngine:
    """Intelligent compile-fix engine.

    Usage:
        engine = FixEngine(llm, project_dir)
        engine.context_engine = context_engine  # optional, for richer fixes
        result = engine.fix_module(module_dir)
    """

    def __init__(self, llm, project_dir: Path,
                 max_iterations: int = 4, verbose: bool = False):
        self.llm = llm
        self.project_dir = Path(project_dir)
        self.max_iterations = max_iterations
        self.verbose = verbose
        self.total_tokens = 0
        self.context_engine: Optional["ContextEngine"] = None

        # Internal components
        self._intel = ErrorIntelligence(project_dir, verbose=verbose)
        self._syntax = SyntaxStrategy()
        self._typo = ConstructorTypoStrategy()
        self._import: Optional[ImportStrategy] = None

        # Learning components
        self._db = ErrorDB(project_dir / ".error_db.jsonl")
        self._db.load()
        self._features = FeatureExtractor()
        self._classifier = FixClassifier(self._db, min_samples=30)
        # Train if enough data exists from previous runs
        if len(self._db.records) >= 30:
            if self._classifier.train():
                self._log(f"classifier trained on {len(self._db.records)} records")
        if self._db.records:
            self._log(f"error db: {self._db.format_stats()}")

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [fix-engine] {msg}")

    # ── TSC compilation ──────────────────────────────────────────

    def check_tsc(self, file_path: Path = None) -> tuple[list[TscError], bool, str]:
        """Run tsc --noEmit. Returns (errors, success, raw_output)."""
        cmd = ["npx", "tsc", "--noEmit", "--strict"]
        if file_path:
            cmd.append(str(file_path))

        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True,
                timeout=60, cwd=self.project_dir,
            )
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return [], False, "TSC_UNAVAILABLE"

        raw = result.stdout + result.stderr
        errors = []
        for m in _TSC_ERROR_RE.finditer(raw):
            errors.append(TscError(
                file=m.group(1), line=int(m.group(2)),
                code=m.group(3), message=m.group(4),
            ))
        return errors, result.returncode == 0, raw

    def check_module(self, module_dir: Path) -> tuple[list[TscError], bool]:
        """Check a module, filtering errors to only this module."""
        errors, success, _ = self.check_tsc()
        if success:
            return [], True

        module_rel = str(module_dir.relative_to(self.project_dir))
        module_errors = [e for e in errors if e.file.startswith(module_rel)]
        return module_errors, len(module_errors) == 0

    # ── Main fix pipeline ────────────────────────────────────────

    def fix_module(self, module_dir: Path,
                   context_files: dict[str, str] = None) -> FixResult:
        """Fix all errors in a module using layered intelligence.

        Pipeline per iteration:
          1. Run tsc
          2. Apply auto-fixes (Layer 0: syntax, typos)
          3. Apply index-assisted imports (Layer 1)
          4. Re-check tsc — did auto-fixes resolve it?
          5. If errors remain: cluster → prioritize → smart prompt → LLM (Layers 2-4)
          6. Snapshot/revert if LLM worsens things
        """
        module_rel = str(module_dir.relative_to(self.project_dir))
        result = FixResult(module=module_rel)

        # Wire import strategy to context engine's index
        if self.context_engine and hasattr(self.context_engine, 'index'):
            self._import = ImportStrategy(self.context_engine.index)

        best_error_count = float('inf')
        best_seen_at = -1

        for i in range(self.max_iterations):
            # ── Step 1: Check ──
            module_errors, clean = self.check_module(module_dir)

            if i == 0:
                result.initial_errors = len(module_errors)

            if clean:
                self._log(f"iteration {i}: CLEAN")
                result.iterations.append(FixIteration(i, 0, 0))
                break

            errors_before = len(module_errors)
            self._log(f"iteration {i}: {errors_before} errors in {module_rel}")

            # Early termination
            if errors_before >= best_error_count and i - best_seen_at >= 2:
                self._log(f"errors stalled at {best_error_count}, stopping")
                break
            if errors_before < best_error_count:
                best_error_count = errors_before
                best_seen_at = i

            # ── Step 2: Group errors by file ──
            by_file: dict[str, list[TscError]] = {}
            for err in module_errors:
                by_file.setdefault(err.file, []).append(err)

            # ── Step 3: Snapshot ──
            snapshot: dict[str, str] = {}
            for rel_file in by_file:
                abs_path = self.project_dir / rel_file
                if abs_path.exists():
                    snapshot[rel_file] = abs_path.read_text()

            iter_record = FixIteration(i, errors_before, errors_before)
            auto_total = 0

            # ── Step 4: Per-file fix pipeline ──
            for rel_file, file_errors in by_file.items():
                abs_path = self.project_dir / rel_file
                if not abs_path.exists():
                    continue

                code = abs_path.read_text()

                # Layer 0: Auto-fix (syntax, typos)
                auto_count, code = self._apply_auto_fixes(code, file_errors, rel_file)
                auto_total += auto_count

                if auto_count > 0:
                    abs_path.write_text(code)
                    iter_record.changes.append(f"{rel_file} (auto: {auto_count})")

            # ── Step 5: Re-check after auto-fixes ──
            if auto_total > 0:
                iter_record.auto_fixed = auto_total
                result.auto_fixes_applied += auto_total
                self._log(f"  auto-fixed {auto_total} issues, re-checking...")

                module_errors_post_auto, clean = self.check_module(module_dir)
                if clean:
                    iter_record.errors_after = 0
                    result.iterations.append(iter_record)
                    self._log(f"  auto-fixes resolved all errors!")
                    break

                # Update errors for LLM phase
                by_file_post: dict[str, list[TscError]] = {}
                for err in module_errors_post_auto:
                    by_file_post.setdefault(err.file, []).append(err)

                remaining = len(module_errors_post_auto)
                self._log(f"  {remaining} errors remain after auto-fix, sending to LLM")
            else:
                by_file_post = by_file

            # ── Step 6: LLM fix (only for remaining errors) ──
            for rel_file, file_errors in by_file_post.items():
                abs_path = self.project_dir / rel_file
                if not abs_path.exists():
                    continue

                self._log(f"  LLM fixing {rel_file} ({len(file_errors)} errors)")
                code = abs_path.read_text()

                # Build smart prompt with cascade detection
                prompt = self._intel.build_smart_prompt(
                    code, file_errors, context_files, self.context_engine
                )

                fixed, tokens = self._llm_fix(prompt)
                iter_record.tokens_used += tokens
                self.total_tokens += tokens

                if fixed.strip():
                    abs_path.write_text(fixed + "\n")
                    iter_record.changes.append(rel_file)

                # Record LLM fixes for learning
                for err in file_errors[:10]:
                    features = self._features.extract(
                        err.code, err.line, err.message, code, file_errors
                    )
                    self._record_resolution(err, features, "llm_fix", "llm",
                                           True, tokens=tokens // max(len(file_errors), 1))

            # ── Step 7: Re-check, revert if worse ──
            module_errors_final, clean = self.check_module(module_dir)
            errors_after = len(module_errors_final)

            if errors_after > errors_before:
                self._log(f"  fix WORSENED ({errors_before}→{errors_after}), reverting")
                for rel_file, original in snapshot.items():
                    (self.project_dir / rel_file).write_text(original)
                errors_after = errors_before

            iter_record.errors_after = errors_after
            result.iterations.append(iter_record)

            if clean or errors_after == 0:
                self._log(f"iteration {i}: fixed all errors")
                break

        # Final error count
        final_errors, _ = self.check_module(module_dir)
        result.final_errors = len(final_errors)
        result.total_tokens = sum(it.tokens_used for it in result.iterations)

        # Persist ErrorDB and retrain classifier
        self._db.save()
        if len(self._db.records) >= 30 and not self._classifier._trained:
            if self._classifier.train():
                self._log(f"classifier trained: {self._classifier.stats()}")

        if self._db.records:
            self._log(f"error db after module: {self._db.format_stats()}")

        return result

    # ── Layer 0: Auto-fix pipeline ───────────────────────────────

    def _apply_auto_fixes(self, code: str, errors: list[TscError],
                          file_path: str) -> tuple[int, str]:
        """Apply fix strategies guided by classifier. Returns (fixes_count, new_code).

        For each error: extract features → classify → apply predicted strategy.
        Record every resolution in ErrorDB for future learning.
        """
        total_fixes = 0
        clusters = self._intel.detect_cascades(errors)

        for cluster in clusters:
            root = cluster.root

            # Extract features for classifier
            features = self._features.extract(
                root.code, root.line, root.message, code, errors
            )
            prediction = self._classifier.predict(features)

            # Skip cascades (classifier or rule says this resolves with root)
            if prediction.should_skip:
                self._log(f"  ⊘ skip cascade: line {root.line} ({prediction.source})")
                self._record_resolution(root, features, "skip_cascade", "none", True)
                continue

            # Try predicted strategy first
            result = None
            strategy_used = prediction.strategy

            if prediction.action == "insert_brace" and self._syntax.can_handle(cluster):
                result = self._syntax.apply(code, cluster)
            elif prediction.action == "fix_typo_constructor" and self._typo.can_handle(cluster):
                result = self._typo.apply(code, cluster)
            elif prediction.action == "fix_double_dot" and self._syntax.can_handle(cluster):
                result = self._syntax.apply(code, cluster)
            elif prediction.action == "add_semicolon" and self._syntax.can_handle(cluster):
                result = self._syntax.apply(code, cluster)
            elif prediction.action == "add_import" and self._import:
                if self._import.can_handle(cluster):
                    result = self._import.apply(code, cluster, file_path)
                    strategy_used = "import"

            # Fallback: try all strategies if prediction didn't work
            if not result or not result.fixed_code:
                for strat_name, strat in [("syntax", self._syntax), ("typo", self._typo)]:
                    if strat.can_handle(cluster):
                        result = strat.apply(code, cluster)
                        if result and result.fixed_code:
                            strategy_used = strat_name
                            break
                if (not result or not result.fixed_code) and self._import:
                    if self._import.can_handle(cluster):
                        result = self._import.apply(code, cluster, file_path)
                        strategy_used = "import"

            # Apply if we got a fix
            if result and result.fixed_code:
                code = result.fixed_code
                total_fixes += result.errors_addressed
                self._log(f"  ✓ {strategy_used}: {result.description} "
                          f"[{prediction.source}:{prediction.confidence:.0%}]")
                self._record_resolution(root, features, prediction.action,
                                       strategy_used, True)
            else:
                # No auto-fix available — will go to LLM
                self._record_resolution(root, features, "llm_fix", "llm", True)

        return total_fixes, code

    def _record_resolution(self, error: TscError, features: ErrorFeatures,
                           action: str, strategy: str, success: bool,
                           tokens: int = 0) -> None:
        """Record a fix resolution in ErrorDB for learning."""
        self._db.record_fix(
            error_code=error.code,
            message=error.message,
            features=features.to_dict(),
            action=action,
            strategy=strategy,
            success=success,
            tokens=tokens,
            project=str(self.project_dir.name),
        )

    # ── LLM interaction ──────────────────────────────────────────

    def _llm_fix(self, prompt: str) -> tuple[str, int]:
        """Send fix prompt to LLM. Returns (fixed_code, tokens_used)."""
        from ...llm.providers import LLMMessage

        resp = self.llm.complete_with_usage(
            [LLMMessage("system", FIX_SYSTEM), LLMMessage("user", prompt)],
            temperature=0.1, max_tokens=8000,
        )
        tokens = resp.usage.total_tokens
        fixed = self._strip_fences(resp.content)
        return fixed, tokens

    def _strip_fences(self, text: str) -> str:
        """Remove markdown code fences from LLM output."""
        text = text.strip()
        if "```" in text:
            lines = text.split("\n")
            content_lines = [
                line for line in lines
                if not re.match(r'^\s*```\w*\s*$', line)
            ]
            return "\n".join(content_lines).strip()
        return text
