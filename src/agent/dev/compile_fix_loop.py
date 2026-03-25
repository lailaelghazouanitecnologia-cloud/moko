"""
CompileFixLoop — iterate tsc check -> LLM fix -> tsc check until clean.

DEPRECATED: Prefer engines/fix/ (FixEngine) which adds layered intelligence:
  - Auto-fix for trivial syntax errors (no LLM needed)
  - Cascade detection (47 errors → 3 root causes)
  - Smart prompts with hints and context
  - Strategy pattern (syntax, import, typo strategies)

CompileFixLoop is kept for backward compatibility with DevSupervisor.

Each iteration:
  1. Run tsc --noEmit on the module directory
  2. Parse errors into structured TscError objects
  3. Group errors by file
  4. For each file: ask LLM to fix the specific errors
  5. Write fixed code back to disk
  6. Repeat until clean or max iterations reached
"""
from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from ..llm.providers import LLMProvider, LLMMessage


@dataclass
class TscError:
    """One TypeScript compiler error."""
    file: str
    line: int
    code: str       # e.g. "TS2304"
    message: str


@dataclass
class CompileResult:
    """Result of a tsc check."""
    errors: list[TscError] = field(default_factory=list)
    error_count: int = 0
    raw_output: str = ""
    success: bool = False


@dataclass
class FixIteration:
    """Record of one fix attempt."""
    iteration: int
    errors_before: int
    errors_after: int
    tokens_used: int = 0
    changes_made: list[str] = field(default_factory=list)


# Regex to parse tsc error output: "src/core/types.ts(15,3): error TS2304: Cannot find name 'Foo'."
_TSC_ERROR_RE = re.compile(
    r'^(.+?)\((\d+),\d+\):\s+error\s+(TS\d+):\s+(.+)$',
    re.MULTILINE,
)


FIX_SYSTEM = """You are fixing TypeScript compiler errors in generated code.

Rules:
1. Fix ONLY the listed compiler errors. Do not rewrite the file.
2. Preserve all existing functionality and logic.
3. Output the COMPLETE fixed file — not a diff, not a partial snippet.
4. If a type is missing, add the appropriate import or define it.
5. If a property doesn't exist on a type, check the context files for the correct API.
6. Do NOT add comments like "// fixed" or "// changed".
7. Output ONLY the source code. No markdown fences, no explanations."""


class CompileFixLoop:
    """Iterate: tsc check -> LLM fix -> tsc check, until clean or max iterations."""

    def __init__(self, llm: LLMProvider, project_dir: Path,
                 max_iterations: int = 4, verbose: bool = False):
        self.llm = llm
        self.project_dir = Path(project_dir)
        self.max_iterations = max_iterations
        self.verbose = verbose
        self.total_tokens = 0
        self.context_engine = None  # Optional ContextEngine for richer fix context

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [fix-loop] {msg}")

    def check_tsc(self, file_path: Path = None) -> CompileResult:
        """Run tsc --noEmit, optionally on a specific file. Returns structured result."""
        cmd = ["npx", "tsc", "--noEmit", "--strict"]
        if file_path:
            cmd.append(str(file_path))

        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True,
                timeout=60, cwd=self.project_dir,
            )
        except subprocess.TimeoutExpired:
            self._log("tsc timed out (60s)")
            return CompileResult(raw_output="TIMEOUT", error_count=-1)
        except FileNotFoundError:
            self._log("tsc/npx not found")
            return CompileResult(raw_output="TSC_NOT_FOUND", error_count=-1)

        raw = result.stdout + result.stderr
        errors = self._parse_errors(raw)

        return CompileResult(
            errors=errors,
            error_count=len(errors),
            raw_output=raw,
            success=(result.returncode == 0),
        )

    def check_module(self, module_dir: Path) -> CompileResult:
        """Run tsc on all .ts files in a module directory."""
        ts_files = list(module_dir.rglob("*.ts"))
        if not ts_files:
            return CompileResult(success=True)

        # Check the whole project (tsc needs tsconfig context)
        return self.check_tsc()

    def fix_errors(self, file_path: Path, errors: list[TscError],
                   context_files: dict[str, str] = None) -> tuple[str, int]:
        """Ask LLM to fix specific errors in a file. Returns (fixed_code, tokens_used)."""
        code = file_path.read_text()

        prompt = self._build_fix_prompt(code, errors, context_files)

        resp = self.llm.complete_with_usage(
            [LLMMessage("system", FIX_SYSTEM), LLMMessage("user", prompt)],
            temperature=0.1, max_tokens=8000,
        )
        tokens = resp.usage.total_tokens
        self.total_tokens += tokens

        fixed = self._strip_fences(resp.content)
        return fixed, tokens

    def run(self, module_dir: Path,
            context_files: dict[str, str] = None) -> list[FixIteration]:
        """Main loop: check -> fix -> check until clean or max iterations.

        Uses snapshot/revert: saves file contents before each fix attempt.
        If errors increase after a fix, reverts to the snapshot.
        """
        iterations: list[FixIteration] = []
        best_error_count = float('inf')
        best_seen_iteration = -1

        for i in range(self.max_iterations):
            # 1. Check
            result = self.check_module(module_dir)

            if result.error_count < 0:
                self._log("tsc unavailable, skipping fix loop")
                break

            if result.success:
                self._log(f"iteration {i}: CLEAN")
                iterations.append(FixIteration(
                    iteration=i, errors_before=0, errors_after=0,
                ))
                break

            # Filter errors to this module only
            module_rel = str(module_dir.relative_to(self.project_dir))
            module_errors = [e for e in result.errors if e.file.startswith(module_rel)]

            errors_before = len(module_errors)
            self._log(f"iteration {i}: {errors_before} errors in {module_rel}")

            if errors_before == 0:
                iterations.append(FixIteration(
                    iteration=i, errors_before=0, errors_after=0,
                ))
                break

            # Early termination: if errors aren't decreasing for 2 iterations
            if errors_before >= best_error_count and i - best_seen_iteration >= 2:
                self._log(f"errors not decreasing, stopping (best={best_error_count})")
                break

            if errors_before < best_error_count:
                best_error_count = errors_before
                best_seen_iteration = i

            # 2. SNAPSHOT: save all files before fix attempt
            snapshot: dict[str, str] = {}
            by_file: dict[str, list[TscError]] = {}
            for err in module_errors:
                by_file.setdefault(err.file, []).append(err)

            for rel_file in by_file:
                abs_path = self.project_dir / rel_file
                if abs_path.exists():
                    snapshot[rel_file] = abs_path.read_text()

            # 3. Fix each file
            total_tokens = 0
            changes = []
            for rel_file, file_errors in by_file.items():
                abs_path = self.project_dir / rel_file
                if not abs_path.exists():
                    continue

                self._log(f"  fixing {rel_file} ({len(file_errors)} errors)")
                fixed_code, tokens = self.fix_errors(abs_path, file_errors, context_files)
                total_tokens += tokens

                if fixed_code.strip():
                    abs_path.write_text(fixed_code + "\n")
                    changes.append(rel_file)

            # 4. Re-check to get updated count
            recheck = self.check_module(module_dir)
            recheck_module = [e for e in recheck.errors if e.file.startswith(module_rel)]
            errors_after = len(recheck_module)

            # 5. REVERT if errors increased — the fix made things worse
            if errors_after > errors_before:
                self._log(f"  fix WORSENED errors ({errors_before}->{errors_after}), reverting snapshot")
                for rel_file, original_code in snapshot.items():
                    abs_path = self.project_dir / rel_file
                    abs_path.write_text(original_code)
                errors_after = errors_before  # restored to pre-fix state

            iterations.append(FixIteration(
                iteration=i,
                errors_before=errors_before,
                errors_after=errors_after,
                tokens_used=total_tokens,
                changes_made=changes,
            ))

            if recheck.success or errors_after == 0:
                self._log(f"iteration {i}: fixed all errors")
                break

        return iterations

    def _parse_errors(self, output: str) -> list[TscError]:
        """Parse tsc output into structured errors."""
        errors = []
        for match in _TSC_ERROR_RE.finditer(output):
            errors.append(TscError(
                file=match.group(1),
                line=int(match.group(2)),
                code=match.group(3),
                message=match.group(4),
            ))
        return errors

    def _build_fix_prompt(self, code: str, errors: list[TscError],
                          context_files: dict[str, str] = None) -> str:
        """Build the user prompt for the fix LLM call."""
        parts = [f"## Current code\n```typescript\n{code}\n```\n"]

        parts.append("## Compiler errors\n")
        for err in errors:
            parts.append(f"- Line {err.line}: {err.code} — {err.message}")
        parts.append("")

        # Use context engine for targeted type definitions
        if self.context_engine and self.context_engine.is_initialized:
            engine_parts = []
            for err in errors[:5]:  # limit to first 5 errors
                try:
                    snapshot = self.context_engine.snapshot.for_fix(
                        err.file, err.line, err.code, err.message,
                        self.context_engine.index,
                    )
                    if snapshot and len(snapshot) > 30:
                        engine_parts.append(snapshot)
                except Exception:
                    pass
            if engine_parts:
                parts.append("## Type definitions (from project index)\n")
                # Deduplicate
                seen = set()
                for ep in engine_parts:
                    if ep not in seen:
                        parts.append(ep)
                        seen.add(ep)

        if context_files:
            parts.append("## Available types from other modules\n")
            for path, content in list(context_files.items())[:10]:
                # Trim large files
                trimmed = content[:3000] if len(content) > 3000 else content
                parts.append(f"### {path}\n```typescript\n{trimmed}\n```\n")

        parts.append("Fix ONLY the listed errors. Output the COMPLETE fixed file.")
        return "\n".join(parts)

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
