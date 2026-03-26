"""
LanguageAdapter — multi-language support for QualityEngine.

Each adapter knows how to extract metrics, detect issues, and apply fixes
for a specific programming language. All adapters produce CodeMetrics with
the same UNIVERSAL fields, enabling cross-language KNN.

Available:
  - TypeScriptAdapter (default, full support)
  - PythonAdapter (future, ast-grep-py already supports Python)
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from .metrics import CodeMetrics, extract_metrics, FeatureScope


class QualityIssueInfo:
    """Lightweight issue info from adapter detection."""
    def __init__(self, issue_type: str, severity: str, description: str,
                 line: int = 0, column: int = 0):
        self.issue_type = issue_type
        self.severity = severity
        self.description = description
        self.line = line
        self.column = column


class LanguageAdapter(ABC):
    """Base class for language-specific quality analysis."""

    LANGUAGE: str = ""

    @abstractmethod
    def extract_metrics(self, code: str, filename: str = "") -> CodeMetrics:
        """Extract CodeMetrics from source code."""
        ...

    @abstractmethod
    def detect_issues(
        self, code: str, metrics: CodeMetrics
    ) -> List[QualityIssueInfo]:
        """Detect quality issues in source code."""
        ...

    @abstractmethod
    def get_strategy_names(self) -> List[str]:
        """Return available auto-fix strategy names for this language."""
        ...


class TypeScriptAdapter(LanguageAdapter):
    """TypeScript quality adapter — uses existing quality_features + ast_detection."""

    LANGUAGE = "typescript"

    def __init__(self):
        from .quality_features import QualityFeatureExtractor, detect_issues
        from .ast_detection import detect_with_ast, HAS_AST_GREP
        self._extractor = QualityFeatureExtractor()
        self._detect_issues = detect_issues
        self._ast_detect = detect_with_ast if HAS_AST_GREP else None

    def extract_metrics(self, code: str, filename: str = "") -> CodeMetrics:
        cm = extract_metrics(code)
        cm.language = "typescript"

        # Enhance with AST detection if available
        if self._ast_detect:
            ast = self._ast_detect(code, "typescript")
            if ast:
                # AST counts are more accurate — override regex
                cm.any_count = ast.any_type_count
                cm.generic_count = ast.generic_usage_count
                cm.union_count = ast.union_type_count
                cm.type_alias_count = ast.type_alias_count
                cm.interface_count = ast.interface_count
                cm.class_count = ast.class_count

        return cm

    def detect_issues(
        self, code: str, metrics: CodeMetrics
    ) -> List[QualityIssueInfo]:
        features = self._extractor.extract(code)
        raw_issues = self._detect_issues(features)
        return [
            QualityIssueInfo(itype, sev, desc)
            for itype, sev, desc in raw_issues
        ]

    def get_strategy_names(self) -> List[str]:
        return [
            "add_types", "rename", "restructure", "extract_constants",
            "encapsulate", "add_error_handling", "add_docs",
        ]


class PythonAdapter(LanguageAdapter):
    """Python quality adapter — future, uses ast-grep for Python AST."""

    LANGUAGE = "python"

    def extract_metrics(self, code: str, filename: str = "") -> CodeMetrics:
        cm = extract_metrics(code)
        cm.language = "python"

        # Python-specific: missing type hints = weak_type_density
        from .ast_detection import detect_python_with_ast
        ast = detect_python_with_ast(code)
        if ast:
            cm.any_count = ast.any_type_count  # untyped params
            cm.empty_catch_ratio = ast.empty_catch_count

        # TS_ONLY fields are None for Python
        cm.readonly_count = None
        cm.jsdoc_count = None
        cm.optional_chaining_count = None
        cm.nullish_coalescing_count = None

        return cm

    def detect_issues(
        self, code: str, metrics: CodeMetrics
    ) -> List[QualityIssueInfo]:
        issues = []
        if metrics.any_count and metrics.any_count > 3:
            issues.append(QualityIssueInfo(
                "weak_types", "major",
                f"{metrics.any_count} parameters without type hints"
            ))
        return issues

    def get_strategy_names(self) -> List[str]:
        return ["add_types", "rename", "add_docs"]


def get_adapter(language: str = "typescript") -> LanguageAdapter:
    """Get the appropriate adapter for a language."""
    adapters = {
        "typescript": TypeScriptAdapter,
        "python": PythonAdapter,
    }
    cls = adapters.get(language, TypeScriptAdapter)
    return cls()
