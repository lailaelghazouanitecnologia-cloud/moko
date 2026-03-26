"""
Workspace engine — forces depth over breadth.

One workspace active at a time. Each workspace has constraints, status,
and improvement proposals. The agent generates something that works first,
then proposes data-driven improvements for the user to approve.
"""
from .manager import WorkspaceManager, Workspace, WorkspaceStatus
from .proposals import ProposalGenerator, Proposal

__all__ = [
    "WorkspaceManager", "Workspace", "WorkspaceStatus",
    "ProposalGenerator", "Proposal",
]
