"""
Guardrails — COMPATIBILITY SHIM. Real code lives in core.guardrails.

This file re-exports all guardrail types from their new home in core.guardrails
so existing imports continue to work during the migration.
"""
from ..core.guardrails import (
    GuardrailTripped,
    RunLimits,
    RunGuard,
)

__all__ = ["GuardrailTripped", "RunLimits", "RunGuard"]
