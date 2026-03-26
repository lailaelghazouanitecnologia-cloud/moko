"""
StateManager — coordinates SessionState and TurnState lifecycle.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from .session import SessionState
from .turn import TurnState, TurnResult


class StateManager:
    """Manages session and turn state lifecycle.

    Usage:
        mgr = StateManager(project_dir)
        mgr.init_session(goal="Build chip8", target="chip8", modules=["memory","cpu"])

        turn = mgr.begin_turn("memory")
        # ... generate module ...
        result = turn.to_result("memory", success=True, loc=70)
        mgr.end_turn(result)

        mgr.save()
    """

    def __init__(self, project_dir: Path):
        self.project_dir = project_dir
        self.session: Optional[SessionState] = None
        self.current_turn: Optional[TurnState] = None

    def init_session(self, goal: str, target: str,
                     modules: list = None, **kwargs) -> SessionState:
        """Initialize a new session or load existing."""
        existing = SessionState.load(self.project_dir)
        if existing and not existing.is_complete:
            self.session = existing
            return existing

        self.session = SessionState(
            goal=goal,
            target=target,
            module_order=modules or [],
            **kwargs,
        )
        self.session.save(self.project_dir)
        return self.session

    def resume_session(self) -> Optional[SessionState]:
        """Resume an existing session."""
        self.session = SessionState.load(self.project_dir)
        return self.session

    def begin_turn(self, module: str) -> TurnState:
        """Start a new turn for a module."""
        if not self.session:
            raise RuntimeError("No active session")

        self.session.turn_count += 1
        self.session.current_module = module
        self.session.add_history("module_start", module=module)

        self.current_turn = TurnState(
            turn_id=self.session.turn_count,
            module=module,
            tokens_at_start=self.session.total_tokens,
        )
        return self.current_turn

    def end_turn(self, result: TurnResult):
        """End the current turn and update session state."""
        if not self.session or not self.current_turn:
            return

        self.session.total_tokens += result.tokens_used
        self.session.total_loc += result.loc

        if result.success:
            self.session.modules_completed.append(result.module)
            self.session.add_history(
                "module_done", module=result.module,
                detail=f"{result.loc} LOC, {result.tsc_errors} errors",
                tokens=result.tokens_used,
            )
        else:
            self.session.modules_failed.append(result.module)
            self.session.add_history(
                "module_failed", module=result.module,
                detail="; ".join(result.errors[:3]),
                tokens=result.tokens_used,
            )

        self.session.current_module = ""
        self.current_turn = None
        self.session.save(self.project_dir)

    def save(self):
        if self.session:
            self.session.save(self.project_dir)

    @property
    def can_continue(self) -> bool:
        """Check if session can continue (budget not exceeded, modules pending)."""
        if not self.session:
            return False
        if self.session.is_complete:
            return False
        if self.session.token_utilization > 0.95:
            return False
        return True
