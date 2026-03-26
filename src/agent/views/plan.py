"""
PlanView — step-by-step plan with live status updates.

Inspired by Codex PlanUpdateCell: ✔ completed (crossed out, dim),
□ in_progress (cyan bold), □ pending (dim).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from rich.console import Console, Group
from rich.panel import Panel
from rich.text import Text
from rich.table import Table


class StepStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class PlanStep:
    """One step in the plan — matches Codex PlanItemArg."""
    text: str
    status: StepStatus = StepStatus.PENDING
    detail: str = ""
    tokens: int = 0
    elapsed: float = 0.0


@dataclass
class PlanView:
    """Renders a plan with step status — like Codex's update_plan tool."""

    title: str = "Plan"
    steps: list[PlanStep] = field(default_factory=list)

    def add_step(self, text: str) -> int:
        idx = len(self.steps)
        self.steps.append(PlanStep(text=text))
        return idx

    def start_step(self, idx: int):
        if 0 <= idx < len(self.steps):
            self.steps[idx].status = StepStatus.IN_PROGRESS

    def complete_step(self, idx: int, detail: str = "", tokens: int = 0, elapsed: float = 0.0):
        if 0 <= idx < len(self.steps):
            self.steps[idx].status = StepStatus.COMPLETED
            self.steps[idx].detail = detail
            self.steps[idx].tokens = tokens
            self.steps[idx].elapsed = elapsed

    def fail_step(self, idx: int, detail: str = ""):
        if 0 <= idx < len(self.steps):
            self.steps[idx].status = StepStatus.FAILED
            self.steps[idx].detail = detail

    def skip_step(self, idx: int, detail: str = ""):
        if 0 <= idx < len(self.steps):
            self.steps[idx].status = StepStatus.SKIPPED
            self.steps[idx].detail = detail

    def render(self) -> Text:
        """Render plan steps — Codex style."""
        lines = Text()
        lines.append(f"• ", "dim")
        lines.append(self.title, "bold")
        lines.append("\n")

        for step in self.steps:
            # Icon + style per status (matches Codex history_cell.rs)
            if step.status == StepStatus.COMPLETED:
                icon = "✔"
                style = "green dim strike"
            elif step.status == StepStatus.IN_PROGRESS:
                icon = "□"
                style = "cyan bold"
            elif step.status == StepStatus.FAILED:
                icon = "✘"
                style = "red bold"
            elif step.status == StepStatus.SKIPPED:
                icon = "○"
                style = "dim italic"
            else:  # PENDING
                icon = "□"
                style = "dim"

            lines.append(f"  └ {icon} ", "dim")
            lines.append(step.text, style)

            # Inline detail (tokens, elapsed)
            meta_parts = []
            if step.tokens:
                meta_parts.append(f"{step.tokens:,}t")
            if step.elapsed:
                meta_parts.append(f"{step.elapsed:.1f}s")
            if step.detail:
                meta_parts.append(step.detail)
            if meta_parts:
                lines.append(f"  {' · '.join(meta_parts)}", "dim")

            lines.append("\n")

        return lines

    @property
    def progress(self) -> tuple[int, int]:
        """(completed, total)."""
        done = sum(1 for s in self.steps if s.status in (StepStatus.COMPLETED, StepStatus.SKIPPED))
        return done, len(self.steps)
