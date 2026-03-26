"""
SessionState — persistent state across turns within a generation run.

Tracks: goal, modules completed, total tokens, history of decisions,
configuration, and learned context. Survives turn boundaries and compaction.
"""
from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class HistoryEntry:
    """One significant event in the session history."""
    turn: int
    timestamp: float
    kind: str               # "module_start", "module_done", "fix", "quality", "decision"
    module: str = ""
    detail: str = ""
    tokens: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SessionState:
    """Persistent state for a generation session.

    Created at session start. Mutated across turns. Persisted to disk.
    Survives /resume and compaction.
    """
    # Identity
    session_id: str = ""
    goal: str = ""
    target: str = ""
    started_at: float = 0.0

    # Configuration
    provider: str = "groq"
    model: str = ""
    language: str = "typescript"

    # Module tracking
    module_order: List[str] = field(default_factory=list)
    modules_completed: List[str] = field(default_factory=list)
    modules_failed: List[str] = field(default_factory=list)
    current_module: str = ""

    # Token accounting
    total_tokens: int = 0
    total_loc: int = 0
    token_budget: int = 500_000

    # History (capped at last 100 entries)
    history: List[HistoryEntry] = field(default_factory=list)

    # Learned context (from GoalReasoner, etc.)
    functional_spec: str = ""
    project_rules: str = ""
    invariants: List[str] = field(default_factory=list)

    # Knowledge injection (from memories engine)
    injected_memories: List[str] = field(default_factory=list)

    # Block tracking (serialized block summaries per module)
    blocks: List[Dict[str, Any]] = field(default_factory=list)

    # Turn counter
    turn_count: int = 0

    def __post_init__(self):
        if not self.session_id:
            self.session_id = uuid.uuid4().hex[:12]
        if self.started_at == 0:
            self.started_at = time.time()

    @property
    def pending_modules(self) -> List[str]:
        done = set(self.modules_completed) | set(self.modules_failed)
        return [m for m in self.module_order if m not in done]

    @property
    def is_complete(self) -> bool:
        return len(self.pending_modules) == 0

    @property
    def progress(self) -> str:
        done = len(self.modules_completed)
        total = len(self.module_order)
        return f"{done}/{total}"

    @property
    def token_utilization(self) -> float:
        return self.total_tokens / max(self.token_budget, 1)

    def add_history(self, kind: str, module: str = "", detail: str = "",
                    tokens: int = 0, **metadata):
        """Add a history entry. Caps at 100 entries (drops oldest)."""
        entry = HistoryEntry(
            turn=self.turn_count,
            timestamp=time.time(),
            kind=kind,
            module=module,
            detail=detail,
            tokens=tokens,
            metadata=metadata,
        )
        self.history.append(entry)
        if len(self.history) > 100:
            self.history = self.history[-100:]

    def record_blocks(self, module_blocks: list):
        """Record completed blocks from a module run."""
        for b in module_blocks:
            self.blocks.append({
                "index": b.index,
                "type": b.block_type.value,
                "objective": b.objective,
                "status": b.status.value,
                "branch": b.branch_name,
                "files_changed": b.files_changed or [],
                "tokens_used": b.tokens_used,
                "output": (b.output or "")[:200],
                "hash": b.hash or "",
            })

    def history_summary(self, max_entries: int = 20) -> str:
        """Compact summary of recent history for context injection."""
        recent = self.history[-max_entries:]
        lines = []
        for h in recent:
            mod = f"[{h.module}] " if h.module else ""
            lines.append(f"  T{h.turn} {mod}{h.kind}: {h.detail}")
        return "\n".join(lines)

    # ── Persistence ──────────────────────────────────────

    def save(self, project_dir: Path):
        path = project_dir / ".session_state.json"
        data = {
            "session_id": self.session_id,
            "goal": self.goal,
            "target": self.target,
            "started_at": self.started_at,
            "provider": self.provider,
            "model": self.model,
            "module_order": self.module_order,
            "modules_completed": self.modules_completed,
            "modules_failed": self.modules_failed,
            "current_module": self.current_module,
            "total_tokens": self.total_tokens,
            "total_loc": self.total_loc,
            "token_budget": self.token_budget,
            "turn_count": self.turn_count,
            "functional_spec": self.functional_spec,
            "invariants": self.invariants,
            "injected_memories": self.injected_memories,
            "history": [asdict(h) for h in self.history[-50:]],  # Save last 50
            "blocks": self.blocks[-200:],  # Save last 200 blocks
        }
        path.write_text(json.dumps(data, indent=2))

    @classmethod
    def load(cls, project_dir: Path) -> Optional["SessionState"]:
        path = project_dir / ".session_state.json"
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text())
            state = cls(
                session_id=data.get("session_id", ""),
                goal=data.get("goal", ""),
                target=data.get("target", ""),
                started_at=data.get("started_at", 0),
                provider=data.get("provider", "groq"),
                model=data.get("model", ""),
                module_order=data.get("module_order", []),
                modules_completed=data.get("modules_completed", []),
                modules_failed=data.get("modules_failed", []),
                current_module=data.get("current_module", ""),
                total_tokens=data.get("total_tokens", 0),
                total_loc=data.get("total_loc", 0),
                token_budget=data.get("token_budget", 500_000),
                turn_count=data.get("turn_count", 0),
                functional_spec=data.get("functional_spec", ""),
                invariants=data.get("invariants", []),
                injected_memories=data.get("injected_memories", []),
                blocks=data.get("blocks", []),
            )
            for h_data in data.get("history", []):
                state.history.append(HistoryEntry(**h_data))
            return state
        except Exception:
            return None
