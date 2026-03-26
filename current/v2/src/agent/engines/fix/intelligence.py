"""
ErrorIntelligence — smart pre-processing of TSC errors before sending to LLM.

Three layers of intelligence:
  1. AutoFix: programmatic repairs for trivial syntax errors (no LLM needed)
  2. Cascade Detection: deduplicate cascading errors from a single root cause
  3. Error Prioritization: fix syntax errors before type errors, group by root cause

This sits between tsc output and the LLM fix prompt, reducing token waste
and improving fix success rate.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class TscError:
    """One TypeScript compiler error."""
    file: str
    line: int
    code: str
    message: str


@dataclass
class ErrorCluster:
    """A group of related errors with a single root cause."""
    root: TscError
    cascade: list[TscError] = field(default_factory=list)
    auto_fix: Optional[str] = None  # If set, we can fix this without LLM

    @property
    def total(self) -> int:
        return 1 + len(self.cascade)

    def summary(self) -> str:
        if self.cascade:
            return (f"ROOT: line {self.root.line} {self.root.code} — {self.root.message} "
                    f"(+{len(self.cascade)} cascade errors)")
        return f"line {self.root.line} {self.root.code} — {self.root.message}"


@dataclass
class AutoFixResult:
    """Result of attempting programmatic fixes."""
    fixed_code: str
    fixes_applied: list[str]
    errors_addressed: int


# TSC error codes that indicate syntax problems (cause cascades)
SYNTAX_CODES = {
    "TS1005",  # 'x' expected (missing token)
    "TS1003",  # Identifier expected
    "TS1002",  # Unterminated string literal
    "TS1009",  # Trailing comma not allowed
    "TS1011",  # Element access expression should take an argument
    "TS1012",  # Unexpected token
    "TS1128",  # Declaration or statement expected
    "TS1434",  # Unexpected keyword or identifier
    "TS1472",  # 'catch' or 'finally' expected
    "TS1136",  # Property assignment expected
}

# TSC error codes for type errors (don't cascade as much)
TYPE_CODES = {
    "TS2304",  # Cannot find name
    "TS2305",  # Module has no exported member
    "TS2339",  # Property does not exist on type
    "TS2345",  # Argument of type X not assignable to Y
    "TS2322",  # Type X not assignable to type Y
    "TS2551",  # Property X does not exist, did you mean Y?
    "TS2307",  # Cannot find module
    "TS2694",  # Namespace has no exported member
    "TS2693",  # X only refers to a type but is used as a value
    "TS7006",  # Parameter implicitly has 'any' type
}


class ErrorIntelligence:
    """Smart error analysis and pre-processing for the fix loop."""

    def __init__(self, project_dir: Path, verbose: bool = False):
        self.project_dir = Path(project_dir)
        self.verbose = verbose

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [error-intel] {msg}")

    # ── Layer 1: Auto-Fix ────────────────────────────────────────

    def auto_fix(self, file_path: Path, errors: list[TscError]) -> Optional[AutoFixResult]:
        """Try to fix trivial syntax errors programmatically. No LLM needed.

        Handles:
          - Missing } before catch/finally
          - `new Type(` → `new TypeError(`
          - Double dots `..` in member access
          - Missing semicolons causing cascade
          - Unclosed template literals
        """
        try:
            code = file_path.read_text()
        except (OSError, IOError):
            return None

        original = code
        fixes = []
        errors_fixed = 0

        # Fix 1: Missing } before catch — "try { ... catch" without closing brace
        # Pattern: line ends with content, next non-empty line starts with "catch"
        fix1_pattern = re.compile(
            r'(\n)([ \t]*)((?:(?!\}).)*\n)'  # line that doesn't end with }
            r'([ \t]*catch\s*(?:\([^)]*\))?\s*\{)',  # followed by catch
            re.MULTILINE,
        )
        # More targeted: find "try {" blocks where } is missing before catch
        lines = code.split('\n')
        new_lines = list(lines)
        modified = False

        for i, line in enumerate(lines):
            stripped = line.strip()

            # Fix 1: "catch" without preceding "}" on previous non-empty line
            if re.match(r'^catch\s*(\([^)]*\))?\s*\{?', stripped):
                # Look back for the missing }
                prev_idx = i - 1
                while prev_idx >= 0 and not lines[prev_idx].strip():
                    prev_idx -= 1
                if prev_idx >= 0:
                    prev_stripped = lines[prev_idx].strip()
                    if not prev_stripped.endswith('}'):
                        # Find the indentation of the try block
                        indent = len(line) - len(line.lstrip())
                        new_lines[prev_idx] = lines[prev_idx].rstrip()
                        # Insert } before catch
                        new_lines[i] = ' ' * indent + '} ' + stripped
                        fixes.append(f"line {i+1}: added missing '}}' before catch")
                        errors_fixed += 3  # typically fixes 3-5 cascade errors
                        modified = True

            # Fix 2: `new Type(` → `new TypeError(` (common LLM abbreviation)
            if 'new Type(' in stripped and 'new TypeError(' not in stripped and 'new TypedArray(' not in stripped:
                new_lines[i] = line.replace('new Type(', 'new TypeError(')
                fixes.append(f"line {i+1}: 'new Type(' → 'new TypeError('")
                errors_fixed += 1
                modified = True

            # Fix 3: Double dots `..` in member access (not spread operator)
            # e.g., `foo.trim()..length` → `foo.trim().length`
            double_dot = re.search(r'(?<!\.)\.\.(?!\.)', stripped)
            if double_dot and '...' not in stripped:
                new_lines[i] = re.sub(r'(?<!\.)\.\.(?!\.)', '.', line)
                fixes.append(f"line {i+1}: removed duplicate '.' in member access")
                errors_fixed += 1
                modified = True

            # Fix 4: Missing semicolon after statement that causes cascade
            # Only for lines inside blocks that clearly need semicolons
            if (stripped and
                not stripped.endswith((';', '{', '}', ',', '(', ':', '//', '*/')) and
                not stripped.startswith(('if', 'else', 'for', 'while', 'do', 'switch',
                                        'case', 'default', 'try', 'catch', 'finally',
                                        'class', 'interface', 'enum', 'function',
                                        'import', 'export', '//', '/*', '*', '@')) and
                re.match(r'^.*\+= \d+\s*$', stripped)):
                # Only fix obvious cases like `offset += 4` without semicolon
                new_lines[i] = line.rstrip() + ';'
                fixes.append(f"line {i+1}: added missing semicolon")
                errors_fixed += 1
                modified = True

        if modified:
            code = '\n'.join(new_lines)

        if code != original:
            return AutoFixResult(
                fixed_code=code,
                fixes_applied=fixes,
                errors_addressed=errors_fixed,
            )
        return None

    # ── Layer 2: Cascade Detection ───────────────────────────────

    def detect_cascades(self, errors: list[TscError]) -> list[ErrorCluster]:
        """Group errors into clusters: root cause + cascade effects.

        Rules:
          1. Syntax errors (TS1xxx) within 10 lines of each other = same cascade
          2. A TS1005/TS1003 followed by TS1434/TS1472 = one root cause
          3. Multiple TS2304 for the same name = one missing import
          4. Errors on the same line = one issue
        """
        if not errors:
            return []

        # Sort by line number
        sorted_errors = sorted(errors, key=lambda e: (e.file, e.line))

        clusters: list[ErrorCluster] = []
        used: set[int] = set()

        for idx, err in enumerate(sorted_errors):
            if idx in used:
                continue

            cluster = ErrorCluster(root=err)
            used.add(idx)

            # Look for cascade followers
            for jdx in range(idx + 1, len(sorted_errors)):
                if jdx in used:
                    continue
                other = sorted_errors[jdx]
                if other.file != err.file:
                    break

                is_cascade = False

                # Rule 1: Syntax errors within 10 lines
                if (err.code in SYNTAX_CODES and other.code in SYNTAX_CODES
                        and abs(other.line - err.line) <= 10):
                    is_cascade = True

                # Rule 2: Same-line errors are always one issue
                if other.line == err.line:
                    is_cascade = True

                # Rule 3: TS1005 root → TS1472/TS1434/TS1003 within 40 lines
                if (err.code in ("TS1005", "TS1472") and
                        other.code in SYNTAX_CODES and
                        abs(other.line - cluster.root.line) <= 40):
                    is_cascade = True

                # Rule 4: Multiple "Cannot find name" for same symbol
                if (err.code == "TS2304" and other.code == "TS2304" and
                        self._extract_name(err.message) == self._extract_name(other.message)):
                    is_cascade = True

                if is_cascade:
                    cluster.cascade.append(other)
                    used.add(jdx)

            clusters.append(cluster)

        return clusters

    # ── Layer 3: Priority Sorting ────────────────────────────────

    def prioritize(self, clusters: list[ErrorCluster]) -> list[ErrorCluster]:
        """Sort clusters by fix priority.

        Order:
          1. Syntax errors with auto-fix available (free to fix)
          2. Syntax errors (fix first — they cause cascades)
          3. Missing imports/names (TS2304, TS2307)
          4. Type mismatches (TS2322, TS2345)
          5. Everything else
        """
        def priority_key(c: ErrorCluster) -> tuple:
            code = c.root.code
            has_auto = 0 if c.auto_fix else 1
            if code in SYNTAX_CODES:
                return (has_auto, 0, -c.total, c.root.line)
            elif code in ("TS2304", "TS2307", "TS2305"):
                return (1, 1, -c.total, c.root.line)
            elif code in ("TS2322", "TS2345", "TS2339"):
                return (1, 2, -c.total, c.root.line)
            else:
                return (1, 3, -c.total, c.root.line)

        return sorted(clusters, key=priority_key)

    # ── Smart Prompt Builder ─────────────────────────────────────

    def build_smart_prompt(self, code: str, errors: list[TscError],
                           context_files: dict[str, str] = None,
                           context_engine=None) -> str:
        """Build an intelligent fix prompt that groups errors by root cause.

        Instead of listing 47 errors, this might say:
          "3 root issues causing 47 errors:
           1. Missing } before catch on line 188 (causes 11 syntax errors)
           2. 'Type' should be 'TypeError' on lines 115, 118
           3. Double dot '..' on line 130"
        """
        clusters = self.detect_cascades(errors)
        clusters = self.prioritize(clusters)

        parts = [f"## Current code\n```typescript\n{code}\n```\n"]

        # Cluster summary
        total_errors = sum(c.total for c in clusters)
        parts.append(f"## {len(clusters)} root issues causing {total_errors} compiler errors\n")

        for i, cluster in enumerate(clusters, 1):
            root = cluster.root
            parts.append(f"### Issue {i}: {root.code} at line {root.line}")
            parts.append(f"**{root.message}**")

            if cluster.cascade:
                parts.append(
                    f"↳ This causes {len(cluster.cascade)} cascade errors "
                    f"(lines {', '.join(str(e.line) for e in cluster.cascade[:5])})"
                )
                parts.append("**Fix the root cause and the cascade errors will disappear.**")

            # Add code context around the error (3 lines before/after)
            lines = code.split('\n')
            start = max(0, root.line - 4)
            end = min(len(lines), root.line + 3)
            snippet = '\n'.join(
                f"{'→' if j + 1 == root.line else ' '} {j + 1}: {lines[j]}"
                for j in range(start, end)
            )
            parts.append(f"```\n{snippet}\n```")

            # Hint for common patterns
            hint = self._generate_hint(root, code)
            if hint:
                parts.append(f"💡 **Hint:** {hint}")

            parts.append("")

        # Context engine type definitions (deduplicated)
        if context_engine and hasattr(context_engine, 'is_initialized') and context_engine.is_initialized:
            seen = set()
            engine_parts = []
            for cluster in clusters[:5]:
                try:
                    snapshot = context_engine.snapshot.for_fix(
                        cluster.root.file, cluster.root.line,
                        cluster.root.code, cluster.root.message,
                        context_engine.index,
                    )
                    if snapshot and len(snapshot) > 30 and snapshot not in seen:
                        engine_parts.append(snapshot)
                        seen.add(snapshot)
                except Exception:
                    pass
            if engine_parts:
                parts.append("## Type definitions (from project index)\n")
                parts.extend(engine_parts)

        # Context files (trimmed)
        if context_files:
            parts.append("## Available types from other modules\n")
            for path, content in list(context_files.items())[:8]:
                trimmed = content[:2000] if len(content) > 2000 else content
                parts.append(f"### {path}\n```typescript\n{trimmed}\n```\n")

        parts.append("Fix ONLY the listed root issues. The cascade errors will resolve automatically.")
        parts.append("Output the COMPLETE fixed file.")
        return "\n".join(parts)

    # ── Full Pipeline ────────────────────────────────────────────

    def process(self, file_path: Path, errors: list[TscError]) -> tuple[
        Optional[AutoFixResult], list[ErrorCluster]
    ]:
        """Full intelligence pipeline:
        1. Try auto-fix for trivial errors
        2. Detect cascades in remaining errors
        3. Prioritize for LLM

        Returns (auto_fix_result, prioritized_clusters).
        """
        # Layer 1: Auto-fix
        auto_result = self.auto_fix(file_path, errors)

        if auto_result:
            self._log(
                f"auto-fixed {len(auto_result.fixes_applied)} issues "
                f"(~{auto_result.errors_addressed} errors addressed):"
            )
            for fix in auto_result.fixes_applied:
                self._log(f"  ✓ {fix}")

        # Layer 2+3: Cluster and prioritize (on original errors — LLM will
        # handle whatever auto-fix didn't catch)
        clusters = self.detect_cascades(errors)
        clusters = self.prioritize(clusters)

        if clusters:
            self._log(
                f"detected {len(clusters)} root causes from {sum(c.total for c in clusters)} errors"
            )
            for c in clusters[:5]:
                self._log(f"  • {c.summary()}")

        return auto_result, clusters

    # ── Helpers ───────────────────────────────────────────────────

    def _extract_name(self, message: str) -> Optional[str]:
        """Extract the referenced name from an error message."""
        m = re.search(r"'(\w+)'", message)
        return m.group(1) if m else None

    def _generate_hint(self, error: TscError, code: str) -> Optional[str]:
        """Generate a human-readable hint for common error patterns."""
        lines = code.split('\n')
        line_idx = error.line - 1

        if line_idx < 0 or line_idx >= len(lines):
            return None

        line_text = lines[line_idx]

        # Missing } before catch
        if error.code == "TS1005" and "'try'" in error.message:
            return "A `try` block is missing its closing `}` before `catch`."

        if error.code == "TS1472":
            # Look back for unclosed try
            for j in range(line_idx - 1, max(0, line_idx - 20), -1):
                if 'try' in lines[j] and '{' in lines[j]:
                    return f"The `try` block starting at line {j+1} is missing its closing `}}`."
            return "A `try` block is missing its closing `}` — add `}}` before `catch`."

        # new Type() instead of new TypeError()
        if error.code == "TS2304" and "'Type'" in error.message:
            if 'new Type(' in line_text:
                return "`new Type(` should be `new TypeError(` — 'Type' is not a constructor."

        # Double dot
        if error.code == "TS1003" and line_idx < len(lines):
            if '..' in line_text and '...' not in line_text:
                return "There's a double dot `..` — should be a single `.` for member access."

        # Cannot find name — suggest import
        if error.code == "TS2304":
            name = self._extract_name(error.message)
            if name:
                # Check if it's used but not imported
                import_pattern = re.compile(rf'\b{re.escape(name)}\b')
                has_import = any(
                    'import' in l and import_pattern.search(l)
                    for l in lines[:30]  # imports are at top
                )
                if not has_import:
                    return f"`{name}` is used but not imported. Add an import statement."

        # Property does not exist — suggest similar
        if error.code == "TS2339":
            return "Check the type definition for the correct property name."

        return None
