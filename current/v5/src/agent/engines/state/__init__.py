"""
State engine — dual persistence model inspired by Codex.

SessionState persists across turns (history, config, permissions).
TurnState is ephemeral per turn (token tracking, pending actions, input queue).
StateManager coordinates both.
"""
from .session import SessionState
from .turn import TurnState, TurnResult
from .manager import StateManager

__all__ = ["SessionState", "TurnState", "TurnResult", "StateManager"]
