"""
WorkspaceManager — creates, activates, and closes workspaces.

A workspace = one module being worked on in depth. Only one active at a time.
Each workspace tracks: goal, constraints, status, baseline metrics, improvements.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore


class WorkspaceStatus(str, Enum):
    PLANNED = "planned"          # Not started yet
    WORKING = "working"          # Baseline generation in progress
    BASELINE = "baseline"        # Baseline done, awaiting improvement proposals
    IMPROVING = "improving"      # User accepted improvements, applying
    DONE = "done"                # All constraints met, workspace closed


@dataclass
class WorkspaceBaseline:
    """Metrics captured when baseline is reached."""
    compiles: bool = False
    tsc_errors: int = 0
    loc: int = 0
    method_count: int = 0
    density: float = 0.0
    quality_score: float = 0.0


@dataclass
class Workspace:
    """One module being worked on in depth."""
    name: str
    status: WorkspaceStatus = WorkspaceStatus.PLANNED
    goal: str = ""
    description: str = ""

    # Constraints
    max_files: int = 6
    depends_on: List[str] = field(default_factory=list)

    # Metrics
    baseline: Optional[WorkspaceBaseline] = None

    # Improvement tracking
    improvements_proposed: int = 0
    improvements_accepted: int = 0
    improvements_applied: int = 0

    def to_dict(self) -> dict:
        d = asdict(self)
        d["status"] = self.status.value
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "Workspace":
        d = dict(d)
        if "status" in d:
            d["status"] = WorkspaceStatus(d["status"])
        if "baseline" in d and isinstance(d["baseline"], dict):
            d["baseline"] = WorkspaceBaseline(**d["baseline"])
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})

    def set_baseline(self, compiles: bool, tsc_errors: int, loc: int,
                     method_count: int, density: float, quality: float):
        """Record baseline metrics and transition to BASELINE status."""
        self.baseline = WorkspaceBaseline(
            compiles=compiles, tsc_errors=tsc_errors, loc=loc,
            method_count=method_count, density=density, quality_score=quality,
        )
        self.status = WorkspaceStatus.BASELINE


class WorkspaceManager:
    """Manages workspaces for a project.

    Creates workspace.yaml files, tracks status, enforces "one active at a time".
    """

    def __init__(self, project_dir: Path, verbose: bool = False):
        self.project_dir = project_dir
        self.verbose = verbose
        self.workspaces: Dict[str, Workspace] = {}
        self._load()

    def _project_yaml(self) -> Path:
        return self.project_dir / "project.yaml"

    def _workspace_dir(self, name: str) -> Path:
        return self.project_dir / "workspaces" / name

    def _load(self):
        """Load workspace state from project.yaml."""
        path = self._project_yaml()
        if not path.exists():
            return
        try:
            if yaml:
                data = yaml.safe_load(path.read_text())
            else:
                data = json.loads(path.read_text())
            for ws_data in data.get("workspaces", []):
                ws = Workspace.from_dict(ws_data)
                self.workspaces[ws.name] = ws
        except Exception:
            pass

    def save(self):
        """Persist workspace state to project.yaml."""
        data = {
            "project": self.project_dir.name,
            "workspaces": [ws.to_dict() for ws in self.workspaces.values()],
        }
        self._project_yaml().parent.mkdir(parents=True, exist_ok=True)
        if yaml:
            self._project_yaml().write_text(
                yaml.dump(data, default_flow_style=False, allow_unicode=True)
            )
        else:
            self._project_yaml().write_text(json.dumps(data, indent=2))

    def create(self, name: str, goal: str = "", depends_on: List[str] = None,
               description: str = "") -> Workspace:
        """Create a new workspace."""
        ws = Workspace(
            name=name,
            goal=goal,
            description=description,
            depends_on=depends_on or [],
        )
        self.workspaces[name] = ws
        ws_dir = self._workspace_dir(name)
        ws_dir.mkdir(parents=True, exist_ok=True)
        self.save()

        if self.verbose:
            print(f"  [workspace] created: {name} ({goal[:60]})")
        return ws

    def activate(self, name: str) -> Optional[Workspace]:
        """Set a workspace as WORKING. Only one can be active."""
        ws = self.workspaces.get(name)
        if not ws:
            return None

        # Check deps are done
        for dep in ws.depends_on:
            dep_ws = self.workspaces.get(dep)
            if dep_ws and dep_ws.status != WorkspaceStatus.DONE:
                if self.verbose:
                    print(f"  [workspace] can't activate {name}: "
                          f"dependency {dep} is {dep_ws.status.value}")
                return None

        ws.status = WorkspaceStatus.WORKING
        self.save()
        return ws

    def active(self) -> Optional[Workspace]:
        """Get the currently active workspace, if any."""
        for ws in self.workspaces.values():
            if ws.status in (WorkspaceStatus.WORKING, WorkspaceStatus.BASELINE,
                             WorkspaceStatus.IMPROVING):
                return ws
        return None

    def close(self, name: str) -> Optional[Workspace]:
        """Mark workspace as DONE."""
        ws = self.workspaces.get(name)
        if not ws:
            return None
        ws.status = WorkspaceStatus.DONE
        self.save()
        if self.verbose:
            print(f"  [workspace] closed: {name}")
        return ws

    def next_planned(self) -> Optional[Workspace]:
        """Get the next planned workspace whose deps are all done."""
        for ws in self.workspaces.values():
            if ws.status != WorkspaceStatus.PLANNED:
                continue
            deps_met = all(
                self.workspaces.get(d, Workspace(name=d)).status == WorkspaceStatus.DONE
                for d in ws.depends_on
            )
            if deps_met:
                return ws
        return None

    def summary(self) -> str:
        """Human-readable status summary."""
        lines = []
        for ws in self.workspaces.values():
            status = ws.status.value.upper()
            baseline = ""
            if ws.baseline:
                baseline = (f" | {ws.baseline.loc} LOC, "
                           f"{ws.baseline.tsc_errors} errors, "
                           f"quality {ws.baseline.quality_score:.0%}")
            lines.append(f"  {ws.name:<25} [{status:<10}]{baseline}")
        return "\n".join(lines) if lines else "  (no workspaces)"
