"""
BlockScheduler — extracted from DevSupervisor._collect_parallel_batch.

Determines which blocks can be executed in parallel based on
the module blueprint's dependency graph (topological sort).
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from ..core.models import Block, BlockType, Plan, ModuleBlueprint
from ..tools.compaction import topo_sort_types


class BlockScheduler:
    """Determines parallel execution batches using dependency analysis."""

    def __init__(self, plan: Plan, projects_dir: Path,
                 max_parallel: int = 4):
        self.plan = plan
        self.projects_dir = projects_dir
        self.max_parallel = max_parallel

    def next_batch(self) -> list[Block]:
        """Collect IMPLEMENT blocks from the same topo-phase for parallel exec.

        Uses the module blueprint's dependency graph to only parallelize types
        that don't depend on each other.
        """
        first = self.plan.next_pending
        if not first or first.block_type != BlockType.IMPLEMENT:
            return [first] if first else []

        mod = first.meta.get("module", "")
        type_name = first.meta.get("type", "")

        # Don't parallelize __index__ blocks
        if type_name == "__index__":
            return [first]

        # Try to load the module blueprint for topo-sort
        bp_path = first.meta.get("blueprint", "")
        topo_phase_names = None
        if bp_path:
            target = self.plan.target_project
            full_bp = self.projects_dir / target / bp_path
            if full_bp.exists():
                try:
                    module_bp = ModuleBlueprint.load(full_bp)
                    phases = topo_sort_types(module_bp)
                    # Find which phase contains the first pending type
                    for phase in phases:
                        phase_names = {t.name for t in phase}
                        if type_name in phase_names:
                            topo_phase_names = phase_names
                            break
                except Exception:
                    pass

        # Collect pending implement blocks from the same module
        all_pending = [first]
        for b in self.plan.blocks:
            if b.index <= first.index:
                continue
            if b.status.value != "pending":
                continue
            if b.block_type != BlockType.IMPLEMENT:
                break
            if b.meta.get("module", "") != mod:
                break
            if b.meta.get("type", "") == "__index__":
                break
            all_pending.append(b)

        # Filter to only types in the same topo-phase
        if topo_phase_names:
            batch = [b for b in all_pending
                     if b.meta.get("type", "") in topo_phase_names]
            if not batch:
                batch = [first]  # fallback
        else:
            # No blueprint available yet, limit to max_parallel
            batch = all_pending[:self.max_parallel]

        return batch[:self.max_parallel]
