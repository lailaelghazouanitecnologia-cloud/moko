"""
ProposerActor — extracted from DevSupervisor._collect_eval_proposals
and dev/discussion_proposals.py.

Extracts evaluation proposals from block discussions and abstraction results,
then saves them to eval.yaml for the DevManager to run.
"""
from __future__ import annotations

import yaml
from pathlib import Path
from typing import Optional

from ..core.models import Block, AbstractionResult, Discussion
from ..core.branch import EvalConfig


class ProposerActor:
    """Extracts eval proposals from discussions and saves to eval.yaml."""

    def __init__(self, projects_dir: Path, verbose: bool = False):
        self.projects_dir = projects_dir
        self.verbose = verbose

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [proposer] {msg}")

    def collect_eval_proposals(self, block: Block, target_project: str):
        """Extract eval proposals from block discussions and save to eval.yaml."""
        from ..dev.discussion_proposals import (
            extract_proposals_from_discussion,
            extract_proposals_from_abstraction,
        )

        module_name = block.meta.get("module", "")
        proposals = []

        # From discussions
        for disc in block.discussions:
            type_name = block.meta.get("type", "")
            new_proposals = extract_proposals_from_discussion(
                disc, module_name, type_name
            )
            proposals.extend(new_proposals)

        # From abstraction
        if block.abstraction and block.abstraction.feature_decisions:
            abs_proposals = extract_proposals_from_abstraction(
                block.abstraction.feature_decisions, module_name
            )
            proposals.extend(abs_proposals)

        if not proposals:
            return

        # Save proposals to eval.yaml (append, don't overwrite)
        project_dir = self.projects_dir / target_project
        eval_path = project_dir / "eval.yaml"

        existing = []
        if eval_path.exists():
            try:
                data = yaml.safe_load(eval_path.read_text())
                existing = data.get("evaluations", []) if data else []
            except Exception:
                pass

        # Add new proposals (avoid duplicates by target_type + variation)
        existing_keys = {
            (e.get("target_type", ""), e.get("variation", ""))
            for e in existing
        }

        for p in proposals:
            key = (p.eval_config.target_type, p.eval_config.variation)
            if key not in existing_keys:
                existing.append({
                    "target_type": p.eval_config.target_type,
                    "target_module": p.eval_config.target_module,
                    "variation": p.eval_config.variation,
                    "constraints": p.eval_config.constraints,
                    "benchmark_metrics": p.eval_config.benchmark_metrics,
                    "_reason": p.reason,
                    "_confidence": p.confidence,
                    "_source": p.source_discussion,
                })
                existing_keys.add(key)

        eval_path.parent.mkdir(parents=True, exist_ok=True)
        eval_path.write_text(yaml.dump(
            {"evaluations": existing},
            default_flow_style=False, sort_keys=False, allow_unicode=True,
        ))

        self._log(f"eval proposals: {len(proposals)} new from block {block.index} "
                  f"→ {eval_path}")
