"""
ProjectDuel — COMPATIBILITY SHIM during migration.

Re-exports from duel/project.py. Will be removed in a future phase.
"""
from ..duel.project import ProjectDuel, ProjectDuelReport, AgentResult

__all__ = ["ProjectDuel", "ProjectDuelReport", "AgentResult"]
