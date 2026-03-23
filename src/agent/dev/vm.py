"""
BlockVM — Virtual Machine for navigating and operating on plan blocks.

The VM maintains a cursor position within the plan chain, a registry of
valuable discoveries, and an on-demand context loader that only pulls
descriptors when needed (not all at once).

Think of it as a debugger for development plans:
  - Navigate: goto, next, prev, jump to block
  - Register: save insights worth keeping
  - Discard: explicitly drop what doesn't help
  - Load on-demand: fetch references only when the current block needs them
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .. import OUT_DIR
from .plan import (
    Plan, Block, BlockStatus, BlockType,
    RegisteredInsight, Discussion, DiscussionPoint, Stance,
)


@dataclass
class ContextBudget:
    """Controls on-demand loading to keep token usage balanced."""
    max_chars: int = 20000        # total context budget
    loaded_chars: int = 0
    loaded_paths: set = field(default_factory=set)
    load_history: list[tuple[str, int]] = field(default_factory=list)  # (path, chars)

    @property
    def remaining(self) -> int:
        return max(0, self.max_chars - self.loaded_chars)

    @property
    def utilization(self) -> float:
        return self.loaded_chars / max(self.max_chars, 1)

    def can_load(self, chars: int) -> bool:
        return chars <= self.remaining

    def record_load(self, path: str, chars: int):
        self.loaded_paths.add(path)
        self.loaded_chars += chars
        self.load_history.append((path, chars))

    def reset(self):
        """Reset for new block (keep loaded_paths for dedup)."""
        self.loaded_chars = 0
        self.load_history.clear()


class BlockVM:
    """Virtual machine for navigating and operating on plan blocks."""

    def __init__(self, plan: Plan, budget_chars: int = 20000):
        self.plan = plan
        self.cursor: int = 0                              # current block index
        self.budget = ContextBudget(max_chars=budget_chars)

        # Global registry — persists across all blocks
        self.registry: list[RegisteredInsight] = []
        self.discarded: list[str] = []

        # On-demand cache
        self._descriptor_cache: dict[str, str] = {}       # path → content

    # ── Navigation ──────────────────────────────────────────

    @property
    def current(self) -> Optional[Block]:
        if 0 <= self.cursor < len(self.plan.blocks):
            return self.plan.blocks[self.cursor]
        return None

    def goto(self, index: int) -> Block:
        """Jump to a specific block."""
        if index < 0 or index >= len(self.plan.blocks):
            raise IndexError(f"Block {index} doesn't exist (0-{len(self.plan.blocks) - 1})")
        self.cursor = index
        self.budget.reset()
        return self.plan.blocks[index]

    def next(self) -> Optional[Block]:
        """Move to next block."""
        if self.cursor + 1 < len(self.plan.blocks):
            self.cursor += 1
            self.budget.reset()
            return self.plan.blocks[self.cursor]
        return None

    def prev(self) -> Optional[Block]:
        """Move to previous block."""
        if self.cursor > 0:
            self.cursor -= 1
            self.budget.reset()
            return self.plan.blocks[self.cursor]
        return None

    def find_block(self, predicate) -> Optional[Block]:
        """Find block matching predicate."""
        for b in self.plan.blocks:
            if predicate(b):
                return b
        return None

    # ── Registry (cross-block memory) ───────────────────────

    def register(self, content: str, source: str, category: str,
                 relevance: float = 0.7):
        """Register a valuable insight to global memory."""
        insight = RegisteredInsight(
            content=content, source=source,
            block_index=self.cursor, category=category,
            relevance=relevance,
        )
        self.registry.append(insight)
        # Also register on the current block
        if self.current:
            self.current.registered.append(insight)

    def discard(self, what: str):
        """Explicitly drop something as not valuable."""
        self.discarded.append(what)
        if self.current:
            self.current.discarded.append(what)

    def get_registry_context(self, categories: list[str] = None,
                             min_relevance: float = 0.5,
                             max_chars: int = 4000) -> str:
        """Build context string from registry, filtered by relevance."""
        filtered = [r for r in self.registry if r.relevance >= min_relevance]
        if categories:
            filtered = [r for r in filtered if r.category in categories]

        # Sort by relevance descending
        filtered.sort(key=lambda r: -r.relevance)

        parts = []
        chars = 0
        for r in filtered:
            entry = f"[{r.category}] (block {r.block_index}, {r.relevance:.0%}) {r.content}"
            if chars + len(entry) > max_chars:
                break
            parts.append(entry)
            chars += len(entry)

        return "\n".join(parts)

    # ── On-Demand Context Loading ───────────────────────────

    def load_descriptor(self, project: str, rel_path: str) -> Optional[str]:
        """Load a specific descriptor on-demand, respecting budget."""
        full_path = OUT_DIR / project / rel_path
        cache_key = f"{project}/{rel_path}"

        if cache_key in self._descriptor_cache:
            return self._descriptor_cache[cache_key]

        if not full_path.exists():
            return None

        content = full_path.read_text()

        if not self.budget.can_load(len(content)):
            # Over budget — try compressed version
            content = self._compress_descriptor(content)
            if not self.budget.can_load(len(content)):
                return None  # Still too big, skip

        self._descriptor_cache[cache_key] = content
        self.budget.record_load(cache_key, len(content))
        return content

    def load_workspace(self, project: str) -> Optional[str]:
        """Load workspace.yaml — always prioritized."""
        return self.load_descriptor(project, "workspace.yaml")

    def load_by_relevance(self, project: str, keywords: list[str],
                          max_files: int = 10) -> list[tuple[str, str]]:
        """Load descriptors matching keywords, respecting budget.

        Returns list of (path, content) loaded.
        """
        proj_dir = OUT_DIR / project
        if not proj_dir.is_dir():
            return []

        # Score all yaml files
        candidates = []
        for yaml_file in proj_dir.rglob("*.yaml"):
            if yaml_file.name in ("workspace.yaml", "deps.yaml"):
                continue
            rel = str(yaml_file.relative_to(OUT_DIR / project))
            name_lower = rel.lower()
            score = sum(1 for kw in keywords if kw.lower() in name_lower)
            # Peek at content for keyword matches
            if score == 0:
                try:
                    head = yaml_file.read_text()[:500]
                    score = sum(0.5 for kw in keywords if kw.lower() in head.lower())
                except Exception:
                    pass
            if score > 0:
                candidates.append((score, rel, yaml_file))

        # Sort by score, load top N respecting budget
        candidates.sort(key=lambda x: -x[0])
        loaded = []
        for _score, rel, yaml_file in candidates[:max_files]:
            content = self.load_descriptor(project, rel)
            if content:
                loaded.append((rel, content))

        return loaded

    def _compress_descriptor(self, content: str) -> str:
        """Quick compression — keep structure, drop details."""
        lines = content.split("\n")
        kept = []
        for line in lines:
            stripped = line.strip()
            # Keep structural lines
            if any(stripped.startswith(k) for k in
                   ("name:", "type:", "path:", "module:", "layer:",
                    "types:", "functions:", "imports:", "calls:",
                    "  - name:", "  - type:")):
                kept.append(line)
            # Keep section headers
            elif stripped.endswith(":") and not stripped.startswith("#"):
                kept.append(line)
        return "\n".join(kept)

    # ── Status ──────────────────────────────────────────────

    def format_status(self) -> str:
        W = 66
        block = self.current
        lines = [
            f"{'━' * W}",
            f"  BLOCK VM",
            f"{'─' * W}",
            f"  Cursor:     Block {self.cursor}/{len(self.plan.blocks) - 1}",
        ]
        if block:
            lines.append(f"  Type:       {block.block_type.value}")
            lines.append(f"  Status:     {block.status.value}")
            lines.append(f"  Objective:  {block.objective[:50]}")
        lines.append(f"{'─' * W}")
        lines.append(f"  Budget:     {self.budget.loaded_chars:,}/{self.budget.max_chars:,} chars "
                      f"({self.budget.utilization:.0%})")
        lines.append(f"  Loaded:     {len(self.budget.loaded_paths)} descriptors")
        lines.append(f"  Registry:   {len(self.registry)} insights")
        lines.append(f"  Discarded:  {len(self.discarded)} items")

        if block and block.discussions:
            lines.append(f"{'─' * W}")
            lines.append(f"  Discussions: {len(block.discussions)}")
            for disc in block.discussions[-2:]:  # last 2
                lines.append(disc.format())

        lines.append(f"{'━' * W}")
        return "\n".join(lines)
