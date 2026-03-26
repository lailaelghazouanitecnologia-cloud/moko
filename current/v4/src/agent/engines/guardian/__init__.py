"""
Guardian engine — rule-based approval system for agent actions.

Simplified from Codex's sub-agent guardian. Uses rules instead of LLM:
  - write_file in src/ → auto-approve
  - delete_file → ask user
  - modify public interface → ask user
  - run_tsc → auto-approve
  - >5 files in 1 turn → ask user
"""
from .policy import ApprovalPolicy, ActionType, Decision
from .reviewer import GuardianReviewer

__all__ = ["ApprovalPolicy", "ActionType", "Decision", "GuardianReviewer"]
