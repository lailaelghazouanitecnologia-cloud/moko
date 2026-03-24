"""
TaskDecomposer — splits a high-level goal into per-module tasks with dependency ordering.

Converts a ProjectBlueprint (or LLM output) into a topologically sorted list
of ModuleTasks, each destined for its own git branch.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Optional

from ..llm.providers import LLMProvider, LLMMessage


@dataclass
class ModuleTask:
    """A single module to generate on its own branch."""
    name: str                           # "registers", "memory", "decoder"
    branch_name: str                    # "feature/registers"
    types: list[str]                    # ["RegisterBank", "FlagRegister", ...]
    depends_on: list[str]               # ["core"] — module names this depends on
    description: str = ""               # "x86 register file: 8 GP registers, flags, segments"
    estimated_types: int = 0            # for progress tracking
    ref_descriptors: list[str] = field(default_factory=list)

    # Generation parameters
    target_loc_per_type: int = 150
    generation_passes: int = 2


class TaskDecomposer:
    """Decompose a large goal into branch-per-module tasks with dependencies."""

    def __init__(self, llm: LLMProvider, verbose: bool = False):
        self.llm = llm
        self.verbose = verbose
        self.total_tokens = 0

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [decomposer] {msg}")

    def decompose(self, goal: str, target: str,
                  references: list[str] = None,
                  project_bp=None) -> list[ModuleTask]:
        """Decompose into ModuleTasks. Uses ProjectBlueprint if available, else LLM.

        Returns topologically sorted list of ModuleTasks.
        """
        if project_bp:
            tasks = self._from_project_blueprint(project_bp, target)
        else:
            tasks = self._from_llm(goal, target, references or [])

        # Validate and flatten topological order
        flat = []
        for level in self.topo_sort(tasks):
            flat.extend(level)

        self._log(f"decomposed into {len(flat)} module tasks")
        for t in flat:
            deps = f" <- {','.join(t.depends_on)}" if t.depends_on else ""
            self._log(f"  {t.branch_name}: {len(t.types)} types{deps}")

        return flat

    def _from_project_blueprint(self, project_bp, target: str) -> list[ModuleTask]:
        """Convert ProjectBlueprint layers -> ModuleTasks."""
        tasks = []
        for layer in project_bp.sorted_layers:
            task = ModuleTask(
                name=layer.name,
                branch_name=f"feature/{layer.name}",
                types=layer.type_names,
                depends_on=list(layer.requires),
                description=layer.description,
                estimated_types=len(layer.types),
            )
            tasks.append(task)
        return tasks

    def _from_llm(self, goal: str, target: str,
                  references: list[str]) -> list[ModuleTask]:
        """LLM-based decomposition into modules with dependency graph."""
        system = (
            "You are a software architect. Decompose a project into modules.\n\n"
            "Output JSON array: [\n"
            '  {"module": "name", "types": ["Type1", "Type2"], '
            '"depends_on": ["other_module"], '
            '"description": "brief purpose"}\n]\n\n'
            "Rules:\n"
            "- Create 3-8 modules covering the full architecture\n"
            "- Each module: 2-6 types (classes/interfaces/enums)\n"
            "- Order by dependency: foundations first, no circular deps\n"
            "- Be specific about type names\n"
            "- Output ONLY the JSON array."
        )

        user = f"Goal: {goal}\nTarget project: {target}\n"
        if references:
            user += f"Reference projects: {', '.join(references)}\n"

        resp = self.llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", user)],
            temperature=0.4, max_tokens=2048,
        )
        self.total_tokens += resp.usage.total_tokens

        try:
            data = self._parse_json(resp.content)
        except (json.JSONDecodeError, ValueError):
            self._log("LLM decomposition failed, using fallback")
            data = [{"module": "core", "types": ["Main"],
                     "depends_on": [], "description": goal}]

        tasks = []
        for mod in data:
            mod_name = mod.get("module", "core")
            tasks.append(ModuleTask(
                name=mod_name,
                branch_name=f"feature/{mod_name}",
                types=mod.get("types", []),
                depends_on=mod.get("depends_on", []),
                description=mod.get("description", ""),
                estimated_types=len(mod.get("types", [])),
            ))

        return tasks

    def topo_sort(self, tasks: list[ModuleTask]) -> list[list[ModuleTask]]:
        """Group tasks into topological levels.

        Level 0: no deps. Level 1: depends only on level 0. Etc.
        Modules in the same level can theoretically run in parallel.
        """
        task_map = {t.name: t for t in tasks}
        remaining = set(task_map.keys())
        resolved: set[str] = set()
        levels: list[list[ModuleTask]] = []

        max_iters = len(tasks) + 1
        for _ in range(max_iters):
            if not remaining:
                break

            # Find tasks whose deps are all resolved
            level = []
            for name in list(remaining):
                task = task_map[name]
                # Filter deps to only those that are actual tasks
                real_deps = [d for d in task.depends_on if d in task_map]
                if all(d in resolved for d in real_deps):
                    level.append(task)

            if not level:
                # Circular dependency — force remaining into one level
                self._log(f"WARNING: circular deps detected, forcing {remaining}")
                level = [task_map[n] for n in remaining]

            for t in level:
                remaining.discard(t.name)
                resolved.add(t.name)

            levels.append(level)

        return levels

    def _parse_json(self, text: str) -> list:
        """Extract JSON from LLM response."""
        text = text.strip()
        if "```" in text:
            parts = text.split("```")
            for part in parts[1:]:
                candidate = part.strip()
                if candidate.startswith("json"):
                    candidate = candidate[4:].strip()
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    continue
        return json.loads(text)
