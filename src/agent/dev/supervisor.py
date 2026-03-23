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
        self.total_tokens = 0

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [dev] {msg}")

    def _llm_call(self, system: str, user: str,
                  temperature: float = 0.3, max_tokens: int = 4096) -> tuple[str, int]:
        """Make an LLM call and track tokens."""
        resp = self.llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", user)],
            temperature=temperature, max_tokens=max_tokens,
        )
        self.total_tokens += resp.usage.total_tokens
        return resp.content, resp.usage.total_tokens

    # ── Plan Generation ─────────────────────────────────────────

    def create_plan(self, goal: str, target: str,
                    references: list[str] = None) -> Plan:
        """Generate a granular plan: 1 analyze block per module + 1 implement block per type.

        Uses LLM to identify modules, then creates fine-grained blocks.
        Each block is self-contained — reads from disk, writes to disk.
        """
        references = references or []

        # Initialize translator
        self.translator = BlueprintTranslator(
            self.llm, OUT_DIR, verbose=self.verbose
        )

        # Load workspace summaries for planning
        ref_summaries = []
        for proj in references:
            ws_path = OUT_DIR / proj / "workspace.yaml"
            if ws_path.exists():
                content = ws_path.read_text()[:2000]
                ref_summaries.append(f"# {proj}/workspace.yaml\n{content}")

        # Collect reference descriptor paths per module
        ref_descriptors = {}
        for proj in references:
            proj_dir = OUT_DIR / proj
            if proj_dir.is_dir():
                for f in proj_dir.rglob("*.yaml"):
                    rel = str(f.relative_to(OUT_DIR))
                    module = f.parent.name if f.parent != proj_dir else "__root__"
                    ref_descriptors.setdefault(module, []).append(rel)

        # Ask LLM to identify modules and their types
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
        # List available descriptors
        if ref_descriptors:
            user += f"\nAvailable descriptors:\n"
            for mod, paths in list(ref_descriptors.items())[:20]:
                user += f"  {mod}: {', '.join(paths[:5])}\n"

        self._log("generating plan...")
        content, tokens = self._llm_call(system, user, temperature=0.4, max_tokens=2048)

        plan = Plan(goal=goal, target_project=target, reference_projects=references)

        try:
            modules_data = _parse_json_response(content)
        except (json.JSONDecodeError, IndexError):
            # Fallback: single module with generic types
            modules_data = [
                {"module": "core", "types": ["Main"], "ref_descriptors": []},
            ]

        # Generate granular blocks: analyze → implement per type → test
        for mod in modules_data:
            mod_name = mod.get("module", "core")
            types = mod.get("types", [])
            refs = mod.get("ref_descriptors", [])
            bp_path = f"blueprints/{mod_name}.bp.yaml"

            # 1. Analyze block: generate blueprint for this module
            plan.add_block(
                BlockType.ANALYZE,
                f"Generate blueprint for {mod_name} module",
                meta={"output_blueprint": bp_path, "refs": refs,
                      "module": mod_name, "types": types},
            )

            # 2. Implement blocks: one per type
            for type_name in types:
                plan.add_block(
                    BlockType.IMPLEMENT,
                    f"Translate {type_name} from {mod_name} blueprint",
                    meta={"blueprint": bp_path, "type": type_name,
                          "module": mod_name},
                )

            # 3. Index block
            plan.add_block(
                BlockType.IMPLEMENT,
                f"Generate {mod_name} index exports",
                meta={"blueprint": bp_path, "type": "__index__",
                      "module": mod_name},
            )

        # Final test block
        plan.add_block(
            BlockType.TEST,
            f"Verify all modules against blueprints",
            meta={"action": "verify_all"},
        )

        self.current_plan = plan
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

        # 3. Run discussions only for analyze blocks (saves API calls)
        discussion_insights = ""
        if block.block_type == BlockType.ANALYZE and self.current_plan:
            discussion_insights = self._run_block_discussions(block)

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
        self.total_tokens += result.get("tokens_used", 0)

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

    def _exec_analyze(self, block, history, ref_context, registry, discussions) -> dict:
        """Analyze block → generate a ModuleBlueprint YAML and write to disk."""
        meta = block.meta
        bp_path = meta.get("output_blueprint", "")
        refs = meta.get("refs", [])
        mod_name = meta.get("module", "core")
        types = meta.get("types", [])

        if not self.translator or not self.current_plan:
            return {"content": "ERROR: no translator", "tokens_used": 0}

        target = self.current_plan.target_project
        project_dir = self.projects_dir / target

        # Use translator to generate blueprint from references
        goal = (f"Module '{mod_name}' with types: {', '.join(types)}. "
                f"Part of: {self.current_plan.goal}")
        bp, tokens = self.translator.generate_blueprint(
            module_name=mod_name,
            goal=goal,
            ref_paths=refs,
            language="typescript",
            target_dir=f"src/{mod_name}",
        )

        # Ensure types from plan are in the blueprint
        for type_name in types:
            if not bp.get_type(type_name):
                bp.types.append(TypeBlueprint(
                    name=type_name,
                    target_file=f"src/{mod_name}/{type_name.lower()}.ts",
                    references=refs,
                ))

        # Set target_file for types that don't have one
        for t in bp.types:
            if not t.target_file:
                t.target_file = f"src/{mod_name}/{t.name.lower()}.ts"

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

        # Translate this ONE type (self-contained LLM call)
        file_path, tokens = self.translator.translate_type(
            type_bp, bp, project_dir
        )

        # Save updated blueprint (status: translated)
        bp.save(full_bp_path)

        content = f"Translated {type_name} → {file_path}"
        return {
            "content": content,
            "tokens_used": tokens,
            "files_changed": [file_path],
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

        content = (
            f"Verification: {translated}/{total_types} types translated\n"
            + "\n".join(report_parts)
        )
        return {
            "content": content,
            "tokens_used": 0,
            "test_results": {"total": total_types, "translated": translated},
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

    # ── Full Iteration Loop ─────────────────────────────────────

    def run(self, goal: str, target: str, references: list[str] = None,
            max_iterations: int = 100) -> Plan:
        """Full iterative development loop with blueprint pipeline.

        Each block is self-contained: reads from disk, does one LLM call,
        writes to disk, discards context. Scales to any number of blocks.
        """
        t0 = time.time()

        # Ensure project directory exists
        project_dir = self.projects_dir / target
        project_dir.mkdir(parents=True, exist_ok=True)
        (project_dir / "blueprints").mkdir(exist_ok=True)

        # 1. Create plan (granular: 1 block per type)
        plan = self.create_plan(goal, target, references)
        print(plan.format_status())

        # 2. Execute blocks (each self-contained)
        iteration = 0
        crashed = False
        try:
            while plan.next_pending and iteration < max_iterations:
                block = plan.next_pending
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
                self.execute_block(block)

                # Print result (compact for implement blocks)
                if block.block_type == BlockType.IMPLEMENT:
                    for f in block.files_changed:
                        print(f"  → {f}")
                elif block.block_type == BlockType.ANALYZE:
                    print(block.output)
                else:
                    print(block.output[:2000])

                # Run abstraction only for analyze blocks (saves API calls)
                if block.block_type == BlockType.ANALYZE:
                    abstraction = self.run_abstraction(block)
                    print(f"  confidence: {abstraction.confidence:.0%}")
                    self._adjust_plan(block, abstraction)

        except Exception as e:
            crashed = True
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

                self.execute_block(block)

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

        if self.translator:
            print(f"  Translator tokens: {self.translator.total_tokens:,}")
        print(f"  Total tokens: {self.total_tokens:,}")
        print(f"  Total time: {elapsed:.1f}s")
        print(f"{'━' * 66}")

        plan_path = self.plans_dir / f"{plan.plan_id}.json"
        plan.save(plan_path)
        self._log(f"plan saved to {plan_path}")
        return plan

    def _adjust_plan(self, block: Block, abstraction: AbstractionResult):
        """Dynamically adjust plan based on abstraction results."""
        plan = self.current_plan
        if not plan:
            return

        # Low confidence → insert review block
        if abstraction.confidence < 0.3 and block.block_type != BlockType.ANALYZE:
            self._log("low confidence → inserting review block")
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
        self.translator = BlueprintTranslator(
            self.llm, OUT_DIR, verbose=self.verbose
        )
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
