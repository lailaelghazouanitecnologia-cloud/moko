"""
DevSupervisor — iterative development orchestrator with Blueprint Pipeline.

Architecture: Each block is SELF-CONTAINED. No context accumulation.

  - ANALYZE blocks: Load Roska descriptors → LLM generates Blueprint YAML → write to disk
  - IMPLEMENT blocks: Load blueprint + refs from disk → LLM translates ONE type → write code to disk
  - TEST blocks: Load code + blueprint from disk → LLM generates tests
  - Each block reads fresh from disk, does one LLM call, writes result, discards context
  - This means infinite scalability: 50, 100, 500 blocks — context never grows

Flow:
  1. create_plan: LLM identifies modules → generates granular blocks (1 per type)
  2. For each block:
     a. Read inputs from disk (blueprint YAML + Roska descriptors)
     b. One LLM call (clean context each time)
     c. Write output to disk (blueprint YAML or source code)
     d. Update plan chain (hash linking)
     e. Discard all context → next block starts clean
  3. Final summary with chain integrity verified
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Optional

from ..llm.providers import LLMProvider, LLMMessage
from .. import OUT_DIR

from .plan import (
    Plan, Block, BlockType, BlockStatus, Stance,
    Discussion, DiscussionPoint, RegisteredInsight,
    AbstractionResult, FeatureDecision,
)
from .vm import BlockVM
from .blueprint import ModuleBlueprint, TypeBlueprint
from .translator import BlueprintTranslator
from .emission import EmissionIndex
from .density import DensityAnalyzer
from ..engines.blueprint.composer import BlueprintComposer
from ..engines.blueprint.extractor import SourceExtractor
from ..engines.blueprint.project import ProjectBlueprint, game_engine_project
from ..engines.embedding.store import SemanticStore
from ..engines.memory.block_store import CodeBlockStore
from .compaction import build_prior_layers_context


def _available_projects() -> list[str]:
    projects = []
    if OUT_DIR.is_dir():
        for d in sorted(OUT_DIR.iterdir()):
            if d.is_dir() and not d.name.startswith("."):
                projects.append(d.name)
    return projects


def _parse_json_response(text: str) -> dict | list:
    """Extract JSON from LLM response, handling markdown code blocks."""
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


class DevSupervisor:
    """Orchestrates iterative development with plan-based execution."""

    def __init__(self, config: dict = None):
        config = config or {}
        self.llm = LLMProvider(
            provider=config.get("provider", "groq"),
            model=config.get("model"),
        )
        self.verbose = config.get("verbose", False)
        self.plans_dir = OUT_DIR / ".plans"
        self.plans_dir.mkdir(parents=True, exist_ok=True)
        self.budget_chars = config.get("budget_chars", 20000)
        self.projects_dir = Path("projects")

        self.current_plan: Optional[Plan] = None
        self.vm: Optional[BlockVM] = None
        self.translator: Optional[BlueprintTranslator] = None
        self.emission_index: Optional[EmissionIndex] = None
        self.composer: Optional[BlueprintComposer] = None
        self.semantic_store: Optional[SemanticStore] = None
        self.block_store: Optional[CodeBlockStore] = None
        self.project_bp: Optional[ProjectBlueprint] = None
        self.context_engine = None  # Optional ContextEngine
        self.total_tokens = 0

        # Guardrails
        from .guardrails import RunGuard, RunLimits
        self.guard = config.get("_guard") or RunGuard(RunLimits.from_config(config))

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [dev] {msg}")

    def _init_engines(self, references: list[str] = None):
        """Initialize composition engines: semantic store, block store, extractor, composer."""
        references = references or []

        # Semantic store: index all descriptors for semantic search
        store_path = OUT_DIR / ".semantic_store.json"
        if store_path.exists():
            try:
                self.semantic_store = SemanticStore.load(store_path)
                self._log(f"semantic store loaded: {self.semantic_store.format_stats()}")
            except Exception:
                self.semantic_store = None

        if not self.semantic_store and references:
            self.semantic_store = SemanticStore()
            import yaml
            for proj in references:
                proj_dir = OUT_DIR / proj
                if not proj_dir.is_dir():
                    continue
                for yaml_path in proj_dir.rglob("*.yaml"):
                    if yaml_path.name in ("workspace.yaml", "deps.yaml", "meta.yaml"):
                        continue
                    try:
                        text = yaml_path.read_text()
                        lines = [l for l in text.split("\n") if not l.startswith("##")]
                        data = yaml.safe_load("\n".join(lines))
                        if data and isinstance(data, dict):
                            rel_path = str(yaml_path.relative_to(OUT_DIR))
                            self.semantic_store.index_descriptor(rel_path, data)
                    except Exception:
                        continue
            self.semantic_store.save(store_path)
            self._log(f"semantic store built: {self.semantic_store.format_stats()}")

        # Block store: persistent code block memory
        block_store_path = OUT_DIR / ".block_store.json"
        if block_store_path.exists():
            try:
                self.block_store = CodeBlockStore.load(block_store_path)
                self._log(f"block store loaded: {self.block_store.format_stats()}")
            except Exception:
                self.block_store = CodeBlockStore()
        else:
            self.block_store = CodeBlockStore()

        # Source extractor
        extractor = SourceExtractor(OUT_DIR, verbose=self.verbose)

        # Blueprint composer: orchestrates all engines
        self.composer = BlueprintComposer(
            llm=self.llm,
            emission_index=self.emission_index,
            extractor=extractor,
            semantic_store=self.semantic_store,
            block_store=self.block_store,
            verbose=self.verbose,
        )

        # Context engine: real-time project index for richer snapshots
        try:
            from ..engines.context import ContextEngine
            target = getattr(self, '_current_target', None)
            if target:
                project_dir = self.projects_dir / target
                src_dir = project_dir / "src"
                if src_dir.exists():
                    self.context_engine = ContextEngine(src_dir)
                    self.context_engine.init(project_dir)
                    self._log(f"context engine initialized: {self.context_engine.index.file_count()} files")
        except Exception as e:
            self._log(f"context engine skipped: {e}")

        self._log("engines initialized: composer + extractor + semantic + memory")

    def _save_engines(self):
        """Persist engine state to disk."""
        if self.semantic_store:
            self.semantic_store.save(OUT_DIR / ".semantic_store.json")
        if self.block_store:
            self.block_store.save(OUT_DIR / ".block_store.json")

    def _llm_call(self, system: str, user: str,
                  temperature: float = 0.3, max_tokens: int = 4096) -> tuple[str, int]:
        """Make an LLM call and track tokens. Enforces guardrails."""
        self.guard.throttle()
        self.guard.check_time()
        resp = self.llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", user)],
            temperature=temperature, max_tokens=max_tokens,
        )
        tokens = resp.usage.total_tokens
        self.total_tokens += tokens
        self.guard.record_tokens(tokens)

        # Loop detection: hash output to catch LLM repeating itself
        import hashlib
        out_hash = hashlib.md5(resp.content[:200].encode()).hexdigest()
        if self.guard.check_output_loop(out_hash):
            from .guardrails import GuardrailTripped
            raise GuardrailTripped("output_loop",
                                   "LLM producing identical output repeatedly")

        return resp.content, tokens

    # ── Plan Generation ─────────────────────────────────────────

    def create_plan(self, goal: str, target: str,
                    references: list[str] = None,
                    project_bp: ProjectBlueprint = None) -> Plan:
        """Generate a layered plan from ProjectBlueprint or LLM.

        With ProjectBlueprint: deterministic layers with dependency ordering.
        Without: falls back to LLM-based module identification.
        """
        references = references or []

        # Build or load emission index
        index_path = OUT_DIR / ".emission_index.json"
        if index_path.exists():
            try:
                self.emission_index = EmissionIndex.load(index_path, OUT_DIR)
                if not self.emission_index.is_fresh():
                    raise ValueError("stale")
                self._log(f"emission index loaded: {self.emission_index.format_stats()}")
            except Exception:
                self.emission_index = None

        if not self.emission_index and references:
            self.emission_index = EmissionIndex(OUT_DIR)
            all_projects = references + _available_projects()
            seen = set()
            unique = [p for p in all_projects if p not in seen and not seen.add(p)]
            self.emission_index.build(unique)
            self.emission_index.save(index_path)
            self._log(f"emission index built: {self.emission_index.format_stats()}")

        # Initialize engines
        self._init_engines(references)

        # Initialize translator with emission index + semantic store
        self.translator = BlueprintTranslator(
            self.llm, OUT_DIR, verbose=self.verbose,
            emission_index=self.emission_index
        )
        if self.semantic_store:
            self.translator.semantic_store = self.semantic_store

        # Use ProjectBlueprint if provided, else fallback to LLM planning
        if project_bp:
            return self._create_layered_plan(goal, target, references, project_bp)
        else:
            return self._create_llm_plan(goal, target, references)

    def _create_layered_plan(self, goal: str, target: str,
                             references: list[str],
                             project_bp: ProjectBlueprint) -> Plan:
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
        project_dir = self.projects_dir / target
        project_dir.mkdir(parents=True, exist_ok=True)
        project_bp.save(project_dir / "project.bp.yaml")

        self.current_plan = plan
        self.project_bp = project_bp
        self.vm = BlockVM(plan, budget_chars=self.budget_chars)
        self._log(f"layered plan: {len(plan.blocks)} blocks, "
                  f"{len(project_bp.layers)} layers, "
                  f"{project_bp.total_types} types")
        return plan

    def _create_llm_plan(self, goal: str, target: str,
                         references: list[str]) -> Plan:
        """Fallback: LLM identifies modules (old behavior)."""
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
            "IMPORTANT RULES:\n"
            "- Create 3-6 modules that cover the full architecture\n"
            "- Each module should have 2-6 types (classes/interfaces/enums)\n"
            "- Be specific about type names (e.g. RegisterBank, InstructionDecoder, ALU)\n"
            "- Order modules by dependency (foundations first)\n"
            "- NEVER create a single 'Main' or 'core' module — decompose properly\n"
            "- Reference descriptors should be paths to Roska YAML files\n\n"
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
        content, tokens = self._llm_call(system, user, temperature=0.4, max_tokens=2048)

        plan = Plan(goal=goal, target_project=target, reference_projects=references)

        try:
            modules_data = _parse_json_response(content)
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

        self.current_plan = plan
        self.project_bp = None
        self.vm = BlockVM(plan, budget_chars=self.budget_chars)
        self._log(f"plan created: {len(plan.blocks)} blocks "
                  f"({len(modules_data)} modules)")
        return plan

    # ── Discussion System ───────────────────────────────────────

    def run_discussion(self, block: Block, topic: str,
                       reference_project: str,
                       stances: list[Stance] = None) -> Discussion:
        """Run a structured debate about a topic within a block.

        Cycles through stances (advocate → critic → pragmatist → architect),
        each loading context on-demand as needed.
        """
        stances = stances or [Stance.ADVOCATE, Stance.CRITIC, Stance.PRAGMATIST]
        discussion = Discussion(topic=topic)

        self._log(f"discussion: '{topic}' ({len(stances)} stances)")

        # Extract keywords from topic for on-demand loading
        keywords = [w for w in topic.lower().split() if len(w) > 3]

        # Load relevant context on-demand via VM
        loaded_context = ""
        if self.vm:
            loaded = self.vm.load_by_relevance(reference_project, keywords, max_files=5)
            if loaded:
                loaded_context = "\n\n".join(
                    f"# {path}\n{content}" for path, content in loaded
                )
                self._log(f"  loaded {len(loaded)} descriptors on-demand "
                          f"({self.vm.budget.utilization:.0%} budget)")

        # Accumulate arguments across stances
        prev_arguments = []

        for stance in stances:
            system = self._stance_system_prompt(stance)
            user = (
                f"Topic: {topic}\n"
                f"Reference project: {reference_project}\n"
                f"Block objective: {block.objective}\n"
            )
            if loaded_context:
                user += f"\nReference code (loaded on-demand):\n{loaded_context[:4000]}\n"
            if prev_arguments:
                user += f"\nPrevious arguments in this discussion:\n"
                for prev in prev_arguments:
                    user += f"  [{prev.stance.value}]: {prev.argument[:200]}\n"

            user += (
                "\nRespond with JSON: {\"argument\": \"...\", \"conclusion\": "
                "\"adopt|reject|adapt|needs_more_info\", \"confidence\": 0.0-1.0, "
                "\"key_insight\": \"...\"}"
            )

            content, tokens = self._llm_call(system, user, max_tokens=1024)

            try:
                data = _parse_json_response(content)
            except (json.JSONDecodeError, IndexError):
                data = {
                    "argument": content[:500],
                    "conclusion": "needs_more_info",
                    "confidence": 0.3,
                    "key_insight": "",
                }

            point = DiscussionPoint(
                stance=stance,
                topic=topic,
                reference=reference_project,
                argument=data.get("argument", ""),
                conclusion=data.get("conclusion", "needs_more_info"),
                confidence=data.get("confidence", 0.5),
                tokens_used=tokens,
                context_loaded=[p for p, _ in (loaded if self.vm else [])],
            )
            discussion.points.append(point)
            prev_arguments.append(point)

            # If key insight found, register it
            insight = data.get("key_insight", "")
            if insight and self.vm:
                self.vm.register(insight, reference_project, "pattern",
                                 relevance=point.confidence)

        # Derive consensus from points
        conclusions = [p.conclusion for p in discussion.points]
        if conclusions.count("adopt") > len(conclusions) / 2:
            discussion.consensus = "adopt"
        elif conclusions.count("reject") > len(conclusions) / 2:
            discussion.consensus = "reject"
        else:
            discussion.consensus = "adapt"

        # Extract value generated
        discussion.value_generated = [
            p.argument[:100] for p in discussion.points
            if p.confidence >= 0.6
        ]

        block.discussions.append(discussion)
        return discussion

    def _stance_system_prompt(self, stance: Stance) -> str:
        """Generate system prompt for a specific debate stance."""
        prompts = {
            Stance.ADVOCATE: (
                "You are the ADVOCATE. Argue FOR adopting this pattern/feature.\n"
                "Find strengths, benefits, real-world advantages.\n"
                "Reference specific code patterns from the reference project.\n"
                "Be specific about what makes this valuable."
            ),
            Stance.CRITIC: (
                "You are the CRITIC. Argue AGAINST adopting this pattern/feature.\n"
                "Find weaknesses, over-engineering, unnecessary complexity.\n"
                "Question whether the value justifies the effort.\n"
                "Is there a simpler alternative?"
            ),
            Stance.PRAGMATIST: (
                "You are the PRAGMATIST. Evaluate effort vs value realistically.\n"
                "Consider: implementation time, maintenance burden, learning curve.\n"
                "If something is useful but heavy, suggest a lighter adaptation.\n"
                "Focus on what's practical for the current goal."
            ),
            Stance.ARCHITECT: (
                "You are the ARCHITECT. Consider long-term design implications.\n"
                "Will this pattern scale? Does it create coupling?\n"
                "How does it fit with existing abstractions?\n"
                "Consider the system as a whole, not just this feature."
            ),
        }
        return prompts.get(stance, prompts[Stance.PRAGMATIST])

    # ── Block Execution (with discussions) ──────────────────────

    def execute_block(self, block: Block) -> Block:
        """Execute a single block using VM for context and discussions for data."""
        block.start()
        block_id = f"block_{block.index}"
        self.guard.record_block_start(block_id)
        self._log(f"block {block.index} [{block.block_type.value}]: {block.objective[:50]}...")

        # 1. VM navigates to this block
        if self.vm:
            self.vm.goto(block.index)

        # 2. Build context (on-demand via VM)
        history = self._build_history_context()
        ref_context = self._load_on_demand_context(block)
        registry_context = ""
        if self.vm:
            registry_context = self.vm.get_registry_context(max_chars=3000)

        # 3. Run discussions only for analyze blocks WITH relevant emission data
        discussion_insights = ""
        if block.block_type == BlockType.ANALYZE and self.current_plan:
            # Skip discussions for layered plans when no emission sources exist
            mod_name = block.meta.get("module", "")
            has_relevant_refs = True
            if self.project_bp and self.emission_index and mod_name:
                from .blueprint import TypeBlueprint as _TB
                type_names = block.meta.get("types", [])
                has_relevant_refs = any(
                    self.emission_index.query(_TB(name=tn), max_results=1)
                    for tn in type_names[:3]  # check first 3 types
                )
            if has_relevant_refs:
                discussion_insights = self._run_block_discussions(block)
            else:
                self._log(f"skipping discussion for {mod_name}: no emission refs")

        # 4. Dispatch by type
        handlers = {
            BlockType.ANALYZE: self._exec_analyze,
            BlockType.IMPLEMENT: self._exec_implement,
            BlockType.TEST: self._exec_test,
            BlockType.REFACTOR: self._exec_refactor,
            BlockType.REVIEW: self._exec_review,
        }
        handler = handlers.get(block.block_type, self._exec_implement)
        result = handler(block, history, ref_context, registry_context, discussion_insights)

        # Find previous completed block for chain linking
        prev_block = None
        completed = self.current_plan.completed_blocks if self.current_plan else []
        if completed:
            prev_block = completed[-1]

        block.complete(
            output=result["content"],
            files_changed=result.get("files_changed", []),
            tokens_used=result.get("tokens_used", 0),
            test_results=result.get("test_results", {}),
            prev_block=prev_block,
        )
        # Track references used and quality score from emission/density
        if result.get("refs_used"):
            block.references_used = result["refs_used"]
        if result.get("quality_score"):
            block.quality_score = result["quality_score"]
        self.total_tokens += result.get("tokens_used", 0)

        self.guard.record_block_done(block_id)
        self._log(f"block {block.index} done in {block.elapsed_s:.1f}s [{block.hash[:8]}]")
        return block

    def _run_block_discussions(self, block: Block) -> str:
        """Run ONE discussion per block (1 ref, 2 stances) to save API calls."""
        if not self.current_plan or not self.current_plan.reference_projects:
            return ""

        topic = block.objective[:100]

        insights = []
        # Only debate against the most relevant reference (first one)
        ref_proj = self.current_plan.reference_projects[0]
        disc = self.run_discussion(
            block, topic, ref_proj,
            stances=[Stance.ADVOCATE, Stance.PRAGMATIST],  # 2 stances, not 3
        )
        if disc.value_generated:
            insights.extend(disc.value_generated)

        if not insights:
            return ""

        return "Discussion insights:\n" + "\n".join(f"- {i}" for i in insights[:5])

    def _load_on_demand_context(self, block: Block) -> str:
        """Load references on-demand via VM, not all at once."""
        if not self.vm or not self.current_plan:
            return ""

        parts = []
        keywords = [w for w in block.objective.lower().split() if len(w) > 3]

        for proj in self.current_plan.reference_projects:
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

    # ── Execution Handlers (Blueprint Pipeline) ──────────────────

    def _build_prior_layers_context(self, block_meta: dict) -> str:
        """Build compact context from already-translated prior layers.

        Two strategies:
        1. If "requires" is specified: load only those modules (layered plan)
        2. If "requires" is missing: load ALL translated modules except current
           (fallback LLM plan — infer dependencies from what exists on disk)
        """
        if not self.current_plan:
            return ""

        target = self.current_plan.target_project
        project_dir = self.projects_dir / target
        bp_dir = project_dir / "blueprints"

        if not bp_dir.exists():
            return ""

        current_module = block_meta.get("module", "")
        requires = block_meta.get("requires", [])

        prior_bps = []
        if requires:
            # Layered plan: explicit dependencies
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
            # Fallback: load ALL translated modules except current
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

    def _exec_analyze(self, block, history, ref_context, registry, discussions) -> dict:
        """Analyze block → generate a ModuleBlueprint YAML and write to disk."""
        meta = block.meta
        bp_path = meta.get("output_blueprint", "")
        refs = meta.get("refs", [])
        mod_name = meta.get("module", "core")
        types = meta.get("types", [])
        layer_desc = meta.get("layer_description", "")

        if not self.translator or not self.current_plan:
            return {"content": "ERROR: no translator", "tokens_used": 0}

        target = self.current_plan.target_project
        project_dir = self.projects_dir / target

        # Incremental: skip if blueprint already exists with all types
        full_bp_path_check = project_dir / bp_path
        if full_bp_path_check.exists():
            try:
                existing_bp = ModuleBlueprint.load(full_bp_path_check)
                if all(existing_bp.get_type(tn) for tn in types):
                    self._log(f"incremental: skipping analyze for {mod_name} (blueprint exists)")
                    return {
                        "content": existing_bp.format_summary(),
                        "tokens_used": 0,
                        "files_changed": [bp_path],
                    }
            except Exception:
                pass

        # Build prior layers context for this layer
        prior_ctx = self._build_prior_layers_context(meta)

        goal = f"Module '{mod_name}' with types: {', '.join(types)}."
        if layer_desc:
            goal += f" {layer_desc}."
        goal += f" Part of: {self.current_plan.goal}"
        if prior_ctx:
            goal += f"\n\n{prior_ctx}"

        # Use composer only if emission has relevant sources for this module
        # Otherwise go straight to translator (cheaper, better for types without refs)
        tokens = 0
        use_composer = False
        if self.composer and types and self.emission_index:
            # Check if emission has sources for ANY type in this module
            from .blueprint import TypeBlueprint as _TB
            for type_name in types:
                matches = self.emission_index.query(_TB(name=type_name), max_results=1)
                if matches and matches[0].score >= 2.0:
                    use_composer = True
                    break
            if not use_composer:
                self._log(f"skipping composer for {mod_name}: no relevant extraction sources")

        if use_composer:
            self._log(f"composing {mod_name} via BlueprintComposer")
            bp = self.composer.compose_module(
                module_name=mod_name,
                type_names=types,
                goal=goal,
                language="typescript",
                target_dir=f"src/{mod_name}",
            )
            tokens = self.composer.total_tokens
        else:
            bp, tokens = self.translator.generate_blueprint(
                module_name=mod_name,
                goal=goal,
                ref_paths=refs,
                language="typescript",
                target_dir=f"src/{mod_name}",
            )

        # Ensure types from plan are in the blueprint
        from .translator import to_kebab_case
        for type_name in types:
            if not bp.get_type(type_name):
                bp.types.append(TypeBlueprint(
                    name=type_name,
                    target_file=f"src/{mod_name}/{to_kebab_case(type_name)}.ts",
                    references=refs,
                ))

        # Normalize all target_file to kebab-case
        for t in bp.types:
            t.target_file = f"src/{mod_name}/{to_kebab_case(t.name)}.ts"

        # Generate inter-type contracts from dependency graph
        from .compaction import generate_contracts, topo_sort_types
        contracts = generate_contracts(bp)

        # Cross-module contracts: bind types that reference external modules
        bp_dir = project_dir / "blueprints"
        if bp_dir.exists():
            from .compaction import _extract_type_references
            prior_type_map: dict[str, tuple[str, "TypeBlueprint"]] = {}
            for bp_file in sorted(bp_dir.glob("*.bp.yaml")):
                try:
                    prior_bp = ModuleBlueprint.load(bp_file)
                    if prior_bp.name == mod_name:
                        continue
                    for pt in prior_bp.types:
                        prior_type_map[pt.name] = (prior_bp.name, pt)
                except Exception:
                    pass

            for t in bp.types:
                refs = _extract_type_references(t)
                for ref_name in sorted(refs):
                    if ref_name in prior_type_map:
                        ext_mod, ext_type = prior_type_map[ref_name]
                        # Build cross-module contract
                        if ext_type.kind == "enum":
                            values = [f.name for f in ext_type.fields[:8]]
                            if values:
                                contracts.append(
                                    f"{t.name} uses {ref_name} from {ext_mod} "
                                    f"[enum] values: {', '.join(values)}"
                                )
                        elif ext_type.methods:
                            api = ", ".join(
                                m.name + (m.sig or "") for m in ext_type.methods[:5]
                            )
                            contracts.append(
                                f"{t.name} uses {ref_name} from {ext_mod} "
                                f"[{ext_type.kind}] — import from '../{ext_mod}', "
                                f"API: {api}"
                            )
                        elif ext_type.fields:
                            fields = ", ".join(
                                f"{f.name}: {f.type}" for f in ext_type.fields[:5]
                            )
                            contracts.append(
                                f"{t.name} uses {ref_name} from {ext_mod} "
                                f"[{ext_type.kind}] — fields: {fields}"
                            )

        if contracts:
            # Store contracts as constraints prefixed with "CONTRACT:"
            for c in contracts:
                tagged = f"CONTRACT: {c}"
                if tagged not in bp.constraints:
                    bp.constraints.append(tagged)
            self._log(f"contracts: {len(contracts)} inter-type rules generated")

        # Log topo phases for visibility
        phases = topo_sort_types(bp)
        if len(phases) > 1:
            phase_strs = []
            for i, phase in enumerate(phases):
                names = [t.name for t in phase]
                phase_strs.append(f"P{i}=[{','.join(names)}]")
            self._log(f"topo phases: {' → '.join(phase_strs)}")

        # Save blueprint to disk
        full_bp_path = project_dir / bp_path
        bp.save(full_bp_path)
        self._log(f"blueprint saved: {bp_path} ({len(bp.types)} types)")

        content = bp.format_summary()
        return {
            "content": content,
            "tokens_used": tokens,
            "files_changed": [bp_path],
        }

    def _exec_implement(self, block, history, ref_context, registry, discussions) -> dict:
        """Implement block → translate ONE type from blueprint to code."""
        meta = block.meta
        bp_path = meta.get("blueprint", "")
        type_name = meta.get("type", "")
        mod_name = meta.get("module", "")

        if not self.translator or not self.current_plan:
            return {"content": "ERROR: no translator", "tokens_used": 0}

        target = self.current_plan.target_project
        project_dir = self.projects_dir / target
        full_bp_path = project_dir / bp_path

        # Inject prior layers context into translator for this block
        prior_ctx = self._build_prior_layers_context(meta)
        self.translator.prior_layers_context = prior_ctx

        # Load prior modules for import map
        requires = meta.get("requires", [])
        prior_modules = []
        bp_dir = project_dir / "blueprints"
        if requires:
            # Layered plan: explicit dependencies
            for req_name in requires:
                bp_file = bp_dir / f"{req_name}.bp.yaml"
                if bp_file.exists():
                    try:
                        prior_modules.append(ModuleBlueprint.load(bp_file))
                    except Exception:
                        pass
        elif bp_dir.exists():
            # Fallback: load ALL other translated modules for cross-module imports
            for bp_file in sorted(bp_dir.glob("*.bp.yaml")):
                try:
                    bp_mod = ModuleBlueprint.load(bp_file)
                    if bp_mod.name != mod_name and bp_mod.translated_types:
                        prior_modules.append(bp_mod)
                except Exception:
                    pass
        self.translator.prior_modules = prior_modules

        # Load blueprint from disk (fresh each time)
        try:
            bp = ModuleBlueprint.load(full_bp_path)
        except Exception as e:
            return {"content": f"ERROR loading blueprint: {e}", "tokens_used": 0}

        # Handle __index__ special case
        if type_name == "__index__":
            index_path = self.translator.generate_index(bp, project_dir)
            return {
                "content": f"Generated index: {index_path}",
                "tokens_used": 0,
                "files_changed": [index_path],
            }

        # Find the type in the blueprint
        type_bp = bp.get_type(type_name)
        if not type_bp:
            return {
                "content": f"ERROR: type '{type_name}' not found in {bp_path}",
                "tokens_used": 0,
            }

        # Incremental: skip if code already exists and has reasonable size
        from .translator import to_kebab_case
        existing_path = project_dir / type_bp.target_file
        if existing_path.exists():
            existing_loc = len(existing_path.read_text().splitlines())
            if existing_loc >= 15:  # not a stub
                type_bp.status = "translated"
                bp.save(full_bp_path)
                self._log(f"incremental: skipping {type_name} ({existing_loc} LOC exists)")
                return {
                    "content": f"Skipped {type_name} (already exists: {existing_loc} LOC)",
                    "tokens_used": 0,
                    "files_changed": [type_bp.target_file],
                }

        # Translate this ONE type (self-contained LLM call)
        file_path, tokens, refs_used = self.translator.translate_type(
            type_bp, bp, project_dir
        )

        # Save updated blueprint (status: translated)
        bp.save(full_bp_path)

        # Compute density inline (cheap, regex-based, no LLM)
        density_score = 0.0
        try:
            analyzer = DensityAnalyzer(project_dir, OUT_DIR)
            emission_matches = None
            if self.emission_index:
                emission_matches = self.emission_index.query(type_bp, max_results=5)
            ds = analyzer.analyze_file(type_bp, bp, emission_matches)
            density_score = ds.density
            self._log(f"density: {ds.density:.0%} "
                      f"(bp={ds.methods_in_code}/{ds.methods_in_blueprint}, "
                      f"imports={ds.import_score:.0%})")
        except Exception:
            pass

        # Auto-fix imports using ProjectGraph + ImportResolver
        try:
            from ..engines.tool.graph import ProjectGraph
            from ..engines.tool.import_resolver import ImportResolver

            code_path = project_dir / file_path
            if code_path.exists():
                src_dir = project_dir / "src"
                if src_dir.exists():
                    graph = ProjectGraph(src_dir)
                    graph.scan()

                    # Resolve/fix imports
                    resolver = ImportResolver(graph)
                    generated_code = code_path.read_text()
                    rel_file = str(Path(file_path).relative_to("src"))
                    report = resolver.resolve(generated_code, rel_file)

                    if report.fixes:
                        code_path.write_text(report.code)
                        self._log(f"import-fix: {len(report.fixes)} imports corrected in {type_name}")
                        for fix in report.fixes[:3]:
                            self._log(f"  {fix.reason}")

                    # Validate: prefer context engine, fallback to PostGenValidator
                    code_to_check = report.code if report.fixes else generated_code
                    if self.context_engine and self.context_engine.is_initialized:
                        val_result = self.context_engine.validate(code_to_check, rel_file)
                        if not val_result.ok:
                            self._log(f"validation: {val_result.summary()} in {type_name}")
                            for issue in val_result.issues[:5]:
                                self._log(f"  {issue.kind}: {issue.message}")
                    else:
                        from ..engines.tool.validator import PostGenValidator
                        validator = PostGenValidator(graph)
                        val_result = validator.validate(code_to_check, rel_file)
                        if not val_result.is_clean:
                            self._log(f"validation: {len(val_result.issues)} issues in {type_name}")
                            for issue in val_result.issues[:5]:
                                self._log(f"  {issue.kind}: {issue.message}")
        except Exception as e:
            self._log(f"import-fix: skipped ({e})")

        # Validate imports and enums in generated code (legacy validator)
        validation_issues = []
        try:
            from .compaction import validate_imports, validate_enums
            code_path = project_dir / file_path
            if code_path.exists():
                generated_code = code_path.read_text()
                mod_dir = str(Path(file_path).parent)
                validation_issues += validate_imports(generated_code, project_dir, mod_dir)
                validation_issues += validate_enums(generated_code)
                if validation_issues:
                    self._log(f"validation: {len(validation_issues)} issues in {type_name}")
                    for issue in validation_issues[:5]:
                        self._log(f"  {issue}")
        except Exception:
            pass

        content = f"Translated {type_name} → {file_path} (density={density_score:.0%})"
        if validation_issues:
            content += f" [{len(validation_issues)} validation issues]"
        return {
            "content": content,
            "tokens_used": tokens,
            "files_changed": [file_path],
            "refs_used": refs_used,
            "quality_score": density_score,
            "validation_issues": validation_issues,
        }

    def _exec_test(self, block, history, ref_context, registry, discussions) -> dict:
        """Test block → verify code against blueprints."""
        if not self.current_plan:
            return {"content": "ERROR: no plan", "tokens_used": 0}

        target = self.current_plan.target_project
        project_dir = self.projects_dir / target
        bp_dir = project_dir / "blueprints"

        # Load all blueprints and check status
        report_parts = []
        total_types = 0
        translated = 0

        if bp_dir.exists():
            for bp_file in sorted(bp_dir.glob("*.bp.yaml")):
                try:
                    bp = ModuleBlueprint.load(bp_file)
                    for t in bp.types:
                        total_types += 1
                        if t.status == "translated":
                            translated += 1
                            # Check file exists
                            code_path = project_dir / t.target_file
                            if code_path.exists():
                                loc = len(code_path.read_text().splitlines())
                                report_parts.append(
                                    f"  ✓ {t.name}: {t.target_file} ({loc} LOC)")
                            else:
                                report_parts.append(
                                    f"  ✗ {t.name}: {t.target_file} MISSING")
                        else:
                            report_parts.append(
                                f"  ○ {t.name}: {t.status}")
                except Exception as e:
                    report_parts.append(f"  ERROR: {bp_file.name}: {e}")

        # Generate root index.ts and project config
        files_changed = []
        if self.translator and bp_dir.exists():
            module_names = sorted(
                bp_file.stem.replace(".bp", "")
                for bp_file in bp_dir.glob("*.bp.yaml")
            )
            if module_names:
                root_idx = self.translator.generate_root_index(module_names, project_dir)
                files_changed.append(root_idx)
                report_parts.append(f"\n  Generated root index: {root_idx}")

                # Generate tsconfig.json + package.json
                config_files = self.translator.generate_project_config(
                    target, module_names, project_dir
                )
                files_changed.extend(config_files)
                report_parts.append(f"  Generated project config: {', '.join(config_files)}")

        # Run tsc --noEmit if tsconfig exists
        tsconfig_path = project_dir / "tsconfig.json"
        if tsconfig_path.exists():
            import subprocess
            try:
                result = subprocess.run(
                    ["npx", "tsc", "--noEmit", "--pretty"],
                    cwd=str(project_dir),
                    capture_output=True, text=True, timeout=60,
                )
                if result.returncode == 0:
                    report_parts.append(f"\n  tsc --noEmit: PASS (0 errors)")
                else:
                    errors = result.stdout.strip() or result.stderr.strip()
                    error_count = errors.count("error TS")
                    report_parts.append(f"\n  tsc --noEmit: {error_count} errors")
                    # Show first 20 errors for context
                    for line in errors.splitlines()[:20]:
                        report_parts.append(f"    {line}")
            except (FileNotFoundError, subprocess.TimeoutExpired):
                report_parts.append(f"\n  tsc --noEmit: skipped (tsc not available)")

        # Density analysis
        density_parts = []
        try:
            analyzer = DensityAnalyzer(project_dir, OUT_DIR)
            densities = analyzer.analyze_project(bp_dir)
            for mod_d in densities:
                density_parts.append(f"\n  Density — {mod_d.format()}")
        except Exception:
            pass

        content = (
            f"Verification: {translated}/{total_types} types translated\n"
            + "\n".join(report_parts)
            + ("\n" + "\n".join(density_parts) if density_parts else "")
        )
        return {
            "content": content,
            "tokens_used": 0,
            "test_results": {"total": total_types, "translated": translated},
            "files_changed": files_changed,
        }

    def _exec_refactor(self, block, history, ref_context, registry, discussions) -> dict:
        system = (
            "You are refactoring code for quality.\n"
            "Simplify, remove duplication, improve naming.\n"
            "Do NOT add features. Only improve existing code."
        )
        user = self._build_user_prompt(block, history, ref_context, registry, discussions)
        content, tokens = self._llm_call(system, user, max_tokens=4096)
        return {"content": content, "tokens_used": tokens}

    def _exec_review(self, block, history, ref_context, registry, discussions) -> dict:
        system = (
            "You are reviewing code for quality and security.\n"
            "Check: security, quality, correctness, comparison with references.\n"
            "Rate overall quality 0-10. List specific issues."
        )
        user = self._build_user_prompt(block, history, ref_context, registry, discussions)
        content, tokens = self._llm_call(system, user, max_tokens=4096)
        return {"content": content, "tokens_used": tokens}

    def _build_user_prompt(self, block, history, ref_context, registry, discussions) -> str:
        """Assemble user prompt from all context sources."""
        parts = [f"Objective: {block.objective}"]
        if history:
            parts.append(f"Previous blocks:\n{history}")
        if registry:
            parts.append(f"Registered insights:\n{registry}")
        if discussions:
            parts.append(discussions)
        if ref_context:
            parts.append(f"Reference context (on-demand):\n{ref_context}")
        return "\n\n".join(parts)

    # ── Abstraction Process ─────────────────────────────────────

    def run_abstraction(self, block: Block) -> AbstractionResult:
        """Post-block abstraction: evaluate + decide what's next."""
        self._log(f"abstracting block {block.index}...")

        plan_status = self.current_plan.format_status() if self.current_plan else ""
        block_output = block.output[:4000]

        # Include discussion summaries in abstraction
        disc_summary = ""
        if block.discussions:
            disc_parts = []
            for d in block.discussions:
                disc_parts.append(f"Topic: {d.topic} → Consensus: {d.consensus}")
                for p in d.points:
                    disc_parts.append(f"  [{p.stance.value}] {p.conclusion} ({p.confidence:.0%})")
            disc_summary = "\n".join(disc_parts)

        # Include registry for cross-block awareness
        registry_summary = ""
        if self.vm and self.vm.registry:
            registry_summary = "\n".join(
                f"[{r.category}] {r.content[:80]} (relevance={r.relevance:.0%})"
                for r in self.vm.registry[-10:]
            )

        system = (
            "You are the abstraction engine. After each block, you:\n\n"
            "1. ACHIEVEMENTS: What was accomplished? (list)\n"
            "2. IMPROVEMENTS: What could be better? (list)\n"
            "3. FEATURE DECISIONS: For each feature from references:\n"
            "   {feature, source, value_score: 0-1, effort_score: 0-1, "
            "    verdict: adopt|adapt|skip|defer, reasoning}\n"
            "4. REGISTER: Insights worth saving for future blocks (list of strings)\n"
            "5. DISCARD: Things not worth keeping (list of strings)\n"
            "6. NEXT_PRIORITY: What should next block focus on?\n"
            "7. CONFIDENCE: 0-1 overall progress confidence\n\n"
            "Be ruthless: value < 0.5 = skip. value >= 0.7 & effort <= 0.5 = adopt.\n\n"
            "Output JSON with all keys above."
        )

        user = f"Block {block.index} [{block.block_type.value}]: {block.objective}\n\n"
        user += f"Output:\n{block_output}\n\n"
        if disc_summary:
            user += f"Discussions:\n{disc_summary}\n\n"
        if registry_summary:
            user += f"Registry so far:\n{registry_summary}\n\n"
        user += f"Plan:\n{plan_status}\n"

        content, tokens = self._llm_call(system, user, max_tokens=2048)

        try:
            data = _parse_json_response(content)
        except (json.JSONDecodeError, IndexError):
            data = {
                "achievements": ["Block completed"],
                "improvements": [],
                "feature_decisions": [],
                "register": [],
                "discard": [],
                "next_priority": "Continue",
                "confidence": 0.5,
            }

        # Build feature decisions
        feature_decisions = []
        for fd in data.get("feature_decisions", []):
            feature_decisions.append(FeatureDecision(
                feature=fd.get("feature", ""),
                source=fd.get("source", ""),
                value_score=fd.get("value_score", fd.get("value", 0.5)),
                effort_score=fd.get("effort_score", fd.get("effort", 0.5)),
                verdict=fd.get("verdict", "skip"),
                reasoning=fd.get("reasoning", ""),
            ))

        result = AbstractionResult(
            block_hash=block.hash,
            achievements=data.get("achievements", []),
            improvements=data.get("improvements", []),
            feature_decisions=feature_decisions,
            next_priority=data.get("next_priority", ""),
            confidence=data.get("confidence", 0.5),
        )
        block.abstraction = result

        # Process register/discard via VM
        if self.vm:
            for insight in data.get("register", []):
                self.vm.register(insight, f"block_{block.index}", "abstraction")
            for item in data.get("discard", []):
                self.vm.discard(item)

        self._log(f"abstraction: {len(feature_decisions)} features, "
                  f"confidence={result.confidence:.0%}, "
                  f"+{len(data.get('register', []))} registered, "
                  f"-{len(data.get('discard', []))} discarded")
        return result

    def _collect_eval_proposals(self, block: Block):
        """Extract eval proposals from block discussions and save to eval.yaml."""
        from .discussion_proposals import (
            extract_proposals_from_discussion,
            extract_proposals_from_abstraction,
            proposals_to_eval_yaml,
        )

        module_name = block.meta.get("module", "")
        proposals = []

        # From discussions
        for disc in block.discussions:
            # Try to determine type name from block meta
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
        target = self.current_plan.target_project if self.current_plan else "unknown"
        project_dir = self.projects_dir / target
        eval_path = project_dir / "eval.yaml"

        import yaml
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

    def _collect_parallel_batch(self, plan: Plan) -> list:
        """Collect IMPLEMENT blocks from the same topo-phase for parallel exec.

        Uses the module blueprint's dependency graph to only parallelize types
        that don't depend on each other. Types that depend on others in the
        same module wait until their dependencies are translated.
        """
        first = plan.next_pending
        if not first or first.block_type != BlockType.IMPLEMENT:
            return [first]

        mod = first.meta.get("module", "")
        type_name = first.meta.get("type", "")
        # Don't parallelize __index__ blocks
        if type_name == "__index__":
            return [first]

        # Try to load the module blueprint for topo-sort
        bp_path = first.meta.get("blueprint", "")
        topo_phase_names = None
        if bp_path and self.current_plan:
            target = self.current_plan.target_project
            full_bp = self.projects_dir / target / bp_path
            if full_bp.exists():
                try:
                    from .compaction import topo_sort_types
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
        for b in plan.blocks:
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
            # No blueprint available yet, limit to 4 (old behavior)
            batch = all_pending[:4]

        # Cap at 4 parallel workers
        return batch[:4]

    # ── Full Iteration Loop ─────────────────────────────────────

    def run(self, goal: str, target: str, references: list[str] = None,
            max_iterations: int = 100,
            project_bp: ProjectBlueprint = None) -> Plan:
        """Full iterative development loop with blueprint pipeline.

        Each block is self-contained: reads from disk, does one LLM call,
        writes to disk, discards context. Scales to any number of blocks.
        """
        t0 = time.time()

        # Ensure project directory exists
        project_dir = self.projects_dir / target
        project_dir.mkdir(parents=True, exist_ok=True)
        (project_dir / "blueprints").mkdir(exist_ok=True)

        # 1. Create plan (layered if project_bp provided)
        plan = self.create_plan(goal, target, references, project_bp=project_bp)
        print(plan.format_status())

        # 2. Execute blocks (each self-contained, with parallelism for implement)
        iteration = 0
        crashed = False
        try:
            while plan.next_pending and iteration < max_iterations:
                self.guard.check_time()
                self.guard.check_plan_size(len(plan.blocks))
                self.guard.check_stale_blocks()
                # Collect batch of consecutive IMPLEMENT blocks from same module
                batch = self._collect_parallel_batch(plan)

                if len(batch) > 1:
                    # Parallel execution of independent implement blocks
                    iteration += len(batch)
                    mod_name = batch[0].meta.get("module", "?")
                    print(f"\n{'─' * 66}")
                    print(f"  [{iteration-len(batch)+1}-{iteration}/{len(plan.blocks)}] "
                          f"Parallel: {len(batch)} types in {mod_name}")
                    print(f"{'─' * 66}")

                    from concurrent.futures import ThreadPoolExecutor, as_completed
                    with ThreadPoolExecutor(max_workers=min(len(batch), 4)) as pool:
                        futures = {
                            pool.submit(self.execute_block, b): b for b in batch
                        }
                        for future in as_completed(futures):
                            b = futures[future]
                            try:
                                future.result()
                                for f in b.files_changed:
                                    print(f"  → {f}")
                            except Exception as e:
                                print(f"  ✗ {b.meta.get('type', '?')}: {e}")
                                b.fail(str(e))

                    # Re-link hash chain sequentially after parallel completion
                    for i, b in enumerate(batch):
                        if i == 0:
                            # Link to block before the batch
                            prev_idx = b.index - 1
                            if prev_idx >= 0:
                                b.prev_hash = plan.blocks[prev_idx].hash
                        else:
                            b.prev_hash = batch[i - 1].hash
                        b.compute_hash()
                else:
                    block = batch[0]
                    iteration += 1

                    print(f"\n{'─' * 66}")
                    print(f"  [{iteration}/{len(plan.blocks)}] Block {block.index} "
                          f"[{block.block_type.value}]")
                    print(f"  {block.objective}")
                    if block.meta:
                        meta_info = {k: v for k, v in block.meta.items()
                                     if k in ("type", "module", "blueprint")}
                        if meta_info:
                            print(f"  meta: {meta_info}")
                    print(f"{'─' * 66}")

                    # Execute (self-contained: disk → LLM → disk)
                    try:
                        self.execute_block(block)
                    except Exception as block_err:
                        from .guardrails import GuardrailTripped
                        if isinstance(block_err, GuardrailTripped):
                            raise  # Budget/time limits are fatal
                        # Non-fatal: mark block failed, continue pipeline
                        print(f"  ✗ Block {block.index} failed: {block_err}")
                        if block.status == BlockStatus.IN_PROGRESS:
                            block.fail(str(block_err))
                        # If analyze block failed, cascade-fail its dependent blocks
                        if block.block_type == BlockType.ANALYZE:
                            failed_mod = block.meta.get("module", "")
                            if failed_mod:
                                for dep in plan.blocks[block.index + 1:]:
                                    if dep.status != BlockStatus.PENDING:
                                        continue
                                    if dep.meta.get("module") == failed_mod:
                                        dep.fail(f"Skipped: analyze for {failed_mod} failed")
                                        print(f"  ✗ Block {dep.index} skipped (depends on failed analyze)")
                                    else:
                                        break  # Different module, stop cascading
                        continue

                    # Print result (compact for implement blocks)
                    if block.block_type == BlockType.IMPLEMENT:
                        for f in block.files_changed:
                            print(f"  → {f}")
                    elif block.block_type == BlockType.ANALYZE:
                        print(block.output)
                    else:
                        print(block.output[:2000])

                    # Run abstraction only for analyze blocks in non-layered plans
                    # Layered plans have fixed structure — abstraction can't change them
                    if block.block_type == BlockType.ANALYZE and not self.project_bp:
                        abstraction = self.run_abstraction(block)
                        print(f"  confidence: {abstraction.confidence:.0%}")
                        self._adjust_plan(block, abstraction)

                    # Collect eval proposals from discussions (any plan type)
                    if block.discussions:
                        self._collect_eval_proposals(block)

        except Exception as e:
            crashed = True
            from .guardrails import GuardrailTripped
            if isinstance(e, GuardrailTripped):
                print(f"\n  ⛔ {e}")
                self.guard.print_status()
            else:
                print(f"\n  ⚠ INTERRUPTED: {e}")
            if block and block.status == BlockStatus.IN_PROGRESS:
                block.fail(str(e))

        return self._finalize(plan, t0, crashed)

    def _continue_execution(self, plan: Plan) -> Plan:
        """Continue executing a resumed plan."""
        t0 = time.time()
        print(plan.format_status())

        iteration = 0
        crashed = False
        block = None
        try:
            while plan.next_pending and iteration < 100:
                block = plan.next_pending
                iteration += 1

                print(f"\n{'─' * 66}")
                print(f"  [{len(plan.completed_blocks)+1}/{len(plan.blocks)}] "
                      f"Block {block.index} [{block.block_type.value}]")
                print(f"  {block.objective}")
                print(f"{'─' * 66}")

                try:
                    self.execute_block(block)
                except Exception as block_err:
                    from .guardrails import GuardrailTripped
                    if isinstance(block_err, GuardrailTripped):
                        raise
                    print(f"  ✗ Block {block.index} failed: {block_err}")
                    if block.status == BlockStatus.IN_PROGRESS:
                        block.fail(str(block_err))
                    continue

                if block.block_type == BlockType.IMPLEMENT:
                    for f in block.files_changed:
                        print(f"  → {f}")
                else:
                    print(block.output[:2000])

                if block.block_type == BlockType.ANALYZE:
                    abstraction = self.run_abstraction(block)
                    print(f"  confidence: {abstraction.confidence:.0%}")

        except Exception as e:
            crashed = True
            from .guardrails import GuardrailTripped
            if isinstance(e, GuardrailTripped):
                print(f"\n  ⛔ {e}")
                self.guard.print_status()
            else:
                print(f"\n  ⚠ INTERRUPTED: {e}")
            if block and block.status == BlockStatus.IN_PROGRESS:
                block.fail(str(e))

        return self._finalize(plan, t0, crashed)

    def _finalize(self, plan: Plan, t0: float, crashed: bool) -> Plan:
        """Print summary and save plan."""
        elapsed = time.time() - t0
        status_msg = ("INTERRUPTED — use --resume to continue"
                      if crashed else "DEVELOPMENT COMPLETE")
        print(f"\n{'━' * 66}")
        print(f"  {status_msg}")
        print(f"{'━' * 66}")
        print(plan.format_status())

        # Count generated LOC
        if self.current_plan:
            project_dir = self.projects_dir / self.current_plan.target_project
            src_dir = project_dir / "src"
            if src_dir.exists():
                total_loc = 0
                file_count = 0
                for f in src_dir.rglob("*"):
                    if f.is_file() and f.suffix in (".ts", ".js", ".py"):
                        total_loc += len(f.read_text().splitlines())
                        file_count += 1
                print(f"\n  Generated: {total_loc} LOC across {file_count} files")

        # Density summary
        if self.current_plan:
            project_dir = self.projects_dir / self.current_plan.target_project
            bp_dir = project_dir / "blueprints"
            try:
                analyzer = DensityAnalyzer(project_dir, OUT_DIR)
                densities = analyzer.analyze_project(bp_dir)
                if densities:
                    avg = sum(d.avg_density for d in densities) / len(densities)
                    print(f"  Avg density: {avg:.0%}")
                    for d in densities:
                        print(f"    {d.module_name}: {d.avg_density:.0%} "
                              f"({d.total_lines} LOC, "
                              f"missing={d.total_missing_methods})")
            except Exception:
                pass

        # Emission stats
        if self.emission_index:
            print(f"  Emission: {self.emission_index.format_stats()}")
        refs_total = sum(len(b.references_used) for b in plan.blocks)
        if refs_total:
            print(f"  References used: {refs_total} across all blocks")

        if self.translator:
            print(f"  Translator tokens: {self.translator.total_tokens:,}")
        print(f"  Total tokens: {self.total_tokens:,}")
        print(f"  Total time: {elapsed:.1f}s")
        print(f"{'━' * 66}")

        # Persist engine state
        self._save_engines()
        if self.composer:
            print(f"  Composer tokens: {self.composer.total_tokens:,}")

        plan_path = self.plans_dir / f"{plan.plan_id}.json"
        plan.save(plan_path)
        self._log(f"plan saved to {plan_path}")
        return plan

    def _adjust_plan(self, block: Block, abstraction: AbstractionResult):
        """Dynamically adjust plan based on abstraction results."""
        plan = self.current_plan
        if not plan:
            return

        # Guardrail: check plan size before inserting
        self.guard.check_plan_size(len(plan.blocks))

        # Low confidence → insert review block
        if abstraction.confidence < 0.3 and block.block_type != BlockType.ANALYZE:
            self._log("low confidence → inserting review block")
            self.guard.record_block_inserted()
            plan.insert_block_after(
                block.index, BlockType.REVIEW,
                f"Review progress — confidence at {abstraction.confidence:.0%}"
            )

        # Adopted features → insert implement blocks
        for fd in abstraction.feature_decisions:
            if fd.verdict == "adopt" and fd.value_score >= 0.7:
                exists = any(
                    fd.feature.lower() in b.objective.lower()
                    for b in plan.blocks if b.status == BlockStatus.PENDING
                )
                if not exists:
                    plan.insert_block_after(
                        block.index, BlockType.IMPLEMENT,
                        f"Implement: {fd.feature} (from {fd.source})"
                    )

    # ── Helpers ──────────────────────────────────────────────────

    def _build_history_context(self) -> str:
        """Build context from completed blocks (compressed)."""
        if not self.current_plan:
            return ""
        parts = []
        for b in self.current_plan.completed_blocks[-3:]:
            summary = b.output[:1500]
            parts.append(
                f"[Block {b.index} / {b.block_type.value}] {b.objective}\n{summary}"
            )
        return "\n---\n".join(parts)

    # (Code materialization is now handled by BlueprintTranslator directly)

    def resume(self, plan_path: Path) -> Plan:
        """Resume a saved plan."""
        plan = Plan.load(plan_path)
        self.current_plan = plan
        self.vm = BlockVM(plan, budget_chars=self.budget_chars)
        # Build emission index from plan's references
        if plan.reference_projects:
            index_path = OUT_DIR / ".emission_index.json"
            if index_path.exists():
                try:
                    self.emission_index = EmissionIndex.load(index_path, OUT_DIR)
                except Exception:
                    self.emission_index = None
            if not self.emission_index:
                self.emission_index = EmissionIndex(OUT_DIR)
                self.emission_index.build(plan.reference_projects)
                self.emission_index.save(index_path)

        self._init_engines(plan.reference_projects)

        self.translator = BlueprintTranslator(
            self.llm, OUT_DIR, verbose=self.verbose,
            emission_index=self.emission_index
        )
        if self.semantic_store:
            self.translator.semantic_store = self.semantic_store
        self._log(f"resumed {plan.plan_id}: "
                  f"{len(plan.completed_blocks)}/{len(plan.blocks)} done")

        # Continue from where we left off (don't re-create plan)
        return self._continue_execution(plan)

    def list_plans(self) -> list[dict]:
        """List saved plans."""
        plans = []
        for p in sorted(self.plans_dir.glob("*.json")):
            try:
                data = json.loads(p.read_text())
                plans.append({
                    "id": data.get("plan_id", p.stem),
                    "goal": data.get("goal", ""),
                    "target": data.get("target_project", ""),
                    "blocks": len(data.get("blocks", [])),
                    "tokens": data.get("total_tokens", 0),
                })
            except Exception:
                continue
        return plans
