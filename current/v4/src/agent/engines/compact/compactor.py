"""
ContextCompactor — compresses session history when approaching budget.

Preserves: first blueprint, latest code state, critical errors.
Summarizes: completed modules, resolved fixes, old quality reports.
"""
from __future__ import annotations

from typing import List, Optional

from ..state.session import SessionState, HistoryEntry


class ContextCompactor:
    """Compress session history to fit within token budget.

    Strategy (inspired by Codex/Cline):
    1. Always keep: first entry (initial context) + last 5 entries
    2. Summarize middle entries into compact one-liners
    3. Drop repeated patterns (multiple fix rounds → "N fix rounds")
    4. Preserve module_done and module_failed events
    """

    def __init__(self, max_history_entries: int = 50):
        self.max_entries = max_history_entries

    def should_compact(self, session: SessionState) -> bool:
        """Check if compaction is needed."""
        return (
            len(session.history) > self.max_entries
            or session.token_utilization > 0.8
        )

    def compact(self, session: SessionState) -> str:
        """Compact history and return summary of what was removed."""
        if not self.should_compact(session):
            return ""

        history = session.history
        if len(history) <= 10:
            return ""

        # Keep first 2 and last 5
        keep_start = history[:2]
        keep_end = history[-5:]
        middle = history[2:-5]

        # Summarize middle
        summary_parts = []
        module_counts = {}
        fix_count = 0
        quality_count = 0

        for h in middle:
            if h.kind == "module_done":
                module_counts[h.module] = "done"
            elif h.kind == "module_failed":
                module_counts[h.module] = "failed"
            elif h.kind == "fix":
                fix_count += 1
            elif h.kind == "quality":
                quality_count += 1

        if module_counts:
            done = [m for m, s in module_counts.items() if s == "done"]
            failed = [m for m, s in module_counts.items() if s == "failed"]
            if done:
                summary_parts.append(f"Completed: {', '.join(done)}")
            if failed:
                summary_parts.append(f"Failed: {', '.join(failed)}")
        if fix_count:
            summary_parts.append(f"{fix_count} fix rounds")
        if quality_count:
            summary_parts.append(f"{quality_count} quality passes")

        # Create compacted history entry
        compacted_entry = HistoryEntry(
            turn=0,
            timestamp=middle[0].timestamp if middle else 0,
            kind="compacted",
            detail=f"[{len(middle)} entries compacted] " + "; ".join(summary_parts),
        )

        # Replace history
        session.history = keep_start + [compacted_entry] + keep_end

        return compacted_entry.detail
