"""
Blueprint — COMPATIBILITY SHIM. Real code lives in core.models.

This file re-exports all blueprint types from their new home in core.models
so existing imports continue to work during the migration.
"""
from ..core.models import (
    FieldSpec,
    MethodSpec,
    TypeBlueprint,
    ModuleBlueprint,
)

__all__ = ["FieldSpec", "MethodSpec", "TypeBlueprint", "ModuleBlueprint"]
