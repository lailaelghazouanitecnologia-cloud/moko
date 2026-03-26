"""Custom exception hierarchy for the dev pipeline.

Replaces generic `except Exception` with structured, recoverable errors.
"""
from __future__ import annotations

from typing import List, Optional


class AVAError(Exception):
    """Base class for all AVA pipeline errors."""
    pass


class CompilationError(AVAError):
    """TypeScript compilation failed — typically recoverable via fix loop."""
    def __init__(self, file: str, errors: List[str], message: str = ""):
        self.file = file
        self.errors = errors
        super().__init__(message or f"{file}: {len(errors)} compilation errors")


class BlueprintError(AVAError):
    """Blueprint generation or parsing failed."""
    def __init__(self, type_name: str, reason: str):
        self.type_name = type_name
        self.reason = reason
        super().__init__(f"Blueprint error for {type_name}: {reason}")


class YAMLParseError(AVAError):
    """YAML parsing failed — bad descriptor or workspace."""
    def __init__(self, path: str, reason: str):
        self.path = path
        self.reason = reason
        super().__init__(f"YAML parse error in {path}: {reason}")


class ReferenceNotFoundError(AVAError):
    """Reference project data not found."""
    def __init__(self, project: str, detail: str = ""):
        self.project = project
        super().__init__(f"Reference not found: {project}" + (f" ({detail})" if detail else ""))


class FeatureASTError(AVAError):
    """Feature AST build or selection failed."""
    pass


class LLMError(AVAError):
    """LLM call failed (timeout, rate limit, bad response)."""
    def __init__(self, provider: str, reason: str):
        self.provider = provider
        self.reason = reason
        super().__init__(f"LLM error ({provider}): {reason}")


class DecompositionError(AVAError):
    """Task decomposition failed — could not split goal into modules."""
    def __init__(self, goal: str, reason: str):
        self.goal = goal
        self.reason = reason
        super().__init__(f"Decomposition failed for '{goal}': {reason}")
