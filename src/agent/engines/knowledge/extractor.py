"""
MemoryExtractor — extracts learnings from a completed generation run.

Zero LLM tokens. Analyzes pipeline metrics, quality data, and run history
to produce structured memories about what worked and what didn't.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from ..state.session import SessionState


@dataclass
class Memory:
    """One learning from a generation run."""
    id: str = ""
    project: str = ""
    domain: str = ""                    # from GoalReasoner
    timestamp: float = 0.0

    # What happened
    learnings: List[str] = field(default_factory=list)

    # Metrics
    total_loc: int = 0
    total_tokens: int = 0
    tsc_errors: int = 0
    quality_score: float = 0.0
    modules_succeeded: int = 0
    modules_failed: int = 0

    # What approach worked
    approach_won: str = ""
    approach_lost: str = ""

    # Key decisions
    used_depth_loop: bool = False
    used_goal_reasoner: bool = False
    used_references: bool = False

    def __post_init__(self):
        if not self.id:
            import uuid
            self.id = f"mem_{uuid.uuid4().hex[:8]}"
        if self.timestamp == 0:
            self.timestamp = time.time()

    def to_dict(self) -> dict:
        from dataclasses import asdict
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Memory":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


class MemoryExtractor:
    """Extract memories from a completed session. Zero LLM tokens."""

    def extract(self, session: SessionState, project_dir=None) -> Memory:
        """Analyze a completed session and produce a Memory."""
        mem = Memory(
            project=session.target,
            total_loc=session.total_loc,
            total_tokens=session.total_tokens,
            modules_succeeded=len(session.modules_completed),
            modules_failed=len(session.modules_failed),
        )

        # Extract domain from functional spec
        if session.functional_spec:
            if "emulator" in session.functional_spec.lower():
                mem.domain = "emulator"
            elif "game" in session.functional_spec.lower():
                mem.domain = "game"
            elif "api" in session.functional_spec.lower():
                mem.domain = "api"
            elif "cli" in session.functional_spec.lower():
                mem.domain = "cli"

        # Extract learnings from history
        mem.learnings = self._extract_learnings(session)

        # Track what tools were used
        mem.used_goal_reasoner = bool(session.functional_spec)

        for h in session.history:
            if "depth" in h.detail.lower():
                mem.used_depth_loop = True

        # Calculate efficiency
        if session.total_loc > 0 and session.total_tokens > 0:
            tokens_per_loc = session.total_tokens / session.total_loc
            if tokens_per_loc < 80:
                mem.learnings.append(f"Efficient generation: {tokens_per_loc:.0f} tokens/LOC")
            elif tokens_per_loc > 200:
                mem.learnings.append(f"Expensive generation: {tokens_per_loc:.0f} tokens/LOC — consider richer blueprints")

        # Track failures
        if session.modules_failed:
            mem.learnings.append(
                f"Failed modules: {', '.join(session.modules_failed)} — "
                "investigate interface mismatches"
            )

        return mem

    def _extract_learnings(self, session: SessionState) -> List[str]:
        """Extract learnings from session history."""
        learnings = []

        # Count fix rounds
        fix_events = [h for h in session.history if h.kind == "fix"]
        if fix_events:
            avg_fixes = sum(1 for _ in fix_events) / max(len(session.modules_completed), 1)
            if avg_fixes > 3:
                learnings.append(f"High fix rate ({avg_fixes:.1f}/module) — blueprints may need more detail")
            elif avg_fixes < 1:
                learnings.append("Low fix rate — blueprints were well-specified")

        # Track quality improvements
        quality_events = [h for h in session.history if h.kind == "quality"]
        if quality_events:
            learnings.append(f"Quality engine ran {len(quality_events)} times")

        # Module-specific learnings from detail field
        for h in session.history:
            if h.kind == "module_done" and h.detail:
                # Extract LOC from detail
                if "LOC" in h.detail and "0 errors" in h.detail:
                    learnings.append(f"{h.module}: clean generation ({h.detail})")

        # Token efficiency per module
        module_tokens = {}
        for h in session.history:
            if h.kind in ("module_done", "module_failed") and h.tokens > 0:
                module_tokens[h.module] = h.tokens
        if module_tokens:
            most_expensive = max(module_tokens, key=module_tokens.get)
            learnings.append(f"Most expensive module: {most_expensive} ({module_tokens[most_expensive]:,} tokens)")

        return learnings
