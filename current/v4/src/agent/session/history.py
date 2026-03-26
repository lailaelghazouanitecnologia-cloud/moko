"""
Conversation History — manages the message list sent to the LLM.

Handles context window management: when conversation grows too long,
oldest messages are trimmed while keeping the system prompt and recent context.
Inspired by Cline's ContextManager truncation strategy.
"""

from ..llm.providers import LLMMessage


class ConversationHistory:
    """Manages LLM message list with context window budgeting."""

    def __init__(self, max_messages: int = 20, max_chars: int = 120000):
        self.messages: list[LLMMessage] = []
        self.max_messages = max_messages
        self.max_chars = max_chars  # ~30K tokens at 4 chars/token

    def add(self, role: str, content: str):
        """Add a message and trim if over budget."""
        self.messages.append(LLMMessage(role, content))
        self._trim()

    def get_messages(self, system_prompt: str = None) -> list[LLMMessage]:
        """Get messages ready for LLM, with optional system prompt prepended."""
        msgs = []
        if system_prompt:
            msgs.append(LLMMessage("system", system_prompt))
        msgs.extend(self.messages)
        return msgs

    def clear(self):
        """Clear all messages."""
        self.messages.clear()

    def _trim(self):
        """Keep messages within budget. Always keep last N, drop oldest."""
        # Trim by count
        while len(self.messages) > self.max_messages:
            self.messages.pop(0)

        # Trim by total character count
        total_chars = sum(len(m.content) for m in self.messages)
        while total_chars > self.max_chars and len(self.messages) > 2:
            removed = self.messages.pop(0)
            total_chars -= len(removed.content)

    @property
    def token_estimate(self) -> int:
        """Rough token estimate for current conversation."""
        return sum(len(m.content) for m in self.messages) // 4
