"""
RunState — persistent state for resumable generation runs.

Saves after each module completion. Allows `ava dev --resume` to continue
from where it left off. Stores: goal, spec, completed modules, tokens used.

Inspired by Codex's SessionState and Cline's TaskState.
"""
from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class ModuleState:
    """State of one module in the run."""
    name: str
    status: str = "pending"       # pending | working | done | failed
    loc: int = 0
    tsc_errors: int = 0
    tokens_used: int = 0
    fix_rounds: int = 0
    started_at: float = 0.0
    completed_at: float = 0.0


@dataclass
class RunState:
    """Persistent state for a generation run.

    Saved to projects/{target}/.run_state.json after each module.
    """
    run_id: str = ""
    goal: str = ""
    target: str = ""
    started_at: float = 0.0
    provider: str = "groq"
    model: str = ""

    # Modules
    modules: Dict[str, ModuleState] = field(default_factory=dict)
    module_order: List[str] = field(default_factory=list)

    # Totals
    total_tokens: int = 0
    total_loc: int = 0

    # FunctionalSpec (serialized)
    functional_spec_json: Optional[str] = None

    # Settings
    max_iterations: int = 50
    use_branches: bool = True

    def __post_init__(self):
        if not self.run_id:
            self.run_id = uuid.uuid4().hex[:12]
        if self.started_at == 0:
            self.started_at = time.time()

    @property
    def completed_modules(self) -> List[str]:
        return [n for n, m in self.modules.items() if m.status == "done"]

    @property
    def pending_modules(self) -> List[str]:
        return [n for n in self.module_order if self.modules.get(n, ModuleState(n)).status == "pending"]

    @property
    def is_complete(self) -> bool:
        return len(self.pending_modules) == 0

    @property
    def progress(self) -> str:
        done = len(self.completed_modules)
        total = len(self.module_order)
        return f"{done}/{total} modules"

    def mark_started(self, module: str):
        if module not in self.modules:
            self.modules[module] = ModuleState(name=module)
        self.modules[module].status = "working"
        self.modules[module].started_at = time.time()

    def mark_done(self, module: str, loc: int = 0, tsc_errors: int = 0,
                  tokens: int = 0, fix_rounds: int = 0):
        if module not in self.modules:
            self.modules[module] = ModuleState(name=module)
        ms = self.modules[module]
        ms.status = "done"
        ms.loc = loc
        ms.tsc_errors = tsc_errors
        ms.tokens_used = tokens
        ms.fix_rounds = fix_rounds
        ms.completed_at = time.time()
        self.total_tokens += tokens
        self.total_loc += loc

    def mark_failed(self, module: str, tokens: int = 0):
        if module not in self.modules:
            self.modules[module] = ModuleState(name=module)
        self.modules[module].status = "failed"
        self.modules[module].tokens_used = tokens
        self.total_tokens += tokens

    # ── Persistence ──────────────────────────────────────

    def save(self, project_dir: Path):
        """Save state to .run_state.json."""
        path = project_dir / ".run_state.json"
        data = {
            "run_id": self.run_id,
            "goal": self.goal,
            "target": self.target,
            "started_at": self.started_at,
            "provider": self.provider,
            "model": self.model,
            "module_order": self.module_order,
            "modules": {n: asdict(m) for n, m in self.modules.items()},
            "total_tokens": self.total_tokens,
            "total_loc": self.total_loc,
            "functional_spec_json": self.functional_spec_json,
            "max_iterations": self.max_iterations,
            "use_branches": self.use_branches,
        }
        path.write_text(json.dumps(data, indent=2))

    @classmethod
    def load(cls, project_dir: Path) -> Optional["RunState"]:
        """Load state from .run_state.json. Returns None if not found."""
        path = project_dir / ".run_state.json"
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text())
            state = cls(
                run_id=data.get("run_id", ""),
                goal=data.get("goal", ""),
                target=data.get("target", ""),
                started_at=data.get("started_at", 0),
                provider=data.get("provider", "groq"),
                model=data.get("model", ""),
                module_order=data.get("module_order", []),
                total_tokens=data.get("total_tokens", 0),
                total_loc=data.get("total_loc", 0),
                functional_spec_json=data.get("functional_spec_json"),
                max_iterations=data.get("max_iterations", 50),
                use_branches=data.get("use_branches", True),
            )
            for name, ms_data in data.get("modules", {}).items():
                state.modules[name] = ModuleState(**ms_data)
            return state
        except Exception:
            return None

    def summary(self) -> str:
        """Human-readable summary."""
        elapsed = time.time() - self.started_at
        lines = [
            f"Run {self.run_id}: {self.goal}",
            f"  Target: {self.target} | {self.progress}",
            f"  Tokens: {self.total_tokens:,} | LOC: {self.total_loc}",
            f"  Elapsed: {elapsed:.0f}s",
        ]
        for name in self.module_order:
            ms = self.modules.get(name, ModuleState(name=name))
            status = ms.status.upper()
            detail = f"{ms.loc} LOC, {ms.tsc_errors} errors" if ms.status == "done" else ""
            lines.append(f"    {name:<20} [{status:<8}] {detail}")
        return "\n".join(lines)
