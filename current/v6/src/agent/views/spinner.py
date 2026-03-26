"""
spinner.py — Animated spinner for long-running operations.

Runs in a background thread. Shows a braille animation
with a status message. Automatically cleans up on stop.
"""
from __future__ import annotations

import sys
import threading
import time

from .theme import CYAN, DIM, RESET, COLORS_ENABLED, clear_line

_BRAILLE = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
_DOTS = "⣾⣽⣻⢿⡿⣟⣯⣷"


class Spinner:
    """Animated terminal spinner that runs in a background thread."""

    def __init__(self, message: str = "Thinking", frames: str = _BRAILLE):
        self.message = message
        self.frames = frames
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> "Spinner":
        if not COLORS_ENABLED or not sys.stderr.isatty():
            sys.stderr.write(f"  {self.message}...\n")
            return self
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        return self

    def _run(self):
        i = 0
        while not self._stop_event.is_set():
            frame = self.frames[i % len(self.frames)]
            sys.stderr.write(f"{clear_line()}  {CYAN}{frame}{RESET} {DIM}{self.message}...{RESET}")
            sys.stderr.flush()
            i += 1
            self._stop_event.wait(0.08)
        # Clear the spinner line
        sys.stderr.write(f"{clear_line()}")
        sys.stderr.flush()

    def update(self, message: str):
        """Update the spinner message while running."""
        self.message = message

    def stop(self):
        """Stop the spinner and clear the line."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=1)
            self._thread = None

    def __enter__(self) -> "Spinner":
        return self.start()

    def __exit__(self, *_):
        self.stop()
