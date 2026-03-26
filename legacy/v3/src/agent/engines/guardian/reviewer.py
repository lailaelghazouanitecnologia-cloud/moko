"""
GuardianReviewer — reviews actions and applies policy decisions.
"""
from __future__ import annotations

from typing import List, Optional

from .policy import ApprovalPolicy, ActionType, Decision
from ..state.turn import TurnState


class GuardianReviewer:
    """Reviews agent actions against policy.

    Usage:
        reviewer = GuardianReviewer()
        decision = reviewer.review("write_file", path="src/cpu/cpu.ts")
        if decision == Decision.APPROVE:
            # proceed
        elif decision == Decision.ASK_USER:
            # prompt user
    """

    def __init__(self, policy: Optional[ApprovalPolicy] = None,
                 verbose: bool = False):
        self.policy = policy or ApprovalPolicy.default()
        self.verbose = verbose
        self._decisions: List[dict] = []

    def review(self, action_type: str, turn_state: Optional[TurnState] = None,
               **context) -> Decision:
        """Review an action and return decision."""
        try:
            at = ActionType(action_type)
        except ValueError:
            at = ActionType.RUN_COMMAND  # Default to ask for unknown actions

        # Check turn-level context
        if turn_state:
            context["files_count"] = len(turn_state.files_written)

        decision = self.policy.check(at, **context)

        # Log decision
        self._decisions.append({
            "action": action_type,
            "decision": decision.value,
            "context": {k: str(v)[:100] for k, v in context.items()},
        })

        if self.verbose and decision != Decision.APPROVE:
            print(f"  [guardian] {action_type}: {decision.value}")

        return decision

    def auto_approve(self, action_type: str, **context) -> bool:
        """Convenience: returns True if action is auto-approved."""
        return self.review(action_type, **context) == Decision.APPROVE

    @property
    def stats(self) -> dict:
        approved = sum(1 for d in self._decisions if d["decision"] == "approve")
        denied = sum(1 for d in self._decisions if d["decision"] == "deny")
        asked = sum(1 for d in self._decisions if d["decision"] == "ask_user")
        return {"total": len(self._decisions), "approved": approved,
                "denied": denied, "asked": asked}
