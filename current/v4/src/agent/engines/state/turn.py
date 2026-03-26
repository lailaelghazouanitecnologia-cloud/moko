"""
TurnState — ephemeral state scoped to one turn (module generation cycle).

Created when a turn starts, destroyed when it ends. Tracks:
- Token usage within this turn (delta from session)
- Pending actions awaiting approval
- Input queue from user mid-turn
- Tool calls made this turn
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class PendingAction:
    """An action awaiting approval."""
    action_id: str
    action_type: str          # "write_file", "delete_file", "modify_interface", etc.
    description: str
    approved: Optional[bool] = None
    timestamp: float = 0.0

    def __post_init__(self):
        if self.timestamp == 0:
            self.timestamp = time.time()


@dataclass
class TurnResult:
    """Result of one turn (module generation)."""
    module: str
    success: bool
    loc: int = 0
    tsc_errors: int = 0
    tokens_used: int = 0
    fix_rounds: int = 0
    quality_score: float = 0.0
    files_written: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    duration_s: float = 0.0


@dataclass
class TurnState:
    """Ephemeral state for one turn. Created fresh, not persisted."""

    # Identity
    turn_id: int = 0
    module: str = ""
    started_at: float = 0.0

    # Token tracking
    tokens_at_start: int = 0      # session total when this turn began
    tokens_this_turn: int = 0     # accumulated within this turn

    # Tool calls
    tool_calls: int = 0
    tool_calls_max: int = 50      # guardrail

    # Pending approvals
    pending_actions: List[PendingAction] = field(default_factory=list)
    auto_approved: int = 0
    user_approved: int = 0
    denied: int = 0

    # Input queue (user sends messages during generation)
    input_queue: List[str] = field(default_factory=list)

    # Files modified this turn
    files_written: List[str] = field(default_factory=list)
    files_deleted: List[str] = field(default_factory=list)

    def __post_init__(self):
        if self.started_at == 0:
            self.started_at = time.time()

    @property
    def elapsed(self) -> float:
        return time.time() - self.started_at

    @property
    def tokens_remaining(self) -> int:
        """Estimate tokens remaining in the turn budget."""
        return max(0, 50_000 - self.tokens_this_turn)

    def add_tokens(self, count: int):
        self.tokens_this_turn += count

    def add_tool_call(self):
        self.tool_calls += 1
        if self.tool_calls > self.tool_calls_max:
            raise RuntimeError(f"Turn tool call limit exceeded ({self.tool_calls_max})")

    def queue_input(self, message: str):
        """Queue user input for processing at next boundary."""
        self.input_queue.append(message)

    def take_input(self) -> List[str]:
        """Take all queued input and clear the queue."""
        messages = list(self.input_queue)
        self.input_queue.clear()
        return messages

    def request_approval(self, action_type: str, description: str) -> PendingAction:
        """Create a pending approval request."""
        import uuid
        action = PendingAction(
            action_id=uuid.uuid4().hex[:8],
            action_type=action_type,
            description=description,
        )
        self.pending_actions.append(action)
        return action

    def approve(self, action_id: str, by_user: bool = False):
        for action in self.pending_actions:
            if action.action_id == action_id:
                action.approved = True
                if by_user:
                    self.user_approved += 1
                else:
                    self.auto_approved += 1
                return

    def deny(self, action_id: str):
        for action in self.pending_actions:
            if action.action_id == action_id:
                action.approved = False
                self.denied += 1
                return

    def to_result(self, module: str, success: bool, **kwargs) -> TurnResult:
        """Convert turn state to a result."""
        return TurnResult(
            module=module,
            success=success,
            tokens_used=self.tokens_this_turn,
            files_written=list(self.files_written),
            duration_s=self.elapsed,
            **kwargs,
        )
