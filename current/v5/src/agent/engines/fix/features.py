"""
Feature extraction — convert TSC error + code context into a feature vector.

These features are cheap to compute (no LLM) and capture enough signal
for the classifier to predict the right fix strategy.

Feature categories:
  1. Error identity: code, message pattern
  2. Structural: brace depth, indentation level, line position
  3. Context: keywords nearby, previous/next tokens
  4. Cascade: error density in surrounding lines
  5. Pattern: known fixable patterns detected by regex
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class ErrorFeatures:
    """Extracted features for one TSC error."""
    # Error identity
    error_code: str
    error_category: str         # "syntax", "type", "import", "other"

    # Structural
    brace_depth: int            # nesting level at error line
    indent_level: int           # whitespace indent of error line
    line_position: float        # 0.0=top, 1.0=bottom of file
    file_size: int              # total lines in file

    # Context (±5 lines around error)
    has_try_nearby: bool
    has_catch_nearby: bool
    has_import_nearby: bool
    has_class_nearby: bool
    has_function_nearby: bool
    has_return_nearby: bool

    # Token patterns on error line
    has_double_dot: bool        # ".." without "..."
    has_new_keyword: bool       # "new Something("
    has_throw_keyword: bool
    has_semicolon: bool
    ends_with_brace: bool
    ends_with_semicolon: bool
    ends_with_paren: bool

    # Cascade signals
    errors_same_line: int       # other errors on same line
    errors_within_5: int        # errors within 5 lines
    errors_within_10: int       # errors within 10 lines
    error_density: float        # errors/lines in this file

    # Pattern matches
    pattern_missing_brace: bool     # try{...catch without }
    pattern_typo_constructor: bool  # new Type( instead of new TypeError(
    pattern_double_dot: bool        # obj..prop
    pattern_missing_semicolon: bool # statement without ;
    pattern_missing_import: bool    # used name not in imports

    def to_dict(self) -> dict:
        """Convert to flat dict for ErrorDB storage and classifier input."""
        return {
            "error_code": self.error_code,
            "error_category": self.error_category,
            "brace_depth": self.brace_depth,
            "indent_level": self.indent_level,
            "line_position": round(self.line_position, 2),
            "file_size": self.file_size,
            "has_try_nearby": self.has_try_nearby,
            "has_catch_nearby": self.has_catch_nearby,
            "has_import_nearby": self.has_import_nearby,
            "has_class_nearby": self.has_class_nearby,
            "has_function_nearby": self.has_function_nearby,
            "has_return_nearby": self.has_return_nearby,
            "has_double_dot": self.has_double_dot,
            "has_new_keyword": self.has_new_keyword,
            "has_throw_keyword": self.has_throw_keyword,
            "has_semicolon": self.has_semicolon,
            "ends_with_brace": self.ends_with_brace,
            "ends_with_semicolon": self.ends_with_semicolon,
            "ends_with_paren": self.ends_with_paren,
            "errors_same_line": self.errors_same_line,
            "errors_within_5": self.errors_within_5,
            "errors_within_10": self.errors_within_10,
            "error_density": round(self.error_density, 3),
            "pattern_missing_brace": self.pattern_missing_brace,
            "pattern_typo_constructor": self.pattern_typo_constructor,
            "pattern_double_dot": self.pattern_double_dot,
            "pattern_missing_semicolon": self.pattern_missing_semicolon,
            "pattern_missing_import": self.pattern_missing_import,
        }

    def to_vector(self) -> list[float]:
        """Convert to numeric vector for classifier.

        Booleans → 0/1, strings → hashed category, numbers → as-is.
        """
        cat_map = {"syntax": 0, "type": 1, "import": 2, "other": 3}
        return [
            _code_to_num(self.error_code),
            cat_map.get(self.error_category, 3),
            self.brace_depth,
            self.indent_level,
            self.line_position,
            min(self.file_size / 500.0, 1.0),  # normalize
            float(self.has_try_nearby),
            float(self.has_catch_nearby),
            float(self.has_import_nearby),
            float(self.has_class_nearby),
            float(self.has_function_nearby),
            float(self.has_return_nearby),
            float(self.has_double_dot),
            float(self.has_new_keyword),
            float(self.has_throw_keyword),
            float(self.has_semicolon),
            float(self.ends_with_brace),
            float(self.ends_with_semicolon),
            float(self.ends_with_paren),
            min(self.errors_same_line / 5.0, 1.0),
            min(self.errors_within_5 / 10.0, 1.0),
            min(self.errors_within_10 / 20.0, 1.0),
            self.error_density,
            float(self.pattern_missing_brace),
            float(self.pattern_typo_constructor),
            float(self.pattern_double_dot),
            float(self.pattern_missing_semicolon),
            float(self.pattern_missing_import),
        ]


# Feature names matching to_vector() order — for classifier interpretability
FEATURE_NAMES = [
    "error_code_num", "error_category", "brace_depth", "indent_level",
    "line_position", "file_size_norm", "has_try_nearby", "has_catch_nearby",
    "has_import_nearby", "has_class_nearby", "has_function_nearby",
    "has_return_nearby", "has_double_dot", "has_new_keyword",
    "has_throw_keyword", "has_semicolon", "ends_with_brace",
    "ends_with_semicolon", "ends_with_paren", "errors_same_line_norm",
    "errors_within_5_norm", "errors_within_10_norm", "error_density",
    "pat_missing_brace", "pat_typo_constructor", "pat_double_dot",
    "pat_missing_semicolon", "pat_missing_import",
]

# ── Syntax error codes ──
SYNTAX_CODES = {"TS1002", "TS1003", "TS1005", "TS1009", "TS1011",
                "TS1012", "TS1128", "TS1136", "TS1434", "TS1472"}
TYPE_CODES = {"TS2304", "TS2305", "TS2307", "TS2322", "TS2339",
              "TS2345", "TS2551", "TS2693", "TS2694", "TS7006"}
IMPORT_CODES = {"TS2304", "TS2305", "TS2307"}

# Known typo constructors
TYPO_CONSTRUCTORS = {"Type", "Range", "Reference", "Syntax", "URI", "Eval"}


class FeatureExtractor:
    """Extract features from a TSC error in its code context."""

    def extract(self, error_code: str, error_line: int, error_message: str,
                code: str, all_errors: list = None) -> ErrorFeatures:
        """Extract all features for one error."""
        lines = code.split('\n')
        total_lines = len(lines)
        line_idx = error_line - 1

        # Error identity
        if error_code in SYNTAX_CODES:
            category = "syntax"
        elif error_code in IMPORT_CODES:
            category = "import"
        elif error_code in TYPE_CODES:
            category = "type"
        else:
            category = "other"

        # Error line content
        line_text = lines[line_idx] if 0 <= line_idx < total_lines else ""
        stripped = line_text.strip()

        # Structural
        brace_depth = self._brace_depth_at(lines, line_idx)
        indent_level = len(line_text) - len(line_text.lstrip()) if line_text else 0
        line_position = line_idx / total_lines if total_lines > 0 else 0.5

        # Context window (±5 lines)
        ctx_start = max(0, line_idx - 5)
        ctx_end = min(total_lines, line_idx + 6)
        context = '\n'.join(lines[ctx_start:ctx_end])

        # Cascade signals
        other_errors = all_errors or []
        same_file_errors = [e for e in other_errors
                           if hasattr(e, 'line')]
        errors_same_line = sum(1 for e in same_file_errors if e.line == error_line) - 1
        errors_within_5 = sum(1 for e in same_file_errors
                             if abs(e.line - error_line) <= 5) - 1
        errors_within_10 = sum(1 for e in same_file_errors
                              if abs(e.line - error_line) <= 10) - 1
        error_density = len(same_file_errors) / total_lines if total_lines > 0 else 0

        # Pattern detection
        pattern_missing_brace = self._detect_missing_brace(lines, line_idx)
        pattern_typo_constructor = bool(
            re.search(r'new\s+(' + '|'.join(TYPO_CONSTRUCTORS) + r')\s*\(', stripped)
        )
        pattern_double_dot = bool(re.search(r'(?<!\.)\.\.(?!\.)', stripped))
        pattern_missing_semicolon = self._detect_missing_semicolon(stripped, lines, line_idx)
        pattern_missing_import = self._detect_missing_import(error_code, error_message, lines)

        return ErrorFeatures(
            error_code=error_code,
            error_category=category,
            brace_depth=brace_depth,
            indent_level=indent_level,
            line_position=line_position,
            file_size=total_lines,
            has_try_nearby='try' in context and '{' in context,
            has_catch_nearby='catch' in context,
            has_import_nearby='import ' in context,
            has_class_nearby='class ' in context,
            has_function_nearby=bool(re.search(r'function\s|=>\s*\{', context)),
            has_return_nearby='return ' in context,
            has_double_dot=pattern_double_dot,
            has_new_keyword='new ' in stripped,
            has_throw_keyword='throw ' in stripped,
            has_semicolon=';' in stripped,
            ends_with_brace=stripped.endswith(('{', '}')),
            ends_with_semicolon=stripped.endswith(';'),
            ends_with_paren=stripped.endswith((')',')')),
            errors_same_line=max(0, errors_same_line),
            errors_within_5=max(0, errors_within_5),
            errors_within_10=max(0, errors_within_10),
            error_density=error_density,
            pattern_missing_brace=pattern_missing_brace,
            pattern_typo_constructor=pattern_typo_constructor,
            pattern_double_dot=pattern_double_dot,
            pattern_missing_semicolon=pattern_missing_semicolon,
            pattern_missing_import=pattern_missing_import,
        )

    def _brace_depth_at(self, lines: list[str], target_idx: int) -> int:
        """Count nesting depth at a given line by tracking { and }."""
        depth = 0
        for i in range(min(target_idx + 1, len(lines))):
            line = lines[i]
            # Skip strings (rough approximation)
            cleaned = re.sub(r"'[^']*'|\"[^\"]*\"|`[^`]*`", "", line)
            depth += cleaned.count('{') - cleaned.count('}')
        return max(0, depth)

    def _detect_missing_brace(self, lines: list[str], line_idx: int) -> bool:
        """Detect if there's a missing } before a catch/finally near this line."""
        search_start = max(0, line_idx - 3)
        search_end = min(len(lines), line_idx + 4)

        for i in range(search_start, search_end):
            stripped = lines[i].strip()
            if re.match(r'^catch\s*(\([^)]*\))?\s*\{?', stripped):
                # Check previous non-empty line
                prev = i - 1
                while prev >= 0 and not lines[prev].strip():
                    prev -= 1
                if prev >= 0 and not lines[prev].strip().endswith('}'):
                    return True
        return False

    def _detect_missing_semicolon(self, stripped: str, lines: list[str],
                                   line_idx: int) -> bool:
        """Detect if a statement is missing its semicolon."""
        if not stripped or stripped.endswith((';', '{', '}', ',', '(', ':',
                                              '//', '*/', '/**')):
            return False
        if stripped.startswith(('if', 'else', 'for', 'while', 'do', 'switch',
                                'case', 'default', 'try', 'catch', 'finally',
                                'class', 'interface', 'enum', 'function',
                                'import', 'export', '//', '/*', '*', '@')):
            return False
        # Check if next line looks like a continuation
        if line_idx + 1 < len(lines):
            next_stripped = lines[line_idx + 1].strip()
            if next_stripped.startswith(('.', '+', '-', '?', '&&', '||', '??')):
                return False  # continuation line, no semicolon needed
        # Looks like a statement without semicolon
        return bool(re.match(r'.*\b\w+\s*[+\-*/]?=\s*.+$', stripped))

    def _detect_missing_import(self, error_code: str, message: str,
                                lines: list[str]) -> bool:
        """Detect if error is a missing import (name used but not imported)."""
        if error_code != "TS2304":
            return False
        m = re.search(r"'(\w+)'", message)
        if not m:
            return False
        name = m.group(1)
        # Check if imported
        for line in lines[:40]:  # imports at top
            if 'import' in line and name in line:
                return False
        return True


def _code_to_num(code: str) -> float:
    """Convert TS error code to numeric. TS2304 → 2304."""
    m = re.match(r'TS(\d+)', code)
    return float(m.group(1)) / 10000 if m else 0.5
