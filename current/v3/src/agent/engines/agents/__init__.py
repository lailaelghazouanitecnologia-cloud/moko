"""
Multi-agent engine — spawn, wait, and communicate between sub-agents.

Inspired by Codex's multi_agents handlers. Enables:
  - Parallel module generation (spawn 1 agent per Level-0 module)
  - Quality review agent (post-generation analysis)
  - Fix specialist (when fix_engine stalls)
  - Experiment variants (spawn 2 agents with different approaches)
"""
from .control import AgentControl, AgentStatus
from .worker import AgentWorker, AgentConfig, AgentResult
from .roles import get_role_config, ROLES

__all__ = [
    "AgentControl", "AgentStatus",
    "AgentWorker", "AgentConfig", "AgentResult",
    "get_role_config", "ROLES",
]
