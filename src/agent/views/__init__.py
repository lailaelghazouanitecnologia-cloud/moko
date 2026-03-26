"""
AVA View System — Rich terminal UI inspired by Codex TUI.

Architecture (adapted from Codex's Ratatui cells):
  - LiveView: Real-time pipeline display with spinners, progress, live updates
  - PlanView: Step-by-step plan with ✔/□/◌ status (like Codex PlanUpdateCell)
  - BlockView: Block chain visualization with compact context
  - InspectView: Post-run introspection dashboard
  - StatusLine: Footer with model, tokens, context % (like Codex footer.rs)

Unlike Codex (Rust/Ratatui immediate-mode rendering), we use rich.live for
real-time updates without full TUI complexity.
"""

from .live import LiveView
from .plan import PlanView
from .blocks import BlockView
from .inspect import InspectView
from .status import StatusLine

__all__ = ["LiveView", "PlanView", "BlockView", "InspectView", "StatusLine"]
