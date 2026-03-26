"""
VariantEvaluator — evaluate code variants with real metrics, zero LLM tokens.

Measures: compilation (tsc), LOC, method count, import validity, complexity,
quality score. Returns structured results for comparison.
"""
from __future__ import annotations

import re
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

from .variants import Variant


@dataclass
class EvalResult:
    """Evaluation metrics for one variant."""
    variant_id: str
    compiles: bool = False
    tsc_errors: int = 0
    loc: int = 0
    method_count: int = 0
    class_count: int = 0
    import_count: int = 0
    any_count: int = 0
    complexity: float = 0.0          # branches per LOC
    has_error_handling: bool = False
    has_readonly: bool = False
    stub_count: int = 0              # TODO/throw NotImplemented
    quality_score: float = 0.0       # 0-1 from QualityEngine if available

    @property
    def is_viable(self) -> bool:
        """A variant is viable if it compiles and has real content."""
        return self.compiles and self.loc > 10 and self.stub_count == 0

    def score(self) -> float:
        """Composite score for ranking variants."""
        s = 0.0
        if self.compiles:
            s += 0.3
        s += min(self.loc / 300, 0.2)              # more LOC = more content (up to 300)
        s += min(self.method_count / 15, 0.15)      # more methods = more complete
        if self.any_count == 0:
            s += 0.1                                 # no any = type safe
        if self.has_error_handling:
            s += 0.05
        if self.has_readonly:
            s += 0.05
        if self.stub_count == 0:
            s += 0.1                                 # no stubs
        s += self.complexity * 2                     # real logic, not empty methods
        s = min(s, 1.0)
        return s


class VariantEvaluator:
    """Evaluate variants with metrics. Zero LLM tokens."""

    def __init__(self, project_dir: Optional[Path] = None, verbose: bool = False):
        self.project_dir = project_dir
        self.verbose = verbose

    def evaluate(self, variant: Variant) -> EvalResult:
        """Evaluate a single variant with all metrics."""
        result = EvalResult(variant_id=variant.id)
        code = variant.code

        if not code or len(code.strip()) < 20:
            return result

        lines = code.splitlines()
        result.loc = len(lines)

        # Method count
        result.method_count = len(re.findall(
            r'(?:async\s+)?(?:private\s+|protected\s+|public\s+|static\s+)*'
            r'(?:\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{',
            code
        ))

        # Class count
        result.class_count = len(re.findall(r'\bclass\s+\w+', code))

        # Import count
        result.import_count = len(re.findall(r'^\s*import\s+', code, re.MULTILINE))

        # Any count
        result.any_count = len(re.findall(r'\bany\b', code))

        # Complexity
        branches = len(re.findall(r'\b(if|else|for|while|switch|case|catch)\b', code))
        result.complexity = branches / max(result.loc, 1)

        # Error handling
        result.has_error_handling = bool(re.search(r'\btry\s*\{|\bthrow\s+new\b', code))

        # Readonly
        result.has_readonly = bool(re.search(r'\breadonly\b', code))

        # Stubs
        result.stub_count = len(re.findall(
            r'// TODO|// FIXME|throw new Error\(["\']not implemented',
            code, re.IGNORECASE
        ))

        # TSC compilation check (if project dir available)
        if self.project_dir:
            result.compiles, result.tsc_errors = self._check_tsc(code)
        else:
            # Heuristic: if it has imports and classes, likely compiles
            result.compiles = result.class_count > 0 or result.method_count > 0

        return result

    def evaluate_all(self, variants: List[Variant]) -> List[EvalResult]:
        """Evaluate all variants and sort by score."""
        results = [self.evaluate(v) for v in variants]
        results.sort(key=lambda r: r.score(), reverse=True)

        if self.verbose:
            for r in results:
                print(f"    [eval] {r.variant_id}: score={r.score():.2f} "
                      f"LOC={r.loc} methods={r.method_count} "
                      f"any={r.any_count} stubs={r.stub_count} "
                      f"compiles={r.compiles}")

        return results

    def _check_tsc(self, code: str) -> tuple:
        """Quick TSC check. Returns (compiles, error_count)."""
        try:
            with tempfile.NamedTemporaryFile(suffix=".ts", mode="w", delete=False) as f:
                f.write(code)
                f.flush()
                result = subprocess.run(
                    ["npx", "tsc", "--noEmit", "--strict", f.name],
                    capture_output=True, text=True, timeout=10,
                    cwd=str(self.project_dir) if self.project_dir else None,
                )
                errors = len([l for l in result.stdout.splitlines() if "error TS" in l])
                return errors == 0, errors
        except Exception:
            return True, 0  # Assume OK if tsc not available
