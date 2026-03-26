"""
ApprovalPolicy — defines which actions need approval.
"""
from __future__ import annotations

from enum import Enum
from dataclasses import dataclass
from typing import Dict, Optional


class ActionType(str, Enum):
    WRITE_FILE = "write_file"
    DELETE_FILE = "delete_file"
    MODIFY_INTERFACE = "modify_interface"
    RUN_TSC = "run_tsc"
    RUN_COMMAND = "run_command"
    MODIFY_CONFIG = "modify_config"
    BULK_WRITE = "bulk_write"       # >5 files at once


class Decision(str, Enum):
    APPROVE = "approve"
    DENY = "deny"
    ASK_USER = "ask_user"


# Default policy: what needs approval
DEFAULT_POLICY: Dict[ActionType, Decision] = {
    ActionType.WRITE_FILE: Decision.APPROVE,
    ActionType.DELETE_FILE: Decision.ASK_USER,
    ActionType.MODIFY_INTERFACE: Decision.ASK_USER,
    ActionType.RUN_TSC: Decision.APPROVE,
    ActionType.RUN_COMMAND: Decision.ASK_USER,
    ActionType.MODIFY_CONFIG: Decision.ASK_USER,
    ActionType.BULK_WRITE: Decision.ASK_USER,
}


@dataclass
class ApprovalPolicy:
    """Configurable policy for action approval."""
    rules: Dict[ActionType, Decision]
    auto_approve_all: bool = False     # --yolo mode

    @classmethod
    def default(cls) -> "ApprovalPolicy":
        return cls(rules=dict(DEFAULT_POLICY))

    @classmethod
    def permissive(cls) -> "ApprovalPolicy":
        return cls(rules={a: Decision.APPROVE for a in ActionType}, auto_approve_all=True)

    def check(self, action_type: ActionType, **context) -> Decision:
        """Check if an action is approved."""
        if self.auto_approve_all:
            return Decision.APPROVE

        decision = self.rules.get(action_type, Decision.ASK_USER)

        # Dynamic rules based on context
        files_count = context.get("files_count", 1)
        if files_count > 5 and action_type == ActionType.WRITE_FILE:
            return Decision.ASK_USER

        return decision
