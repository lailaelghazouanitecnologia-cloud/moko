"""
KnowledgeInjector — injects relevant memories into prompts before generation.
"""
from __future__ import annotations

from typing import List, Optional

from .store import KnowledgeStore, Memory


class KnowledgeInjector:
    """Inject cross-session learnings into generation prompts."""

    def __init__(self, store: Optional[KnowledgeStore] = None):
        self.store = store or KnowledgeStore()

    def get_relevant_context(self, goal: str, domain: str = "",
                             max_tokens: int = 2000) -> str:
        """Get relevant memories formatted for prompt injection."""
        # Search by domain
        memories = self.store.search(domain=domain, limit=5)

        # Also search by keywords in goal
        if not memories:
            goal_lower = goal.lower()
            for keyword in ["emulator", "game", "api", "cli", "agent"]:
                if keyword in goal_lower:
                    memories = self.store.search(domain=keyword, limit=3)
                    if memories:
                        break

        if not memories:
            return ""

        return self.store.format_for_injection(memories, max_tokens=max_tokens)

    def inject_into_session(self, session_state, goal: str, domain: str = ""):
        """Inject memories into session state for use during generation."""
        context = self.get_relevant_context(goal, domain)
        if context:
            session_state.injected_memories = [context]
