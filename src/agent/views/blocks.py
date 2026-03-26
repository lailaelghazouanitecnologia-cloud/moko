"""
BlockView — visualize block chain execution.

Renders blocks as a compact chain with status icons,
inspired by Codex's exec_cell grouping and tool call display.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from rich.text import Text
from rich.table import Table
from rich.console import Console


# Block type → single char icon (compact like Codex grouped exec calls)
# Keys in both cases since BlockType.value can be either
_TYPE_ICON = {
    "ANALYZE": "A", "analyze": "A",
    "IMPLEMENT": "I", "implement": "I",
    "REVIEW": "R", "review": "R",
    "REFACTOR": "F", "refactor": "F",
    "TEST": "T", "test": "T",
    "ABSTRACT": "X", "abstract": "X",
}

_STATUS_STYLE = {
    "completed": ("green", "[", "]"),
    "failed": ("red", "(", ")"),
    "in_progress": ("cyan bold", "[", "]"),
    "pending": ("dim", " ", " "),
    "skipped": ("dim strike", " ", " "),
}


@dataclass
class BlockData:
    """Minimal block data for rendering."""
    index: int
    block_type: str
    objective: str
    status: str = "pending"
    module: str = ""
    files: list[str] = field(default_factory=list)
    tokens: int = 0
    quality: float = 0.0


class BlockView:
    """Renders block chains — compact visual representation."""

    def __init__(self):
        self.blocks: list[BlockData] = []

    def add(self, block: BlockData):
        self.blocks.append(block)

    def add_from_model(self, block):
        """Add from core.models.Block."""
        self.blocks.append(BlockData(
            index=block.index,
            block_type=block.block_type.value,
            objective=block.objective,
            status=block.status.value,
            module=block.branch_name.split("/")[-1] if "/" in block.branch_name else block.branch_name,
            files=block.files_changed or [],
            tokens=block.tokens_used,
            quality=block.quality_score,
        ))

    def render_chain(self, module: str = "") -> Text:
        """Render blocks as a compact chain: [A]→[I]→[I]→[R]→[T]→[X]

        Like Codex groups exec calls into exploring cells.
        """
        blocks = self.blocks
        if module:
            blocks = [b for b in blocks if b.module == module]

        line = Text()
        total_tok = 0
        for i, b in enumerate(blocks):
            if i > 0:
                line.append("→", "dim")

            icon = _TYPE_ICON.get(b.block_type, "?")
            style, l, r = _STATUS_STYLE.get(b.status, ("dim", " ", " "))

            line.append(f"{l}{icon}{r}", style)
            total_tok += b.tokens

        if total_tok:
            line.append(f"  {total_tok:,}t", "dim")

        return line

    def render_detail(self) -> Text:
        """Render detailed block list with files and tokens.

        Like Codex transcript_lines() for exec cells — shows command + output.
        """
        out = Text()

        # Group by module
        by_module: dict[str, list[BlockData]] = {}
        for b in self.blocks:
            by_module.setdefault(b.module, []).append(b)

        for module, blocks in by_module.items():
            out.append(f"  {module or '?':<12} ", "bold")
            # Chain inline
            chain = self.render_chain(module)
            out.append_text(chain)
            out.append("\n")

            # Files changed (like Codex PatchHistoryCell)
            all_files = []
            for b in blocks:
                for f in b.files:
                    if f not in all_files:
                        all_files.append(f)
            if all_files:
                for f in all_files[:5]:
                    out.append(f"               └ {f}\n", "dim")
                if len(all_files) > 5:
                    out.append(f"               └ +{len(all_files) - 5} more\n", "dim")

        return out

    def render_table(self) -> Table:
        """Render blocks as a rich Table."""
        table = Table(show_header=True, header_style="bold", box=None, pad_edge=False)
        table.add_column("#", style="dim", width=3)
        table.add_column("type", width=10)
        table.add_column("objective", min_width=20)
        table.add_column("status", width=10)
        table.add_column("files", width=25)
        table.add_column("tok", justify="right", width=8)

        for b in self.blocks:
            icon = _TYPE_ICON.get(b.block_type, "?")
            style, _, _ = _STATUS_STYLE.get(b.status, ("dim", "", ""))
            status_icon = {"completed": "✔", "failed": "✘", "in_progress": "□",
                           "pending": "□", "skipped": "○"}.get(b.status, "?")
            files_str = ", ".join(b.files[:2]) if b.files else ""
            tok_str = f"{b.tokens:,}" if b.tokens else ""

            table.add_row(
                str(b.index),
                f"[{style}]{icon} {b.block_type}[/]",
                b.objective[:40],
                f"[{style}]{status_icon}[/]",
                files_str,
                tok_str,
            )

        return table
