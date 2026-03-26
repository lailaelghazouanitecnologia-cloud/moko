"""
DevManager — COMPATIBILITY SHIM during migration.

Re-exports from dev/manager.py. Will be fully migrated in a future phase.
"""
from ..dev.manager import DevManager

__all__ = ["DevManager"]
