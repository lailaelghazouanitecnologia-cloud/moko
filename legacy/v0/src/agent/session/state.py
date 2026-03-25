"""
Session Version Control — snapshots, branches, rollback.

Inspired by git's branching model. Each conversation session can:
- Take snapshots at any point (like commits)
- Create branches to explore alternative analysis paths
- Rollback to previous snapshots
- Switch between branches

All state is in-memory by default. Use export() to persist.
"""

import copy
import json
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class Turn:
    """One user-agent exchange."""
    id: str
    timestamp: float
    query: str
    response: str
    task_type: str
    agents_used: list[str]
    prompt_ids: list[str] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)
    token_usage: dict = field(default_factory=dict)


@dataclass
class Snapshot:
    """A complete snapshot of session state at a point in time."""
    id: str
    label: str
    timestamp: float
    parent_snapshot_id: Optional[str]
    turns: list[Turn]
    branch: str


@dataclass
class Branch:
    """A conversation branch."""
    name: str
    head_snapshot_id: Optional[str]
    created_at: float
    parent_branch: Optional[str]
    fork_point_snapshot_id: Optional[str]


def _short_id() -> str:
    return uuid.uuid4().hex[:8]


class SessionState:
    """Session version control with snapshots and branches."""

    def __init__(self):
        self.session_id: str = _short_id()
        self.turns: list[Turn] = []
        self.snapshots: dict[str, Snapshot] = {}
        self.branches: dict[str, Branch] = {
            "main": Branch(
                name="main",
                head_snapshot_id=None,
                created_at=time.time(),
                parent_branch=None,
                fork_point_snapshot_id=None,
            )
        }
        self.current_branch: str = "main"

    def record_turn(self, query: str, response: str, task_type: str,
                    agents_used: list[str], prompt_ids: list[str] = None,
                    sources: list[str] = None, token_usage: dict = None):
        """Record a completed turn in the session."""
        turn = Turn(
            id=_short_id(),
            timestamp=time.time(),
            query=query,
            response=response,
            task_type=task_type,
            agents_used=agents_used,
            prompt_ids=prompt_ids or [],
            sources=sources or [],
            token_usage=token_usage or {},
        )
        self.turns.append(turn)
        return turn

    def snapshot(self, label: str = "auto") -> str:
        """Take a snapshot of current state. Returns snapshot ID."""
        snap_id = _short_id()
        current_branch = self.branches[self.current_branch]

        snap = Snapshot(
            id=snap_id,
            label=label,
            timestamp=time.time(),
            parent_snapshot_id=current_branch.head_snapshot_id,
            turns=copy.deepcopy(self.turns),
            branch=self.current_branch,
        )
        self.snapshots[snap_id] = snap
        current_branch.head_snapshot_id = snap_id
        return snap_id

    def branch(self, name: str, from_snapshot_id: str = None) -> str:
        """Create a new branch from a snapshot (or current state)."""
        if name in self.branches:
            raise ValueError(f"Branch '{name}' already exists")

        if from_snapshot_id and from_snapshot_id in self.snapshots:
            snap = self.snapshots[from_snapshot_id]
            self.turns = copy.deepcopy(snap.turns)
            fork_point = from_snapshot_id
        else:
            fork_point = self.branches[self.current_branch].head_snapshot_id

        self.branches[name] = Branch(
            name=name,
            head_snapshot_id=fork_point,
            created_at=time.time(),
            parent_branch=self.current_branch,
            fork_point_snapshot_id=fork_point,
        )
        self.current_branch = name
        return name

    def rollback(self, snapshot_id: str):
        """Restore session state to a previous snapshot."""
        if snapshot_id not in self.snapshots:
            raise ValueError(f"Snapshot '{snapshot_id}' not found")
        snap = self.snapshots[snapshot_id]
        self.turns = copy.deepcopy(snap.turns)
        self.branches[self.current_branch].head_snapshot_id = snapshot_id

    def switch_branch(self, name: str):
        """Switch to an existing branch, restoring its state."""
        if name not in self.branches:
            raise ValueError(f"Branch '{name}' not found")
        branch = self.branches[name]
        if branch.head_snapshot_id and branch.head_snapshot_id in self.snapshots:
            snap = self.snapshots[branch.head_snapshot_id]
            self.turns = copy.deepcopy(snap.turns)
        else:
            self.turns = []
        self.current_branch = name

    def list_branches(self) -> list[dict]:
        """Return branch info for display."""
        result = []
        for b in self.branches.values():
            turn_count = 0
            if b.head_snapshot_id and b.head_snapshot_id in self.snapshots:
                turn_count = len(self.snapshots[b.head_snapshot_id].turns)
            result.append({
                "name": b.name,
                "turns": turn_count,
                "is_current": b.name == self.current_branch,
                "parent": b.parent_branch,
            })
        return result

    def list_snapshots(self, branch: str = None) -> list[dict]:
        """List snapshots, optionally filtered by branch."""
        result = []
        for snap in sorted(self.snapshots.values(), key=lambda s: s.timestamp):
            if branch and snap.branch != branch:
                continue
            result.append({
                "id": snap.id,
                "label": snap.label,
                "branch": snap.branch,
                "turns": len(snap.turns),
                "parent": snap.parent_snapshot_id,
            })
        return result

    def export(self) -> dict:
        """Serialize session state for persistence."""
        return {
            "session_id": self.session_id,
            "current_branch": self.current_branch,
            "turns": [
                {
                    "id": t.id, "timestamp": t.timestamp, "query": t.query,
                    "response": t.response[:500],  # truncate for storage
                    "task_type": t.task_type, "agents_used": t.agents_used,
                    "prompt_ids": t.prompt_ids, "sources": t.sources,
                    "token_usage": t.token_usage,
                }
                for t in self.turns
            ],
            "snapshots": {
                k: {
                    "id": v.id, "label": v.label, "timestamp": v.timestamp,
                    "parent": v.parent_snapshot_id, "branch": v.branch,
                    "turn_count": len(v.turns),
                }
                for k, v in self.snapshots.items()
            },
            "branches": {
                k: {
                    "name": v.name, "head": v.head_snapshot_id,
                    "parent": v.parent_branch,
                }
                for k, v in self.branches.items()
            },
        }

    def save(self, path: Path):
        """Persist session to a JSON file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.export(), indent=2))
