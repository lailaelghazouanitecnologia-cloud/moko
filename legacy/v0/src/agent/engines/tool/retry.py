"""
RetryEngine — retry logic for LLM calls and other fallible operations.

Currently no retry logic exists; LLM failures kill blocks.
This provides configurable retry with exponential backoff.
"""
from __future__ import annotations

import time
from typing import Any, Callable


class RetryEngine:
    """Configurable retry with exponential backoff."""

    def __init__(self, max_retries: int = 3, backoff: float = 1.5,
                 initial_delay: float = 1.0):
        self.max_retries = max_retries
        self.backoff = backoff
        self.initial_delay = initial_delay

    def execute(self, fn: Callable, *args, **kwargs) -> Any:
        """Execute fn with retry on failure.

        Args:
            fn: The function to execute
            *args, **kwargs: Arguments to pass to fn

        Returns:
            The result of fn(*args, **kwargs)

        Raises:
            The last exception if all retries fail
        """
        last_error = None
        delay = self.initial_delay

        for attempt in range(self.max_retries + 1):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                last_error = e
                if attempt < self.max_retries:
                    time.sleep(delay)
                    delay *= self.backoff

        raise last_error
