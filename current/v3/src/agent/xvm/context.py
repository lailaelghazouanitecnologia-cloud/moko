"""
ContextLoader — extracted from DevSupervisor context helpers.

Handles context assembly for block execution:
  - On-demand reference loading via VM
  - History context from previous blocks
  - Prior layers context from translated blueprints
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from ..core.models import Block, Plan, ModuleBlueprint
from ..tools.compaction import build_prior_layers_context
from .vm import BlockVM


class ContextLoader:
    """Assembles context for block execution using the VM."""

    def __init__(self, vm: BlockVM, plan: Plan,
                 projects_dir: Path, verbose: bool = False):
        self.vm = vm
        self.plan = plan
        self.projects_dir = projects_dir
        self.verbose = verbose

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [context] {msg}")

    def load_on_demand(self, block: Block) -> str:
        """Load references on-demand via VM, not all at once."""
        if not self.vm or not self.plan:
            return ""

        parts = []
        keywords = [w for w in block.objective.lower().split() if len(w) > 3]

        for proj in self.plan.reference_projects:
            # Always load workspace (small, structural)
            ws = self.vm.load_workspace(proj)
            if ws:
                parts.append(f"# {proj}/workspace.yaml\n{ws}")

            # Load relevant files by keywords
            loaded = self.vm.load_by_relevance(proj, keywords, max_files=5)
            for path, content in loaded:
                parts.append(f"# {proj}/{path}\n{content}")

        self._log(f"on-demand: {self.vm.budget.utilization:.0%} budget used "
                  f"({len(self.vm.budget.loaded_paths)} files)")
        return "\n\n".join(parts)

    def build_history(self) -> str:
        """Build a summary of previous completed blocks."""
        if not self.plan:
            return ""

        completed = self.plan.completed_blocks
        if not completed:
            return ""

        parts = []
        for b in completed[-5:]:  # last 5 blocks
            parts.append(
                f"Block {b.index} [{b.block_type.value}]: {b.objective[:60]}"
            )
            if b.output:
                parts.append(f"  Output: {b.output[:200]}...")

        return "\n".join(parts)

    def build_prior_layers(self, block_meta: dict) -> str:
        """Build compact context from already-translated prior layers.

        Two strategies:
        1. If "requires" is specified: load only those modules (layered plan)
        2. If "requires" is missing: load ALL translated modules except current
        """
        if not self.plan:
            return ""

        target = self.plan.target_project
        project_dir = self.projects_dir / target
        bp_dir = project_dir / "blueprints"

        if not bp_dir.exists():
            return ""

        current_module = block_meta.get("module", "")
        requires = block_meta.get("requires", [])

        prior_bps = []
        if requires:
            for req_name in requires:
                bp_file = bp_dir / f"{req_name}.bp.yaml"
                if bp_file.exists():
                    try:
                        bp = ModuleBlueprint.load(bp_file)
                        if bp.translated_types:
                            prior_bps.append(bp)
                    except Exception:
                        continue
        else:
            for bp_file in sorted(bp_dir.glob("*.bp.yaml")):
                try:
                    bp = ModuleBlueprint.load(bp_file)
                    if bp.name != current_module and bp.translated_types:
                        prior_bps.append(bp)
                except Exception:
                    continue

        if not prior_bps:
            return ""

        ctx = build_prior_layers_context(prior_bps, max_chars=3000)
        self._log(f"prior layers context: {len(prior_bps)} modules, {len(ctx)} chars")
        return ctx
