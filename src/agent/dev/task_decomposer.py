"""
TaskDecomposer — splits a high-level goal into per-module tasks with dependency ordering.

Converts a ProjectBlueprint (or LLM output or reference project analysis)
into a topologically sorted list of ModuleTasks, each destined for its own git branch.

The Reference-Aware path (_from_reference) reads the actual meta-graph and
module descriptors from analyzed reference projects, extracting real module
structure, types, dependencies, and descriptions instead of letting the LLM
invent generic modules.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from ..llm.providers import LLMProvider, LLMMessage
from .config import DecomposerConfig
from .errors import YAMLParseError, DecompositionError

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore


@dataclass
class ModuleTask:
    """A single module to generate on its own branch."""
    name: str                           # "skill_engine", "agents", "cloud"
    branch_name: str                    # "feature/skill_engine"
    types: list[str]                    # ["SkillStore", "SkillEvolver", ...]
    depends_on: list[str]               # ["config", "utils"]
    description: str = ""               # rich description from reference
    estimated_types: int = 0            # for progress tracking
    ref_descriptors: list[str] = field(default_factory=list)

    # Generation parameters
    target_loc_per_type: int = 150
    generation_passes: int = 2


class TaskDecomposer:
    """Decompose a large goal into branch-per-module tasks with dependencies."""

    def __init__(self, llm: LLMProvider, verbose: bool = False,
                 out_dir: Path = None,
                 config: DecomposerConfig = None):
        self.llm = llm
        self.verbose = verbose
        self.total_tokens: int = 0
        self.out_dir = out_dir  # Where reference descriptors live
        self.config = config or DecomposerConfig()

    def _log(self, msg: str) -> None:
        if self.verbose:
            print(f"  [decomposer] {msg}")

    def decompose(self, goal: str, target: str,
                  references: list[str] = None,
                  project_bp=None,
                  intelligence=None,
                  feature_selection: list = None) -> list[ModuleTask]:
        """Decompose into ModuleTasks.

        Priority:
          1. ProjectBlueprint (if provided)
          2. Feature-selection (user chose specific features from AST)
          3. Intelligence-informed (PI: goal-driven, calibrated by reference)
          4. Reference-aware extraction (clone mode — fallback)
          5. LLM-based fallback

        Returns topologically sorted list of ModuleTasks.
        """
        if project_bp:
            tasks = self._from_project_blueprint(project_bp, target)
        elif feature_selection:
            # Feature AST mode: user selected specific capabilities
            tasks = self._from_feature_selection(
                goal, target, feature_selection, intelligence)
        elif intelligence:
            # PI mode: goal-driven, calibrated by reference intelligence
            tasks = self._from_goal_with_intelligence(goal, target, intelligence)
        elif references and self.out_dir:
            ref_tasks = self._from_reference(references, goal)
            if ref_tasks:
                tasks = ref_tasks
            else:
                tasks = self._from_llm(goal, target, references)
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

    # ── Reference-Aware Decomposition ────────────────────────

    def _from_reference(self, references: list[str],
                        goal: str) -> Optional[list[ModuleTask]]:
        """Extract real module structure from reference project descriptors.

        Reads meta.yaml (module graph) + module.yaml (type listings) from
        each reference project's output directory. Produces ModuleTasks that
        mirror the actual architecture of the reference.
        """
        if yaml is None:
            self._log("yaml not available, skipping reference-aware decomposition")
            return None

        all_tasks: list[ModuleTask] = []

        for ref_name in references:
            ref_dir = self.out_dir / ref_name
            meta_path = ref_dir / "graphs" / "meta.yaml"

            if not meta_path.exists():
                self._log(f"no meta.yaml for {ref_name}, skipping")
                continue

            tasks = self._extract_from_meta(ref_dir, ref_name, meta_path)
            if tasks:
                all_tasks.extend(tasks)
                self._log(f"reference {ref_name}: extracted {len(tasks)} modules, "
                          f"{sum(len(t.types) for t in tasks)} types")

        if not all_tasks:
            return None

        # If multiple references, merge/deduplicate by module name
        if len(references) > 1:
            all_tasks = self._merge_tasks(all_tasks)

        return all_tasks

    def _extract_from_meta(self, ref_dir: Path, ref_name: str,
                           meta_path: Path) -> list[ModuleTask]:
        """Parse a reference project's meta.yaml and module descriptors."""
        try:
            meta = yaml.safe_load(meta_path.read_text())
        except Exception as e:
            self._log(f"failed to parse {meta_path}: {e}")
            return []

        if not isinstance(meta, dict):
            return []

        nodes = meta.get("nodes", [])
        edges = meta.get("internal_edges", [])

        # Build dependency graph from edges
        deps_map: Dict[str, list[str]] = {}
        for edge in edges:
            src = edge.get("from", "")
            dst = edge.get("to", "")
            if src and dst:
                deps_map.setdefault(src, []).append(dst)

        tasks = []
        for node in nodes:
            mod_id = node.get("id", "")
            if not mod_id or mod_id == "__root__":
                continue

            mod_lines = node.get("lines", 0)
            label = node.get("label", "")

            # Extract type/function counts from label like "skill_engine (14t, 68f)"
            type_count, func_count = self._parse_label_counts(label)

            # Read module.yaml for detailed type list
            mod_yaml = ref_dir / mod_id / "module.yaml"
            types, description, descriptors = self._extract_module_types(
                ref_dir, ref_name, mod_id, mod_yaml
            )

            # If module has few types, also scan subdirectories recursively
            if len(types) < 3:
                extra = self._extract_types_from_files(ref_dir, mod_id)
                for t in extra:
                    if t not in types:
                        types.append(t)

            # Skip tiny utility modules with no types
            if not types and mod_lines < 100:
                self._log(f"  skip {mod_id}: no types, {mod_lines} LOC")
                continue

            # If still no types, create a placeholder from the module name
            if not types:
                types = [self._module_to_class_name(mod_id)]

            # Cap types per module to avoid overwhelming the pipeline
            # Keep the most important types (first ones tend to be core classes)
            if len(types) > self.config.max_types_per_module:
                self._log(f"  {mod_id}: capping {len(types)} types to {self.config.max_types_per_module}")
                types = types[:self.config.max_types_per_module]

            # Get dependencies for this module
            module_deps = deps_map.get(mod_id, [])
            # Filter out __root__ and self-references
            module_deps = [d for d in module_deps if d != "__root__" and d != mod_id]

            # Calculate target LOC per type based on reference density
            loc_per_type = max(self.config.target_loc_per_type_min,
                               mod_lines // max(len(types), 1))
            loc_per_type = min(loc_per_type, self.config.target_loc_per_type_max)

            task = ModuleTask(
                name=mod_id,
                branch_name=f"feature/{mod_id}",
                types=types,
                depends_on=module_deps,
                description=description or f"Module {mod_id} ({mod_lines} LOC in reference)",
                estimated_types=len(types),
                ref_descriptors=descriptors,
                target_loc_per_type=loc_per_type,
            )
            tasks.append(task)

        return tasks

    def _extract_module_types(self, ref_dir: Path, ref_name: str,
                              mod_id: str, mod_yaml: Path
                              ) -> Tuple[list[str], str, list[str]]:
        """Extract type names, description, and descriptor paths from module.yaml."""
        types: list[str] = []
        description = ""
        descriptors: list[str] = []

        if not mod_yaml.exists() or yaml is None:
            return types, description, descriptors

        try:
            mod_data = yaml.safe_load(mod_yaml.read_text())
        except Exception:
            return types, description, descriptors

        if not isinstance(mod_data, dict):
            return types, description, descriptors

        # Collect descriptor paths for this module
        files_list = mod_data.get("files", [])
        for file_entry in files_list:
            file_path = file_entry.get("file", "")
            if file_path:
                # Convert e.g. "skill_engine/evolver.py" to descriptor path
                stem = Path(file_path).stem
                desc_path = f"{ref_name}/{mod_id}/{stem}.yaml"
                descriptors.append(desc_path)

                # Build description from purpose fields
                purpose = file_entry.get("purpose", "")
                if purpose and len(purpose) > len(description):
                    description = purpose

        # Now read each file descriptor to get actual type names
        for file_entry in files_list:
            file_path = file_entry.get("file", "")
            if not file_path:
                continue

            stem = Path(file_path).stem
            desc_file = ref_dir / mod_id / f"{stem}.yaml"
            if not desc_file.exists():
                continue

            try:
                desc_data = yaml.safe_load(desc_file.read_text())
            except Exception:
                continue

            if not isinstance(desc_data, dict):
                continue

            # Extract type names
            for type_def in desc_data.get("types", []):
                name = type_def.get("name", "")
                if name and name not in types:
                    # Skip private/internal types (start with _)
                    if not name.startswith("_"):
                        types.append(name)

        return types, description, descriptors

    def _extract_types_from_files(self, ref_dir: Path,
                                  mod_id: str) -> list[str]:
        """Fallback: scan all .yaml descriptors in a module directory for types.

        Searches recursively through subdirectories (e.g., grounding/backends/gui/).
        """
        types = []
        mod_dir = ref_dir / mod_id
        if not mod_dir.exists():
            return types

        for yaml_file in sorted(mod_dir.rglob("*.yaml")):
            if yaml_file.name == "module.yaml":
                continue
            try:
                data = yaml.safe_load(yaml_file.read_text())
                if isinstance(data, dict):
                    for t in data.get("types", []):
                        name = t.get("name", "")
                        if name and not name.startswith("_") and name not in types:
                            types.append(name)
            except Exception:
                continue

        return types

    def _parse_label_counts(self, label: str) -> Tuple[int, int]:
        """Parse '(14t, 68f)' from meta.yaml label."""
        m = re.search(r'\((\d+)t,\s*(\d+)f\)', label)
        if m:
            return int(m.group(1)), int(m.group(2))
        return 0, 0

    def _module_to_class_name(self, mod_id: str) -> str:
        """Convert 'skill_engine' -> 'SkillEngine'."""
        return "".join(w.capitalize() for w in mod_id.split("_"))

    def _merge_tasks(self, tasks: list[ModuleTask]) -> list[ModuleTask]:
        """Merge tasks from multiple references by module name."""
        merged: Dict[str, ModuleTask] = {}
        for task in tasks:
            if task.name in merged:
                existing = merged[task.name]
                for t in task.types:
                    if t not in existing.types:
                        existing.types.append(t)
                existing.ref_descriptors.extend(task.ref_descriptors)
                existing.estimated_types = len(existing.types)
            else:
                merged[task.name] = task
        return list(merged.values())

    # ── Feature-Selection Decomposition ─────────────────────

    def _from_feature_selection(self, goal: str, target: str,
                                selected_nodes: list,
                                intelligence=None) -> list[ModuleTask]:
        """Decompose based on user-selected FeatureNode list.

        Each selected leaf node becomes a module or part of a module.
        LOC targets come directly from the reference node's ref_loc,
        scaled down for generation (typically 20-40% of reference).

        Uses LLM to generate OWN type names inspired by reference types.
        """
        from ..engines.reference.feature_ast import FeatureNode, _TYPES_3D_ONLY

        # Collect leaf nodes (no children = actual code modules)
        leaves = [n for n in selected_nodes
                  if not n.children and n.ref_loc > 0]

        if not leaves:
            self._log("no leaf nodes selected, falling back to LLM")
            return self._from_llm(goal, target, [])

        # Build context for LLM: node → what to generate
        node_specs = []
        for node in leaves:
            # Filter out 3D-only types if goal is 2D
            goal_lower = goal.lower()
            is_2d = any(kw in goal_lower for kw in {"2d", "sprite", "tilemap", "pixel"})
            if is_2d:
                types = [t for t in node.ref_types if t not in _TYPES_3D_ONLY]
            else:
                types = list(node.ref_types)

            # Scale LOC: target is 20-40% of reference for a new project
            scale = self.config.feature_loc_scale
            if (intelligence and hasattr(intelligence, 'quality')
                    and hasattr(intelligence.quality, 'loc_per_type')
                    and intelligence.quality.loc_per_type.median > 0):
                # If we know the reference's actual median, use that as guide
                scale = min(self.config.feature_loc_scale_max,
                            max(self.config.feature_loc_scale_min,
                                150 / max(intelligence.quality.loc_per_type.median, 1)))

            target_loc = max(self.config.target_loc_per_type_min,
                             int(node.ref_loc * scale / max(len(types), 1)))
            target_loc = min(target_loc, self.config.target_loc_per_type_max)

            adapt_note = ""
            if node.adapt:
                adapt_note = f" ADAPT: {node.adapt} (generate NEW implementation, don't clone)"

            node_specs.append({
                "ref_module": node.ref_module or node.path,
                "ref_types": types,
                "ref_loc": node.ref_loc,
                "target_loc_per_type": target_loc,
                "adapt": adapt_note,
                "requires": node.requires,
            })

        # LLM call: given selected nodes + goal, generate module plan with OWN names
        system = (
            "You are a software architect. Design modules for a NEW project.\n\n"
            "You receive SELECTED FEATURES from a reference project and a GOAL.\n"
            "For each selected feature, create a module with YOUR OWN type names.\n"
            "Use the reference types as INSPIRATION for what to include.\n\n"
            "Output JSON array:\n"
            '[{"module": "name", "types": ["Type1", "Type2"], '
            '"depends_on": ["other_module"], '
            '"description": "purpose", '
            '"inspired_by": "ref_module_name", '
            '"target_loc_per_type": 150}]\n\n'
            "Rules:\n"
            "- Create YOUR OWN module and type names (do NOT copy reference names)\n"
            "- Match the DEPTH of the reference (similar number of types/methods)\n"
            "- If ADAPT is specified, design for the new target (e.g., WebGPU not WebGL)\n"
            "- Keep the same dependency structure but with your own module names\n"
            "- Output ONLY the JSON array\n"
        )

        import json as _json
        specs_str = _json.dumps(node_specs, indent=2)

        user = (
            f"Goal: {goal}\n"
            f"Target project: {target}\n\n"
            f"## Selected reference features\n```json\n{specs_str}\n```\n\n"
            f"Design {len(leaves)} modules with YOUR OWN names, inspired by these features."
        )

        resp = self.llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", user)],
            temperature=0.4, max_tokens=3000,
        )
        self.total_tokens += resp.usage.total_tokens

        try:
            data = self._parse_json(resp.content)
        except (json.JSONDecodeError, ValueError):
            self._log("feature-selection decomposition failed, falling back to LLM")
            return self._from_llm(goal, target, [])

        tasks = []
        for mod in data:
            mod_name = mod.get("module", "core")
            loc_target = mod.get("target_loc_per_type", 150)
            loc_target = max(80, min(loc_target, 400))

            tasks.append(ModuleTask(
                name=mod_name,
                branch_name=f"feature/{mod_name}",
                types=mod.get("types", []),
                depends_on=mod.get("depends_on", []),
                description=mod.get("description", ""),
                estimated_types=len(mod.get("types", [])),
                target_loc_per_type=loc_target,
            ))

        self._log(f"feature-selection decomposition: {len(tasks)} modules "
                  f"from {len(leaves)} selected features")
        return tasks

    # ── Intelligence-Informed Decomposition ─────────────────

    def _from_goal_with_intelligence(self, goal: str, target: str,
                                     intelligence) -> list[ModuleTask]:
        """Goal-driven decomposition calibrated by reference intelligence.

        Uses the PI to CALIBRATE (not copy):
          - Module count and size from metrics
          - Applicable patterns as inspiration
          - Style conventions to follow
          - Quality targets for LOC/type calibration
        """
        pi = intelligence  # ProjectIntelligence

        # Build calibration context from PI
        calibration = self._build_calibration_context(pi)

        system = (
            "You are a software architect. Design a module architecture for a NEW project.\n\n"
            "You are given a GOAL and CALIBRATION DATA from a reference project.\n"
            "Use the reference for CALIBRATION (depth, complexity, style) — NOT for copying.\n"
            "Design YOUR OWN modules with YOUR OWN names.\n\n"
            "Output JSON array: [\n"
            '  {"module": "name", "types": ["Type1", "Type2"], '
            '"depends_on": ["other_module"], '
            '"description": "brief purpose", '
            '"target_loc_per_type": 150}\n]\n\n'
            "Rules:\n"
            "- Create 3-8 modules covering the full architecture for the GOAL\n"
            "- Each module: 2-6 types (classes + interfaces). Match reference depth.\n"
            "- For each module with public API, include BOTH concrete classes AND interfaces (prefix I).\n"
            "- Order by dependency: foundations first, no circular deps\n"
            "- Use the reference's LOC/type and methods/type as CALIBRATION for target_loc_per_type\n"
            "- Apply APPLICABLE PATTERNS as inspiration (implement YOUR version)\n"
            "- Do NOT copy module names or type names from the reference\n"
            "- Output ONLY the JSON array.\n"
        )

        user = (
            f"Goal: {goal}\n"
            f"Target project: {target}\n\n"
            f"{calibration}"
        )

        resp = self.llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", user)],
            temperature=0.4, max_tokens=3000,
        )
        self.total_tokens += resp.usage.total_tokens

        try:
            data = self._parse_json(resp.content)
        except (json.JSONDecodeError, ValueError):
            self._log("PI-informed decomposition failed, falling back to LLM")
            return self._from_llm(goal, target, [])

        # Extract quality targets for LOC calibration
        default_loc = 150
        if hasattr(pi, 'quality') and pi.quality.loc_per_type.median > 0:
            default_loc = int(pi.quality.loc_per_type.median)

        tasks = []
        for mod in data:
            mod_name = mod.get("module", "core")
            loc_target = mod.get("target_loc_per_type", default_loc)
            loc_target = max(80, min(loc_target, 500))  # clamp

            tasks.append(ModuleTask(
                name=mod_name,
                branch_name=f"feature/{mod_name}",
                types=mod.get("types", []),
                depends_on=mod.get("depends_on", []),
                description=mod.get("description", ""),
                estimated_types=len(mod.get("types", [])),
                target_loc_per_type=loc_target,
            ))

        self._log(f"PI-informed decomposition: {len(tasks)} modules "
                  f"(calibrated from {pi.project})")
        return tasks

    def _build_calibration_context(self, pi) -> str:
        """Build calibration context from ProjectIntelligence for the LLM."""
        lines = ["## Reference Calibration (for DEPTH, not for copying)\n"]

        # Identity
        lines.append(f"Reference: {pi.project} ({pi.domain}, {pi.language})")
        lines.append(f"Size: {pi.size_tier} | Maturity: {pi.maturity}")
        lines.append(f"Purpose: {pi.purpose}\n")

        # Metrics
        m = pi.metrics
        lines.append("### Scale")
        lines.append(f"- {m.glob.total_modules} modules, {m.glob.total_types} types, "
                     f"{m.glob.total_functions} functions")
        lines.append(f"- {m.glob.total_loc:,} total LOC")
        lines.append(f"- Avg {m.per_module.avg_loc:.0f} LOC/module "
                     f"(median {m.per_module.median_loc:.0f})")
        lines.append(f"- Avg {m.per_type.avg_methods:.1f} methods/type")
        lines.append(f"- {m.per_function.async_ratio:.0%} async functions\n")

        # Quality targets
        q = pi.quality
        lines.append("### Depth Calibration")
        lines.append(f"- LOC/type: p25={q.loc_per_type.p25:.0f}, "
                     f"median={q.loc_per_type.median:.0f}, "
                     f"p75={q.loc_per_type.p75:.0f}")
        lines.append(f"- Methods/type: p25={q.methods_per_type.p25:.0f}, "
                     f"median={q.methods_per_type.median:.0f}, "
                     f"p75={q.methods_per_type.p75:.0f}")
        lines.append(f"- Error handling: {q.error_handling}\n")

        # Style
        s = pi.style
        lines.append("### Style Conventions")
        lines.append(f"- Naming: {s.naming.modules} modules, {s.naming.classes} classes, "
                     f"{s.naming.methods} methods")
        lines.append(f"- Error handling: {s.error_handling.strategy}"
                     + (", retry patterns" if s.error_handling.retry_pattern else "")
                     + (", custom exceptions" if s.error_handling.custom_exceptions else ""))
        lines.append(f"- Async: {s.async_style.style}")
        lines.append(f"- Typing: {s.typing.strictness}")
        lines.append(f"- Organization: {s.organization.file_per_class} file-per-class\n")

        # Applicable patterns
        if pi.patterns:
            lines.append("### Patterns (apply YOUR version if relevant to goal)")
            for p in pi.patterns:
                lines.append(f"- **{p.name}**: {p.what}")
                lines.append(f"  Algorithm: {p.how}")
                lines.append(f"  Reusable when: {p.reusable_when}")
            lines.append("")

        # Key features as inspiration
        if pi.features:
            lines.append("### Features (for inspiration, not copying)")
            for f in pi.features[:6]:
                lines.append(f"- {f.name}: {f.description} "
                             f"[{f.complexity}, {f.loc} LOC]")
            lines.append("")

        # Dependency graph style
        dg = pi.dependency_graph
        if dg.layers:
            lines.append("### Architecture Style")
            lines.append(f"- Style: {dg.style} | Coupling: {dg.coupling}")
            lines.append(f"- Layers: {' → '.join('[' + ', '.join(l) + ']' for l in dg.layers)}")
            lines.append("")

        return "\n".join(lines)

    # ── Existing paths ───────────────────────────────────────

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
            "- Each module: 2-4 types (classes + interfaces). STRICT LIMIT.\n"
            "- For each module, include BOTH concrete classes AND their interfaces.\n"
            "  Example: module 'store' → types: ['IRepository', 'FileStore']\n"
            "  Example: module 'engine' → types: ['IGameEngine', 'GameEngine']\n"
            "- Every class that other modules depend on MUST have an interface (prefix I).\n"
            "- Order by dependency: foundations first, no circular deps\n"
            "- Be specific about type names\n"
            "- If the project is conceptually simple (few files, minimal architecture), "
            "use FEWER modules (3-4), not more.\n"
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
