"""
PlannerActor — extracted from DevSupervisor.create_plan.

Handles plan creation via two strategies:
  1. Layered plans from ProjectBlueprint (deterministic)
  2. LLM-based module identification (fallback)
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from ..core.models import (
    Plan, Block, BlockType, ModuleBlueprint, TypeBlueprint,
)
from ..core.llm import LLMProvider, LLMMessage, LLMCaller
from ..core.guardrails import RunGuard
from ..tools.naming import to_kebab_case
from ..tools.emission import EmissionIndex
from ..engines.blueprint.project import ProjectBlueprint
from ..engines.blueprint.composer import BlueprintComposer
from ..engines.embedding.store import SemanticStore
from ..engines.memory.block_store import CodeBlockStore
from .. import OUT_DIR


def _available_projects() -> list[str]:
    projects = []
    if OUT_DIR.is_dir():
        for d in sorted(OUT_DIR.iterdir()):
            if d.is_dir() and not d.name.startswith("."):
                projects.append(d.name)
    return projects


class PlannerActor:
    """Creates development plans from goals and references."""

    def __init__(self, caller: LLMCaller, verbose: bool = False):
        self.caller = caller
        self.verbose = verbose

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [planner] {msg}")

    def create_layered_plan(self, goal: str, target: str,
                            references: list[str],
                            project_bp: ProjectBlueprint,
                            projects_dir: Path) -> Plan:
        """Create plan from ProjectBlueprint with layer ordering."""
        plan = Plan(goal=goal, target_project=target, reference_projects=references)

        self._log(f"layered plan: {project_bp.format_summary()}")

        # Collect all ref descriptor paths
        ref_paths = []
        for proj in references:
            proj_dir = OUT_DIR / proj
            if proj_dir.is_dir():
                for f in proj_dir.rglob("*.yaml"):
                    if f.name not in ("workspace.yaml", "deps.yaml", "meta.yaml"):
                        ref_paths.append(str(f.relative_to(OUT_DIR)))

        # Generate blocks layer by layer
        for layer in project_bp.sorted_layers:
            bp_path = f"blueprints/{layer.name}.bp.yaml"

            # Analyze block: generate blueprint for this layer
            plan.add_block(
                BlockType.ANALYZE,
                f"[L{layer.order}] Generate blueprint for {layer.name}",
                meta={
                    "output_blueprint": bp_path,
                    "refs": ref_paths,
                    "module": layer.name,
                    "types": layer.type_names,
                    "layer_order": layer.order,
                    "requires": layer.requires,
                    "layer_description": layer.description,
                },
            )

            # Implement blocks: one per type
            for lt in layer.types:
                plan.add_block(
                    BlockType.IMPLEMENT,
                    f"[L{layer.order}] Translate {lt.name} from {layer.name}",
                    meta={
                        "blueprint": bp_path,
                        "type": lt.name,
                        "module": layer.name,
                        "layer_order": layer.order,
                        "requires": layer.requires,
                    },
                )

            # Index block
            plan.add_block(
                BlockType.IMPLEMENT,
                f"[L{layer.order}] Generate {layer.name} index exports",
                meta={"blueprint": bp_path, "type": "__index__",
                      "module": layer.name},
            )

        # Final test block
        plan.add_block(
            BlockType.TEST,
            "Verify all layers against blueprints",
            meta={"action": "verify_all"},
        )

        # Save project blueprint
        project_dir = projects_dir / target
        project_dir.mkdir(parents=True, exist_ok=True)
        project_bp.save(project_dir / "project.bp.yaml")

        self._log(f"layered plan: {len(plan.blocks)} blocks, "
                  f"{len(project_bp.layers)} layers, "
                  f"{project_bp.total_types} types")
        return plan

    def create_llm_plan(self, goal: str, target: str,
                        references: list[str]) -> Plan:
        """Fallback: LLM identifies modules."""
        ref_summaries = []
        for proj in references:
            ws_path = OUT_DIR / proj / "workspace.yaml"
            if ws_path.exists():
                content = ws_path.read_text()[:2000]
                ref_summaries.append(f"# {proj}/workspace.yaml\n{content}")

        ref_descriptors = {}
        for proj in references:
            proj_dir = OUT_DIR / proj
            if proj_dir.is_dir():
                for f in proj_dir.rglob("*.yaml"):
                    rel = str(f.relative_to(OUT_DIR))
                    module = f.parent.name if f.parent != proj_dir else "__root__"
                    ref_descriptors.setdefault(module, []).append(rel)

        system = (
            "You are a development planner. Given a goal and reference projects, "
            "identify the MODULES needed and the TYPES (classes) in each module.\n\n"
            "Output JSON: [{\"module\": \"name\", \"types\": [\"Type1\", \"Type2\"], "
            "\"ref_descriptors\": [\"project/path/file.yaml\"]}]\n\n"
            "Each module should have 2-6 types. Be specific about type names.\n"
            "Reference descriptors should be paths to Roska YAML files that "
            "are relevant to that module.\n\n"
            "Output ONLY the JSON array."
        )

        user = f"Goal: {goal}\nTarget project: {target}\n"
        if references:
            user += f"Reference projects: {', '.join(references)}\n"
        if ref_summaries:
            user += f"\nReference summaries:\n{''.join(ref_summaries[:3])}\n"
        if ref_descriptors:
            user += f"\nAvailable descriptors:\n"
            for mod, paths in list(ref_descriptors.items())[:20]:
                user += f"  {mod}: {', '.join(paths[:5])}\n"

        self._log("generating plan via LLM...")
        content, tokens = self.caller.call(system, user, temperature=0.4, max_tokens=2048)

        plan = Plan(goal=goal, target_project=target, reference_projects=references)

        try:
            modules_data = LLMCaller.parse_json_response(content)
        except (json.JSONDecodeError, IndexError):
            modules_data = [{"module": "core", "types": ["Main"], "ref_descriptors": []}]

        for mod in modules_data:
            mod_name = mod.get("module", "core")
            types = mod.get("types", [])
            refs = mod.get("ref_descriptors", [])
            bp_path = f"blueprints/{mod_name}.bp.yaml"

            plan.add_block(
                BlockType.ANALYZE,
                f"Generate blueprint for {mod_name} module",
                meta={"output_blueprint": bp_path, "refs": refs,
                      "module": mod_name, "types": types},
            )
            for type_name in types:
                plan.add_block(
                    BlockType.IMPLEMENT,
                    f"Translate {type_name} from {mod_name} blueprint",
                    meta={"blueprint": bp_path, "type": type_name,
                          "module": mod_name},
                )
            plan.add_block(
                BlockType.IMPLEMENT,
                f"Generate {mod_name} index exports",
                meta={"blueprint": bp_path, "type": "__index__",
                      "module": mod_name},
            )

        plan.add_block(
            BlockType.TEST,
            "Verify all modules against blueprints",
            meta={"action": "verify_all"},
        )

        self._log(f"plan created: {len(plan.blocks)} blocks "
                  f"({len(modules_data)} modules)")
        return plan
