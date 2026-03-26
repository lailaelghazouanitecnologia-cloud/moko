"""
AgentControl — manages spawning, waiting, and communicating with sub-agents.
"""
from __future__ import annotations

import time
import uuid
from concurrent.futures import ThreadPoolExecutor, Future
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Dict, List, Optional


class AgentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMED_OUT = "timed_out"


@dataclass
class AgentHandle:
    """Handle to a running agent."""
    agent_id: str
    role: str
    status: AgentStatus = AgentStatus.PENDING
    future: Optional[Future] = None
    result: Optional[object] = None
    started_at: float = 0.0
    completed_at: float = 0.0
    input_queue: List[str] = field(default_factory=list)

    def __post_init__(self):
        if self.started_at == 0:
            self.started_at = time.time()


class AgentControl:
    """Manage sub-agents: spawn, wait, send_input.

    Usage:
        control = AgentControl(max_parallel=3, max_depth=2)
        agent_id = control.spawn("code_generator", task_fn, args)
        results = control.wait([agent_id], timeout_s=300)
    """

    def __init__(self, max_parallel: int = 3, max_depth: int = 2,
                 verbose: bool = False):
        self.max_parallel = max_parallel
        self.max_depth = max_depth
        self.verbose = verbose
        self._agents: Dict[str, AgentHandle] = {}
        self._executor = ThreadPoolExecutor(max_workers=max_parallel)
        self._depth = 0

    def spawn(self, role: str, task_fn: Callable, *args,
              **kwargs) -> str:
        """Spawn a sub-agent. Returns agent_id.

        Args:
            role: Agent role name (e.g., "code_generator", "quality_reviewer")
            task_fn: Function to execute (receives *args, **kwargs)
        """
        if self._depth >= self.max_depth:
            raise RuntimeError(
                f"Agent depth limit reached ({self.max_depth}). "
                "Solve the task yourself."
            )

        active = sum(1 for a in self._agents.values()
                     if a.status == AgentStatus.RUNNING)
        if active >= self.max_parallel:
            raise RuntimeError(
                f"Max parallel agents reached ({self.max_parallel}). "
                "Wait for existing agents to complete."
            )

        agent_id = f"agent_{uuid.uuid4().hex[:8]}"
        handle = AgentHandle(agent_id=agent_id, role=role)

        def _run():
            handle.status = AgentStatus.RUNNING
            if self.verbose:
                print(f"  [agent] spawned {role} ({agent_id})")
            try:
                result = task_fn(*args, **kwargs)
                handle.result = result
                handle.status = AgentStatus.COMPLETED
                handle.completed_at = time.time()
                if self.verbose:
                    elapsed = handle.completed_at - handle.started_at
                    print(f"  [agent] {role} ({agent_id}) completed in {elapsed:.1f}s")
                return result
            except Exception as e:
                handle.status = AgentStatus.FAILED
                handle.result = str(e)
                handle.completed_at = time.time()
                if self.verbose:
                    print(f"  [agent] {role} ({agent_id}) failed: {e}")
                raise

        handle.future = self._executor.submit(_run)
        self._agents[agent_id] = handle
        return agent_id

    def wait(self, agent_ids: List[str],
             timeout_s: float = 300) -> Dict[str, AgentHandle]:
        """Wait for agents to complete. Returns dict of agent_id → handle."""
        results = {}
        for agent_id in agent_ids:
            handle = self._agents.get(agent_id)
            if not handle:
                continue
            if handle.future:
                try:
                    handle.future.result(timeout=timeout_s)
                except Exception:
                    if handle.status == AgentStatus.RUNNING:
                        handle.status = AgentStatus.TIMED_OUT
            results[agent_id] = handle
        return results

    def wait_all(self, timeout_s: float = 300) -> Dict[str, AgentHandle]:
        """Wait for all running agents."""
        running = [aid for aid, h in self._agents.items()
                   if h.status == AgentStatus.RUNNING]
        return self.wait(running, timeout_s)

    def send_input(self, agent_id: str, message: str):
        """Queue input for an agent."""
        handle = self._agents.get(agent_id)
        if handle:
            handle.input_queue.append(message)

    def get_status(self, agent_id: str) -> Optional[AgentStatus]:
        handle = self._agents.get(agent_id)
        return handle.status if handle else None

    def get_result(self, agent_id: str) -> Optional[object]:
        handle = self._agents.get(agent_id)
        return handle.result if handle else None

    @property
    def active_count(self) -> int:
        return sum(1 for a in self._agents.values()
                   if a.status == AgentStatus.RUNNING)

    @property
    def all_handles(self) -> Dict[str, AgentHandle]:
        return dict(self._agents)

    def shutdown(self):
        self._executor.shutdown(wait=False)
