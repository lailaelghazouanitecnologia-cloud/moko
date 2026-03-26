"""
Orchestration — the chain of command.

General  → coordinates multiple captains in parallel (eval branches, experiments)
Captain  → executes one plan with Blocks, makes strategic decisions
Lieutenant → executes one module in one git branch (generate → fix → review → merge)
"""
from .general import General
from .captain import Captain
from .lieutenant import Lieutenant
from .git import GitManager, GitError

__all__ = ["General", "Captain", "Lieutenant", "GitManager", "GitError"]
