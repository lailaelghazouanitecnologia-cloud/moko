"""
BranchPipelineOrchestrator — branch-per-module pipeline.

For each module: create git branch -> generate code -> compile-fix loop -> merge.
Modules are processed in dependency order (topological levels).

Entry point: `ava dev "goal" -t target --branches`
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from ..core.llm.providers import LLMProvider
from .. import OUT_DIR

from .config import PipelineConfig
from .errors import (
    AVAError, ReferenceNotFoundError, FeatureASTError,
    CompilationError as AVACompilationError,
)
from .git_manager import GitManager
from .compile_fix_loop import CompileFixLoop
from .task_decomposer import TaskDecomposer, ModuleTask
from .translator import BlueprintTranslator
from .blueprint import ModuleBlueprint, TypeBlueprint
from ..tools.emission import EmissionIndex
from ..tools.density import DensityAnalyzer
from ..engines.context import ContextEngine
from ..engines.fix import FixEngine
from ..engines.quality import QualityEngine


@dataclass
class BranchResult:
    """Result of generating one module on one branch."""
    module_name: str
    branch_name: str
    status: str = "pending"          # "merged", "failed", "partial"
    types_generated: int = 0
    total_loc: int = 0
    tsc_errors_initial: int = 0
    tsc_errors_final: int = 0
    fix_iterations: int = 0
    tokens_used: int = 0
    elapsed_s: float = 0.0
    density_score: float = 0.0
    # S3: Detailed error tracking
    error_details: list[str] = field(default_factory=list)   # per-file error summaries
    blueprint_source: str = ""        # "descriptors" or "llm"
    files_generated: list[str] = field(default_factory=list)


@dataclass
class PipelineResult:
    """Result of the full branch pipeline."""
    branches: list[BranchResult] = field(default_factory=list)
    total_loc: int = 0
    total_tokens: int = 0
    elapsed_s: float = 0.0
    final_tsc_errors: int = 0
    # S3: Honest error tracking
    final_error_details: list[str] = field(default_factory=list)  # per-file errors
    syntax_errors_pre_fix: int = 0  # errors before any fix attempts

    def format_report(self) -> str:
        """Pretty-print the full pipeline result with honest error reporting."""
        lines = [
            f"{'━' * 70}",
            f"  BRANCH PIPELINE REPORT",
            f"{'━' * 70}",
            "",
            f"  {'Module':<20} {'Status':<10} {'Types':>5} {'LOC':>6} "
            f"{'TSC':>4} {'Fix':>4} {'Tokens':>8}",
            f"  {'─' * 62}",
        ]

        for br in self.branches:
            lines.append(
                f"  {br.module_name:<20} {br.status:<10} {br.types_generated:>5} "
                f"{br.total_loc:>6} {br.tsc_errors_final:>4} "
                f"{br.fix_iterations:>4} {br.tokens_used:>8,}"
            )

        lines.extend([
            f"  {'─' * 62}",
            f"  Total: {self.total_loc} LOC, {self.total_tokens:,} tokens, "
            f"{self.elapsed_s:.1f}s",
            "",
        ])

        # S3: Honest error summary
        total_module_errors = sum(br.tsc_errors_final for br in self.branches)
        clean_modules = sum(1 for br in self.branches if br.tsc_errors_final == 0)
        total_modules = len(self.branches)

        lines.append(f"  COMPILATION STATUS:")
        lines.append(f"    Modules clean: {clean_modules}/{total_modules}")
        lines.append(f"    Module-level errors remaining: {total_module_errors}")
        lines.append(f"    Cross-module errors (post-merge): {self.final_tsc_errors}")

        if self.final_tsc_errors > 0 and self.final_error_details:
            lines.append(f"")
            lines.append(f"  ERROR BREAKDOWN (top 15):")
            for detail in self.final_error_details[:15]:
                lines.append(f"    {detail}")
            if len(self.final_error_details) > 15:
                lines.append(f"    ... and {len(self.final_error_details) - 15} more")

        # Per-module errors if any
        problem_modules = [br for br in self.branches if br.tsc_errors_final > 0]
        if problem_modules:
            lines.append(f"")
            lines.append(f"  MODULES WITH ERRORS:")
            for br in problem_modules:
                lines.append(f"    {br.module_name}: {br.tsc_errors_initial}→{br.tsc_errors_final} "
                             f"({br.fix_iterations} fix rounds)")
                for detail in br.error_details[:5]:
                    lines.append(f"      {detail}")

        lines.append(f"{'━' * 70}")
        return "\n".join(lines)


class BranchPipelineOrchestrator:
    """Branch-per-module pipeline: decompose -> branch -> generate -> fix -> merge."""

    def __init__(self, config: dict = None):
        raw = config or {}
        self.cfg = PipelineConfig.from_dict(raw)
        self.llm = LLMProvider(
            provider=self.cfg.llm.provider,
            model=self.cfg.llm.model,
        )
        self.verbose: bool = self.cfg.verbose
        self.projects_dir = Path("projects")

        self.git: Optional[GitManager] = None
        self.decomposer = TaskDecomposer(
            self.llm, verbose=self.verbose, out_dir=OUT_DIR,
            config=self.cfg.decomposer,
        )
        self.fix_loop: Optional[CompileFixLoop] = None
        self.fix_engine: Optional[FixEngine] = None
        self.quality_engine: Optional[QualityEngine] = None
        self.emission_index: Optional[EmissionIndex] = None
        self.engine: Optional[ContextEngine] = None
        self.semantic_store = None
        self.block_store = None
        self.style_rules = None
        self.intelligence = None     # ProjectIntelligence from reference
        self.feature_ast = None      # FeatureNode tree from reference
        self.selected_features = None  # User-selected FeatureNode list
        self.interactive: bool = self.cfg.interactive
        self.pre_features = self.cfg.pre_features
        self.total_tokens: int = 0

        # Guardrails
        from .guardrails import RunGuard, RunLimits
        self.guard = RunGuard(RunLimits.from_config(config))

    def _log(self, msg: str):
        if self.verbose:
            # Route to LiveView if available
            if hasattr(self, '_view') and self._view:
                self._view.log(msg)
            else:
                print(f"  [pipeline] {msg}")

    def _build_feature_ast(self, references: list[str], goal: str):
        """Build Feature AST from reference and run goal-based selection."""
        if not references:
            return

        from ..engines.reference.feature_ast import (
            build_feature_ast, analyze_goal, auto_select,
            interactive_select, print_tree, print_plan, FeatureNode,
        )

        ref = references[0]  # primary reference
        data_dir = Path("data/reference")

        # Try cached AST first
        cached = data_dir / f"{ref}.features.yaml"
        if cached.exists():
            self.feature_ast = FeatureNode.load(cached)
            self._log(f"loaded feature AST for {ref}")
        else:
            try:
                self.feature_ast = build_feature_ast(ref, OUT_DIR)
                # Cache it
                data_dir.mkdir(parents=True, exist_ok=True)
                self.feature_ast.save(cached)
                self._log(f"built feature AST for {ref}: "
                          f"{sum(1 for _ in self.feature_ast.walk())} nodes")
            except FileNotFoundError as e:
                self._log(f"no workspace.yaml for {ref}, skipping feature AST")
                return
            except Exception as e:
                self._log(f"feature AST build failed for {ref}: {e}")
                return

        # Analyze goal → auto-select relevant features
        analysis = analyze_goal(goal, self.feature_ast)
        maybes = auto_select(self.feature_ast, analysis)

        if self.pre_features:
            # Pre-select specific features by name (--features rendering math)
            for feat_name in self.pre_features:
                self.feature_ast.select(feat_name)
            self._log(f"pre-selected features: {', '.join(self.pre_features)}")
            print_tree(self.feature_ast, show_selection=True, analysis=analysis)
            print_plan(self.feature_ast, analysis)

        elif self.interactive:
            # Show tree + plan, ask about maybes
            print_tree(self.feature_ast, show_selection=True, analysis=analysis)

            if maybes:
                confirmed = interactive_select(self.feature_ast, maybes, goal)
                if not confirmed:
                    self._log("user cancelled feature selection")
                    self.feature_ast = None
                    return

            # Show final plan and ask for confirmation
            print_plan(self.feature_ast, analysis)
            try:
                answer = input("  Proceed? [Y/n] ").strip().lower()
            except (EOFError, KeyboardInterrupt):
                answer = "y"
            if answer in ("n", "no"):
                self._log("user declined feature plan")
                self.feature_ast = None
                return

        else:
            # --no-interactive: auto-select all, no questions
            self._log("non-interactive mode: using auto-selection only")
            print_tree(self.feature_ast, show_selection=True, analysis=analysis)
            print_plan(self.feature_ast, analysis)

        # Collect selected nodes for the decomposer
        self.selected_features = self.feature_ast.selected_nodes()
        if self.selected_features:
            self._log(f"feature selection: {len(self.selected_features)} nodes selected")
        else:
            self._log("no features selected, will use fallback decomposition")
            self.feature_ast = None

    def _load_intelligence(self, references: list[str]) -> None:
        """Load Project Intelligence from reference .pi.yaml files."""
        if not references:
            return

        from ..engines.reference.models import ProjectIntelligence
        data_dir = Path("data/reference")

        for ref in references:
            pi_path = data_dir / f"{ref}.pi.yaml"
            if pi_path.exists():
                try:
                    self.intelligence = ProjectIntelligence.load(pi_path)
                    self._log(f"loaded PI for {ref}: {self.intelligence.metrics.glob.total_loc:,} LOC, "
                              f"{len(self.intelligence.patterns)} patterns")
                    return
                except Exception as e:
                    self._log(f"failed to load PI for {ref}: {e}")

        # Try to generate PI if Roska descriptors exist
        for ref in references:
            ref_dir = OUT_DIR / ref
            if ref_dir.exists():
                try:
                    from ..engines.reference.intelligence import IntelligenceGenerator
                    gen = IntelligenceGenerator(OUT_DIR, self.llm, verbose=self.verbose)
                    self.intelligence = gen.generate(ref)
                    self._log(f"generated PI for {ref}")
                    return
                except Exception as e:
                    self._log(f"PI generation failed for {ref}: {e}")

    def _build_pi_context(self) -> str:
        """Build pattern/style context string from PI for the translator."""
        if not self.intelligence:
            return ""

        pi = self.intelligence
        lines = ["## Architectural Inspiration (from reference analysis)\n"]

        # Applicable patterns
        if pi.patterns:
            lines.append("### Patterns to apply (implement YOUR version)")
            for p in pi.patterns[:4]:
                lines.append(f"- **{p.name}**: {p.what}")
                lines.append(f"  How: {p.how}")
            lines.append("")

        # Style conventions
        s = pi.style
        lines.append("### Style Conventions")
        lines.append(f"- Error handling: {s.error_handling.strategy}"
                     + (", retry patterns" if s.error_handling.retry_pattern else ""))
        lines.append(f"- Async: {s.async_style.style}")
        lines.append(f"- Typing: {s.typing.strictness}")
        if s.documentation.module_docstrings:
            lines.append(f"- Docs: {s.documentation.module_docstrings} module docs, "
                         f"{s.documentation.inline_comments} comments")
        lines.append("")

        # Quality targets
        q = pi.quality
        lines.append("### Quality Targets")
        lines.append(f"- Target LOC/type: {q.loc_per_type.median:.0f} (median)")
        lines.append(f"- Target methods/type: {q.methods_per_type.median:.0f} (median)")
        lines.append(f"- Error handling level: {q.error_handling}")

        return "\n".join(lines)

    def run(self, goal: str, target: str,
            references: list[str] = None,
            project_bp=None) -> PipelineResult:
        """Main entry point: decompose -> branch -> generate -> fix -> merge."""
        start = time.time()
        references = references or []
        project_dir = self.projects_dir / target
        project_dir.mkdir(parents=True, exist_ok=True)

        # 0. Initialize RuntimeConfig + ModelDispatcher
        from ..core.runtime_config import RuntimeConfig
        from ..core.dispatcher import ModelDispatcher
        self.runtime_config = RuntimeConfig.from_project(project_dir)
        self.runtime_config.provider = getattr(self.llm, "provider", "groq")
        self.dispatch = ModelDispatcher(self.runtime_config)
        self._log(f"dispatch: root={self.runtime_config.get_model('root').split('/')[-1]}, "
                  f"worker={self.runtime_config.get_model('worker').split('/')[-1]}, "
                  f"micro={self.runtime_config.get_model('micro').split('/')[-1]}")

        # 0a. Initialize state manager
        from ..engines.state import StateManager
        self.state_mgr = StateManager(project_dir)
        session = self.state_mgr.init_session(
            goal=goal, target=target,
            modules=[],
            provider=self.runtime_config.provider,
            model=self.runtime_config.get_model("worker"),
        )

        # 0b. Initialize knowledge injector (V3: cross-session learning)
        from ..engines.knowledge import KnowledgeInjector
        knowledge = KnowledgeInjector()
        knowledge_ctx = knowledge.get_relevant_context(goal)
        if knowledge_ctx:
            session.injected_memories = [knowledge_ctx]
            self._log(f"injected {len(knowledge_ctx)} chars of cross-session knowledge")

        # 0c. Initialize guardian (V3: approval policy)
        from ..engines.guardian import GuardianReviewer
        self.guardian = GuardianReviewer(verbose=self.verbose)

        # 0d. Initialize tool registry (V3: tools for pipeline)
        from ..engines.tools import ToolRegistry, ToolRouter
        self.tool_registry = ToolRegistry()
        self.tool_router = ToolRouter(self.tool_registry, project_dir, verbose=self.verbose)

        # 1. Initialize git
        self.git = GitManager(project_dir, verbose=self.verbose)
        self.git.init_repo()
        self.git.ensure_main_branch()

        # 2. Initialize fix engines
        self.fix_loop = CompileFixLoop(
            self.llm, project_dir,
            max_iterations=4, verbose=self.verbose,
        )
        self.fix_engine = FixEngine(
            self.llm, project_dir,
            max_iterations=4, verbose=self.verbose,
        )

        # 2b. Initialize quality engine + learn style from references
        self.quality_engine = QualityEngine(
            str(project_dir), project_name=target,
            runtime_config=getattr(self, 'runtime_config', None),
        )
        if references:
            for ref in references:
                ref_dir = self.projects_dir / ref
                if ref_dir.exists():
                    n = self.quality_engine.learn_style_from_project(str(ref_dir / "src"))
                    if n > 0:
                        self._log(f"learned style from {ref}: {n} files")
                    # Learn reference profile for intelligent scoring
                    profile = self.quality_engine.learn_reference_profile(str(ref_dir), ref)
                    if profile:
                        self._log(f"learned quality profile from {ref}: {profile.total_loc} LOC")

        # Style hints (Claude defaults + learned from refs if any)
        style_hints = self.quality_engine.get_style_hints()
        if style_hints:
            source = "learned" if self.quality_engine.style_profile.has_user_observations() else "default"
            self._log(f"style hints ({source}): {', '.join(style_hints[:3])}")

        # 2b2. Load user style rules (.ava/ + ava.md)
        from ..engines.quality.style_rules import StyleRules
        self.style_rules = StyleRules.load(project_dir)
        if self.style_rules.has_custom_rules():
            self._log(f"loaded style rules: {len(self.style_rules.raw_markdown)} rule files")

        # 2c. Initialize context engine
        self.engine = ContextEngine(project_dir / "src")
        self.engine.init(project_dir)

        # Wire context engine into both fix engines
        self.fix_loop.context_engine = self.engine
        self.fix_engine.context_engine = self.engine

        # 3. Build emission index + retrieval engines if references exist
        self._build_emission_index(references)
        self._build_retrieval_engines(references)

        # 3b. Load or generate Project Intelligence from references
        self._load_intelligence(references)

        # 3c. Build Feature AST + interactive selection (if reference exists)
        if not project_bp and references:
            self._build_feature_ast(references, goal)

        # 3d. GoalReasoning — think about WHAT before HOW (when no reference/blueprint)
        functional_spec = None
        if not project_bp and not references and not self.selected_features:
            from .goal_reasoner import GoalReasoner
            reasoner = GoalReasoner(self.llm, verbose=self.verbose)
            functional_spec = reasoner.reason(goal)
            self.total_tokens += reasoner.tokens_used

        # 4. Decompose into module tasks
        # Priority: blueprint > features > PI > reference > spec > LLM
        print(f"\n  Decomposing: {goal}")
        tasks = self.decomposer.decompose(
            goal=goal, target=target,
            references=references, project_bp=project_bp,
            intelligence=self.intelligence,
            feature_selection=self.selected_features,
            functional_spec=functional_spec,
        )
        self.total_tokens += self.decomposer.total_tokens
        self._functional_spec = functional_spec

        # 5. Generate project config on main
        self._generate_project_config(target, tasks, project_dir)
        self.git.commit_all(f"chore: project config for {target}")

        # 5b. Update session state with module order
        all_module_names = [t.name for level in self.decomposer.topo_sort(tasks) for t in level]
        session.module_order = all_module_names
        if functional_spec:
            session.functional_spec = functional_spec.to_prompt_context()
        self.state_mgr.save()

        # 5c. Show plan to user (V3: tool_router plan handler)
        self.tool_router.dispatch("update_plan", {
            "steps": [{"step": f"Generate {name}", "status": "pending"} for name in all_module_names]
        })

        # 5d. V3: Initialize workspace manager
        from ..engines.workspace import WorkspaceManager
        self.workspace_mgr = WorkspaceManager(project_dir, verbose=self.verbose)
        for t in [t for level in self.decomposer.topo_sort(tasks) for t in level]:
            self.workspace_mgr.create(
                name=t.name, goal=t.description or f"Generate {t.name}",
                depends_on=t.depends_on,
            )

        # 6. Initialize LiveView (rich TUI — like Codex ChatWidget)
        try:
            from ..views.live import LiveView
            self._view = LiveView(
                goal=goal,
                modules=all_module_names,
                provider=self.runtime_config.provider,
                model=self.runtime_config.get_model("worker"),
                token_budget=session.token_budget,
                verbose=self.verbose,
            )
        except ImportError:
            self._view = None

        # 6. Process tasks in dependency order
        result = PipelineResult()
        levels = self.decomposer.topo_sort(tasks)

        for level_idx, level in enumerate(levels):
            if not self._view:
                print(f"\n  Level {level_idx}: {', '.join(t.name for t in level)}")
            for task in level:
                # V3: Activate workspace
                self.workspace_mgr.activate(task.name)

                # V3: Begin turn (TurnState tracks per-module metrics)
                turn = self.state_mgr.begin_turn(task.name)

                # V3: Update visible plan
                self.tool_router.dispatch("update_plan", {
                    "steps": [
                        {"step": f"Generate {name}",
                         "status": "completed" if name in session.modules_completed
                         else "in_progress" if name == task.name
                         else "pending"}
                        for name in all_module_names
                    ]
                })

                # V3: Experiment engine — use variants for complex modules
                use_experiment = self._should_experiment(task)
                if use_experiment:
                    branch_result = self._process_module_with_experiment(
                        task, project_dir, target, references, project_bp,
                    )
                else:
                    branch_result = self._process_module(
                        task, project_dir, target, references, project_bp,
                    )
                result.branches.append(branch_result)
                result.total_tokens += branch_result.tokens_used
                result.total_loc += branch_result.total_loc

                # V3: Set workspace baseline
                ws = self.workspace_mgr.workspaces.get(task.name)
                if ws:
                    ws.set_baseline(
                        compiles=branch_result.tsc_errors_final == 0,
                        tsc_errors=branch_result.tsc_errors_final,
                        loc=branch_result.total_loc,
                        method_count=0,
                        density=0.0,
                        quality=0.0,
                    )
                    # Generate proposals (data-driven, no LLM)
                    try:
                        from ..engines.workspace.proposals import ProposalGenerator
                        proposer = ProposalGenerator(verbose=self.verbose)
                        module_dir = project_dir / "src" / task.name
                        proposals = proposer.analyze(module_dir, self.engine, self.quality_engine)
                        ws.improvements_proposed = len(proposals)
                        if proposals and self.verbose:
                            print(proposer.format_proposals(proposals[:3]))
                    except Exception:
                        pass
                    self.workspace_mgr.close(task.name)

                # V3: End turn (updates session + persists)
                turn_result = turn.to_result(
                    task.name,
                    success=branch_result.tsc_errors_final == 0,
                    loc=branch_result.total_loc,
                    tsc_errors=branch_result.tsc_errors_final,
                    fix_rounds=branch_result.fix_iterations,
                )
                turn.add_tokens(branch_result.tokens_used)
                self.state_mgr.end_turn(turn_result)

                # V3: Compact mid-generation if history growing
                try:
                    from ..engines.compact import ContextCompactor
                    compactor = ContextCompactor()
                    if compactor.should_compact(session):
                        summary = compactor.compact(session)
                        if summary:
                            self._log(f"  [compact] mid-run: {summary[:60]}...")
                except Exception:
                    pass

                # V3: Track usage in dispatcher
                if hasattr(self, 'dispatch'):
                    self.dispatch.track_usage(
                        "translate_type",
                        branch_result.tokens_used // 3,  # rough input estimate
                        branch_result.tokens_used * 2 // 3,  # rough output estimate
                    )

        # 7. Final tsc check on main — fix cross-module errors
        self.git.checkout("main")
        final_errors, final_clean, _ = self.fix_engine.check_tsc()

        if not final_clean and final_errors:
            print(f"\n  Post-merge: {len(final_errors)} cross-module errors, running fix loop...")
            post_merge_tokens = 0
            context_files = self._gather_context_files(project_dir)

            # Fix cross-module errors iteratively: fix one file, re-check,
            # update context, fix next. This prevents cascading breakage
            # from fixing multiple interdependent files in one batch.
            for fix_round in range(4):
                final_errors, final_clean, _ = self.fix_engine.check_tsc()
                if final_clean or not final_errors:
                    break

                # Group by file, fix only the file with most errors first
                by_file: dict[str, list] = {}
                for err in final_errors:
                    by_file.setdefault(err.file, []).append(err)

                # Pick file with most errors
                target_file = max(by_file, key=lambda f: len(by_file[f]))
                target_errors = by_file[target_file]
                abs_path = project_dir / target_file

                if not abs_path.exists():
                    continue

                code = abs_path.read_text()
                prompt = self.fix_engine._intel.build_smart_prompt(
                    code, target_errors, context_files,
                    self.fix_engine.context_engine,
                )
                fixed, tokens = self.fix_engine._llm_fix(prompt)
                post_merge_tokens += tokens

                if fixed.strip():
                    # Snapshot for revert
                    original = code
                    abs_path.write_text(fixed + "\n")

                    # Check if it helped
                    new_errors, new_clean, _ = self.fix_engine.check_tsc()
                    if len(new_errors) > len(final_errors):
                        # Worsened — revert this file
                        abs_path.write_text(original)
                        self._log(f"  post-merge fix {target_file} WORSENED, reverted")
                    else:
                        # Update context with the fixed file
                        rel = str(abs_path.relative_to(project_dir))
                        context_files[rel] = fixed
                        self._log(f"  post-merge fixed {target_file}: "
                                  f"{len(final_errors)}→{len(new_errors)} errors")

            result.total_tokens += post_merge_tokens

            # Final check
            final_errors, final_clean, _ = self.fix_engine.check_tsc()
            if final_clean:
                self.git.commit_all("fix: resolve cross-module errors after merge")
                print(f"  Post-merge: CLEAN ({post_merge_tokens:,} tokens)")
            else:
                self.git.commit_all("fix: partial cross-module error fixes")
                print(f"  Post-merge: {len(final_errors)} errors remain")

        result.final_tsc_errors = len(final_errors)
        # S3: Capture per-file error details for honest reporting
        if final_errors:
            by_file: dict[str, list] = {}
            for err in final_errors:
                by_file.setdefault(err.file, []).append(err)
            for file_path, errs in sorted(by_file.items(), key=lambda x: -len(x[1])):
                codes = ", ".join(sorted(set(e.code for e in errs)))
                result.final_error_details.append(
                    f"{file_path}: {len(errs)} errors [{codes}]"
                )
        result.elapsed_s = time.time() - start
        result.total_tokens += self.total_tokens

        # 8. Persist context engine state
        if self.engine:
            try:
                report_data = {
                    "goal": goal,
                    "target": target,
                    "references": references,
                    "branches": [
                        {
                            "module": br.module_name,
                            "status": br.status,
                            "types": br.types_generated,
                            "loc": br.total_loc,
                            "tsc_initial": br.tsc_errors_initial,
                            "tsc_final": br.tsc_errors_final,
                            "fix_iterations": br.fix_iterations,
                            "tokens": br.tokens_used,
                            "error_details": br.error_details,
                            "blueprint_source": br.blueprint_source,
                        }
                        for br in result.branches
                    ],
                    "total_loc": result.total_loc,
                    "total_tokens": result.total_tokens,
                    "elapsed_s": result.elapsed_s,
                    "final_tsc_errors": result.final_tsc_errors,
                    "final_error_details": result.final_error_details,
                }
                self.engine.persistence.save_report(project_dir, report_data)
                self.engine.persist(project_dir)
                self._log("context engine state persisted")
            except Exception as e:
                self._log(f"persist failed: {e}")

        print(f"\n{result.format_report()}")

        # 9. Quality report (learned scorer if reference available)
        if self.quality_engine and self.quality_engine.learned_scorer.dimensions:
            try:
                score, report = self.quality_engine.score_project(str(project_dir), target)
                print(f"\n  Quality: {score:.0%} (learned from references)")
                if self.verbose:
                    print(f"  {report}")
            except Exception as e:
                self._log(f"quality report failed: {e}")

        # 9b. ProjectAnalyzer — deep introspection post-generation
        try:
            from ..engines.analysis import ProjectAnalyzer
            analyzer = ProjectAnalyzer(project_dir, verbose=self.verbose)
            health = analyzer.analyze()
            print(f"\n{health.format()}")

            # Store health score in session
            if hasattr(self, 'state_mgr') and self.state_mgr.session:
                self.state_mgr.session.add_history(
                    "analysis", detail=f"Score: {health.score():.0f}/100, "
                    f"{len(health.empty_interfaces)} empty ifaces, "
                    f"{len(health.missing_di)} missing DI, "
                    f"{health.total_any} any, cohesion={health.cohesion_score:.2f}",
                )
        except Exception as e:
            self._log(f"analysis failed: {e}")

        # 10. V3: Extract and store cross-session memories
        try:
            from ..engines.knowledge import MemoryExtractor, KnowledgeStore
            extractor = MemoryExtractor()
            memory = extractor.extract(session)
            memory.tsc_errors = result.final_tsc_errors
            store = KnowledgeStore()
            store.add(memory)
            self._log(f"extracted {len(memory.learnings)} learnings → knowledge store")
        except Exception as e:
            self._log(f"memory extraction failed: {e}")

        # 11. V3: Compact session history if needed
        try:
            from ..engines.compact import ContextCompactor
            compactor = ContextCompactor()
            if compactor.should_compact(session):
                summary = compactor.compact(session)
                if summary:
                    self._log(f"compacted history: {summary[:80]}...")
        except Exception:
            pass

        # 12. V3: Final plan update
        self.tool_router.dispatch("update_plan", {
            "steps": [
                {"step": f"Generate {name}", "status": "completed" if name in session.modules_completed else "pending"}
                for name in all_module_names
            ]
        })

        # 13. V3: Guardian stats
        if hasattr(self, 'guardian'):
            stats = self.guardian.stats
            if stats["total"] > 0:
                self._log(f"guardian: {stats['approved']} approved, {stats['asked']} asked, {stats['denied']} denied")

        # 14. V3: Dispatcher usage report
        if hasattr(self, 'dispatch'):
            report = self.dispatch.usage_report()
            if "calls=" in report:
                print(f"\n{report}")

        # 15. LiveView summary (rich final report)
        if hasattr(self, '_view') and self._view:
            self._view.summary()

        self.state_mgr.save()
        return result

    def _process_module(self, task: ModuleTask, project_dir: Path,
                        target: str, references: list[str],
                        project_bp) -> BranchResult:
        """Process one module: branch -> generate -> fix -> merge.

        Each step is tracked as a Block with hash chain integrity.
        """
        start = time.time()
        br = BranchResult(module_name=task.name, branch_name=task.branch_name)

        # V5: Create Blocks for this module
        try:
            goal = getattr(self, '_functional_spec', None)
            goal_text = goal.to_prompt_context() if goal else task.description
            module_blocks = self._create_module_blocks(task, goal_text)
            if self.verbose:
                self._log(f"  {len(module_blocks)} blocks: " +
                          " → ".join(b.block_type.value for b in module_blocks))
        except Exception:
            module_blocks = []

        # Update LiveView
        if hasattr(self, '_view') and self._view:
            self._view.start_module(task.name, types=len(task.types))
        else:
            print(f"  ▶ {task.name} ({len(task.types)} types)...")

        try:
            # 1. Create branch from main
            self.git.checkout("main")
            if self.git.branch_exists(task.branch_name):
                self.git.checkout(task.branch_name)
            else:
                self.git.create_branch(task.branch_name, "main")

            # 2. Generate module code
            self._last_blueprint_source = "llm"  # default
            tokens = self._generate_module(task, project_dir, target, references, project_bp, module_blocks)
            br.tokens_used = tokens
            br.blueprint_source = self._last_blueprint_source

            # 3. Polish code (strip boilerplate + modernize idioms)
            module_dir = project_dir / "src" / task.name
            self._strip_boilerplate(module_dir)
            self._modernize_idioms(module_dir)

            # 3b. Count LOC
            br.total_loc = self._count_loc(module_dir)
            br.types_generated = len(task.types)

            # 4. Commit generated code
            self.git.commit_all(f"feat({task.name}): generate {len(task.types)} types")

            # 5. Intelligent fix engine
            context_files = self._collect_dependency_context(task, project_dir)

            # Use new FixEngine (layered: auto-fix → cascade detection → smart LLM)
            fix_result = self.fix_engine.fix_module(module_dir, context_files)
            br.tsc_errors_initial = fix_result.initial_errors
            br.tsc_errors_final = fix_result.final_errors
            br.fix_iterations = len(fix_result.iterations)
            br.tokens_used += fix_result.total_tokens

            if fix_result.auto_fixes_applied > 0:
                self._log(f"  auto-fixed {fix_result.auto_fixes_applied} issues without LLM")

            # S3: Capture per-file error details
            if fix_result.final_errors > 0:
                final_check, _ = self.fix_engine.check_module(
                    project_dir / "src" / task.name)
                by_file: dict[str, list] = {}
                for err in final_check:
                    by_file.setdefault(err.file, []).append(err)
                for fp, errs in sorted(by_file.items(), key=lambda x: -len(x[1])):
                    codes = ", ".join(sorted(set(e.code for e in errs)))
                    br.error_details.append(f"{fp}: {len(errs)} [{codes}]")

            # Commit fixes if any changes were made
            if self.git.has_uncommitted():
                self.git.commit_all(f"fix({task.name}): resolve tsc errors")

            # 5b. Module review FIRST (detect before fixing)
            review_issues = []
            try:
                from ..actors.module_reviewer import ModuleReviewer
                reviewer = ModuleReviewer(self.llm, verbose=self.verbose)
                module_files = self._read_module_files(module_dir)
                if module_files:
                    dep_interfaces = {}
                    for dep_name in task.depends_on:
                        dep_dir = project_dir / "src" / dep_name
                        for iface_file in dep_dir.glob("i*.ts"):
                            try:
                                dep_interfaces[str(iface_file.relative_to(project_dir))] = iface_file.read_text()
                            except Exception:
                                pass

                    spec_ctx = getattr(self, '_functional_spec', None)
                    spec_text = spec_ctx.to_prompt_context() if spec_ctx else ""
                    review = reviewer.review(task.name, module_files, dep_interfaces, spec_text)

                    if review.has_issues:
                        review_issues = review.issues + review.integration_issues
                        for issue in review.issues:
                            self._log(f"  [review] issue: {issue}")
                        for iissue in review.integration_issues:
                            self._log(f"  [review] integration: {iissue}")

                    if hasattr(self, 'state_mgr') and self.state_mgr.session:
                        self.state_mgr.session.add_history(
                            "review", module=task.name,
                            detail=f"{len(review.issues)} issues, {len(review.suggestions)} suggestions",
                            tokens=review.tokens_used,
                        )
                    br.tokens_used += review.tokens_used
            except Exception as e:
                self._log(f"  review failed: {e}")

            # 5c. Quality pass — informed by reviewer findings
            if self.quality_engine:
                try:
                    module_files = self._read_module_files(module_dir)
                    if module_files:
                        pre_errors, _ = self.fix_engine.check_module(module_dir)
                        pre_error_count = len(pre_errors)

                        improved, q_result = self.quality_engine.improve_module(
                            task.name, module_files, llm=self.llm, max_llm_calls=2,
                        )

                        # If reviewer found critical issues that quality didn't fix,
                        # do a targeted LLM pass with the reviewer findings
                        if review_issues and q_result.issues_fixed == 0:
                            improved = self._fix_reviewer_issues(
                                task.name, improved, review_issues, project_dir
                            )

                        # Check if we have changes to write
                        has_changes = q_result.issues_fixed > 0 or (
                            review_issues and any(
                                improved.get(f) != module_files.get(f)
                                for f in improved
                            )
                        )

                        if has_changes:
                            self._write_module_files(module_dir, improved)

                            post_errors, _ = self.fix_engine.check_module(module_dir)
                            post_error_count = len(post_errors)

                            if post_error_count > pre_error_count:
                                self._log(f"  quality enhancement WORSENED compilation "
                                          f"({pre_error_count}→{post_error_count}), reverting")
                                self._write_module_files(module_dir, module_files)
                            else:
                                if self.git.has_uncommitted():
                                    self.git.commit_all(
                                        f"quality({task.name}): {q_result.auto_fixes} auto-fixes, "
                                        f"{q_result.prompt_fixes} LLM-fixes"
                                    )
                                self._log(f"  quality: {q_result.summary()}")
                except Exception as e:
                    self._log(f"  quality pass failed: {e}")

            # 6. Merge to main
            merged = self.git.merge(
                task.branch_name, "main",
                f"feat({task.name}): {task.description or f'{len(task.types)} types'}"
            )
            if merged:
                br.status = "merged"
                self.git.delete_branch(task.branch_name)
                # Update context engine index after merge
                if self.engine:
                    self.engine.update_all()
            else:
                br.status = "failed"
                self._log(f"merge failed for {task.branch_name}")

        except Exception as e:
            br.status = "failed"
            self._log(f"ERROR processing {task.name}: {e}")
            # Try to get back to main
            try:
                self.git.checkout("main")
            except Exception:
                pass

        br.elapsed_s = time.time() - start
        br.total_loc = self._count_loc(project_dir / "src" / task.name)

        # V5: Complete all blocks + hash chain
        if module_blocks:
            try:
                prev_block = None
                for block in module_blocks:
                    # Preserve per-step output from _generate_module if already set
                    existing_output = block.output if block.output else None
                    block.complete(
                        output=existing_output or f"{task.name}: {br.total_loc} LOC, {br.tsc_errors_final} errors",
                        files_changed=block.files_changed,
                        tokens_used=block.tokens_used,
                        prev_block=prev_block,
                    )
                    prev_block = block

                # Verify chain
                chain_valid = all(
                    (module_blocks[i].prev_hash == module_blocks[i-1].hash)
                    for i in range(1, len(module_blocks))
                    if module_blocks[i-1].hash
                )
                if self.verbose:
                    self._log(f"  blocks: {len(module_blocks)} completed, "
                              f"chain={'valid' if chain_valid else 'BROKEN'}")
            except Exception as e:
                if self.verbose:
                    self._log(f"  block chain failed: {e}")

            # Persist blocks to session state
            if hasattr(self, 'state_mgr') and self.state_mgr.session:
                try:
                    self.state_mgr.session.record_blocks(module_blocks)
                    self.state_mgr.save()
                except Exception:
                    pass

        ok = br.status == "merged"
        elapsed = br.elapsed_s
        blk_count = len(module_blocks) if module_blocks else 0

        if hasattr(self, '_view') and self._view:
            if ok:
                self._view.complete_module(
                    loc=br.total_loc, errors=br.tsc_errors_final,
                    tokens=br.tokens_used, elapsed=elapsed, blocks=blk_count,
                )
            else:
                self._view.fail_module(
                    error=f"TSC {br.tsc_errors_final} errors"
                )
        else:
            icon = "✓" if ok else "✗"
            tsc_str = f"{br.tsc_errors_initial}→{br.tsc_errors_final}"
            blk_str = f" {blk_count}blk" if blk_count else ""
            print(f"  {icon} {task.name:<14} {br.total_loc:>5} LOC  "
                  f"TSC {tsc_str:<7} {br.fix_iterations} fix  "
                  f"{br.tokens_used:>7,} tok{blk_str}")

        return br

    def _generate_module(self, task: ModuleTask, project_dir: Path,
                         target: str, references: list[str],
                         project_bp, module_blocks: list | None = None) -> int:
        """Generate all types for a module using BlueprintTranslator."""
        # Sync context engine index before generation
        if self.engine:
            self.engine.update_all()

        # Build translator
        translator = BlueprintTranslator(
            self.llm, OUT_DIR, verbose=self.verbose,
            emission_index=self.emission_index,
        )

        # Provide context engine to translator for richer snapshots
        if self.engine:
            translator.context_engine = self.engine

        # Provide retrieval engines to translator
        if self.semantic_store:
            translator.semantic_store = self.semantic_store

        # Wire quality engine for style-aware generation
        if self.quality_engine:
            translator.quality_engine = self.quality_engine

        # Wire user style rules
        if self.style_rules:
            translator.style_rules = self.style_rules

        # Wire PI context for pattern-aware generation
        if self.intelligence:
            translator.pi_context = self._build_pi_context()

        # Load prior module blueprints for cross-module context
        bp_dir = project_dir / "blueprints"
        prior_modules = []
        if bp_dir.exists():
            for req_name in task.depends_on:
                bp_file = bp_dir / f"{req_name}.bp.yaml"
                if bp_file.exists():
                    try:
                        prior_modules.append(ModuleBlueprint.load(bp_file))
                    except Exception:
                        pass
        translator.prior_modules = prior_modules

        # Build prior layers context
        if prior_modules:
            from .compaction import build_prior_layers_context
            translator.prior_layers_context = build_prior_layers_context(
                prior_modules, max_chars=3000
            )

        # Generate blueprint for this module
        ref_paths = self._get_ref_paths(references)

        layer_desc = task.description
        if project_bp:
            layer = project_bp.get_layer(task.name)
            if layer:
                layer_desc = layer.description or task.description

        # Build goal string — handle guide mode (no predefined types)
        if task.types:
            goal = f"Module '{task.name}' with types: {', '.join(task.types)}."
        else:
            goal = f"Module '{task.name}'."
        if layer_desc:
            goal += f" {layer_desc}."

        # S2: Try descriptor-based blueprint first (reference-aware)
        bp = None
        bp_tokens = 0
        if task.ref_descriptors:
            bp = self._blueprint_from_descriptors(task, f"src/{task.name}")
            if bp:
                self._log(f"  using descriptor-based blueprint for {task.name}")
                self._last_blueprint_source = "descriptors"

        # Inject functional spec context if available
        spec = getattr(self, '_functional_spec', None)
        if spec:
            translator.functional_spec_context = spec.to_prompt_context()

        # Fall back to LLM-generated blueprint
        if bp is None:
            self._last_blueprint_source = "llm"
            bp, bp_tokens = translator.generate_blueprint(
                module_name=task.name,
                goal=goal,
                ref_paths=ref_paths,
                language="typescript",
                target_dir=f"src/{task.name}",
            )

        # Blueprint guardrail: reject if LLM generated >2x the requested types
        # Only applies when types were pre-specified (strict mode)
        if task.types:
            max_allowed = len(task.types) * 2
            if len(bp.types) > max_allowed:
                self._log(f"  blueprint inflated: {len(bp.types)} types vs {len(task.types)} requested, trimming to requested")
                requested_names = set(t.lower() for t in task.types)
                kept = [t for t in bp.types if t.name.lower() in requested_names
                        or any(t.name.lower() == rn for rn in requested_names)]
                bp.types = kept

        # Ensure all planned types exist in blueprint (strict mode)
        from .translator import to_kebab_case
        for type_name in task.types:
            if not bp.get_type(type_name):
                bp.types.append(TypeBlueprint(
                    name=type_name,
                    kind="class",
                    target_file=f"src/{task.name}/{to_kebab_case(type_name)}.ts",
                    references=ref_paths[:5],
                ))

        # Normalize target files
        for t in bp.types:
            t.target_file = f"src/{task.name}/{to_kebab_case(t.name)}.ts"

        # Selective discussion: debate blueprint if module has >2 dependents
        discussion_tokens = self._run_selective_discussion(task, bp, project_dir)
        bp_tokens += discussion_tokens

        # Save blueprint
        bp_dir.mkdir(parents=True, exist_ok=True)
        bp.save(bp_dir / f"{task.name}.bp.yaml")

        # Update ANALYZE block with blueprint results
        analyze_blocks = [b for b in (module_blocks or [])
                          if b.block_type.value == "ANALYZE"]
        if analyze_blocks:
            ab = analyze_blocks[0]
            ab.tokens_used = bp_tokens
            ab.output = f"Blueprint: {len(bp.types)} types for {task.name}"
            ab.files_changed = [f"blueprints/{task.name}.bp.yaml"]

        # Translate each type — inject completed blocks as compact context
        total_tokens = bp_tokens
        completed_blocks = list(analyze_blocks)  # Start with ANALYZE as prior context
        # Map type index → block for tracking
        impl_blocks = [b for b in (module_blocks or [])
                       if b.block_type.value == "IMPLEMENT"]

        for type_idx, type_bp in enumerate(bp.types):
            try:
                file_path, tokens, refs_used = translator.translate_type(
                    type_bp, bp, project_dir,
                    prior_blocks=completed_blocks if completed_blocks else None,
                )
                total_tokens += tokens
                self._log(f"  translated {type_bp.name} -> {file_path}")

                # Update corresponding IMPLEMENT block with results
                if type_idx < len(impl_blocks):
                    blk = impl_blocks[type_idx]
                    blk.files_changed = [file_path] if file_path else []
                    blk.tokens_used = tokens
                    blk.references_used = refs_used or []
                    blk.output = f"Translated {type_bp.name} → {file_path}"
                    completed_blocks.append(blk)

                # Update context engine index after each file write
                if self.engine and file_path:
                    rel_from_src = file_path
                    if rel_from_src.startswith("src/"):
                        rel_from_src = rel_from_src[4:]
                    issues = self.engine.update(rel_from_src)
                    if issues:
                        self._log(f"  context issues: {[i.message for i in issues]}")

                # Post-translate: verify the exported name matches the blueprint
                self._verify_export_name(type_bp, project_dir)

                # DepthLoop: adaptive expansion for complex types
                if self._needs_depth(type_bp, task, file_path, project_dir):
                    depth_tokens = self._depth_loop(
                        type_bp, bp, task, project_dir, translator,
                        max_passes=3,
                    )
                    total_tokens += depth_tokens

                # Two-pass enhancement for richer output
                if task.generation_passes >= 2:
                    enhanced_tokens = self._enhance_type(
                        type_bp, bp, project_dir, translator,
                    )
                    total_tokens += enhanced_tokens
            except Exception as e:
                self._log(f"  ERROR translating {type_bp.name}: {e}")

        # Generate index.ts
        translator.generate_index(bp, project_dir)

        # Auto-fix imports
        self._fix_imports(project_dir, bp)

        # Save updated blueprint
        bp.save(bp_dir / f"{task.name}.bp.yaml")

        return total_tokens

    def _enhance_type(self, type_bp: TypeBlueprint, module_bp: ModuleBlueprint,
                      project_dir: Path, translator: BlueprintTranslator) -> int:
        """Second pass: enhance generated code with richer implementations.

        Includes TSC gate: checks compilation before and after enhancement.
        If enhance introduces new errors, reverts to original code.
        """
        # Skip enhancement for interfaces, enums, and type aliases — they don't need it
        if type_bp.kind in ("interface", "enum", "type"):
            self._log(f"  skip enhance {type_bp.name} (kind={type_bp.kind})")
            return 0

        code_path = project_dir / type_bp.target_file
        if not code_path.exists():
            return 0

        code = code_path.read_text()
        if len(code.splitlines()) >= 300:
            # Already substantial, skip enhancement
            return 0

        # TSC gate: count errors BEFORE enhance
        pre_errors = 0
        if self.fix_loop:
            pre_check = self.fix_loop.check_tsc()
            module_rel = f"src/{module_bp.name}"
            pre_errors = len([e for e in pre_check.errors
                             if e.file.startswith(module_rel)])

        # Build enhancement prompt
        import yaml as _yaml
        bp_yaml = _yaml.dump(
            type_bp.to_dict(), default_flow_style=False,
            allow_unicode=True, sort_keys=False, width=120,
        )

        system = (
            "You are enhancing TypeScript code. The code below is functionally correct "
            "but sparse. Enhance it to production quality.\n\n"
            "Rules:\n"
            "1. Output the COMPLETE enhanced file.\n"
            "2. Keep all existing functionality intact — do NOT corrupt declarations.\n"
            "3. Add missing methods from the blueprint.\n"
            "4. Add JSDoc for public methods.\n"
            "5. Add input validation with typed errors (TypeError, RangeError).\n"
            "6. Preserve ALL field declarations exactly as they are.\n"
            "7. Output ONLY the source code. No markdown fences.\n\n"
            "Type quality (IMPORTANT):\n"
            "8. Replace ALL 'any' with 'unknown', generics, or specific types.\n"
            "9. Add 'readonly' to fields only set in constructor.\n"
            "10. Use generic type parameters <T> for reusable patterns.\n"
            "11. Use discriminated unions for state/result types.\n"
            "12. Use 'private readonly' for injected dependencies."
        )

        user = (
            f"## Current code\n```typescript\n{code}\n```\n\n"
            f"## Blueprint\n```yaml\n{bp_yaml}\n```\n\n"
            f"Enhance this code. Output the COMPLETE file."
        )

        from ..core.llm.providers import LLMMessage
        resp = self.llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", user)],
            temperature=0.2, max_tokens=12000,
        )

        enhanced = self._strip_fences(resp.content)
        if enhanced.strip() and len(enhanced.splitlines()) > len(code.splitlines()):
            # Write enhanced code
            code_path.write_text(enhanced + "\n")

            # TSC gate: count errors AFTER enhance
            if self.fix_loop:
                post_check = self.fix_loop.check_tsc()
                module_rel = f"src/{module_bp.name}"
                post_errors = len([e for e in post_check.errors
                                  if e.file.startswith(module_rel)])

                if post_errors > pre_errors:
                    # Enhance introduced new errors — REVERT
                    code_path.write_text(code)
                    self._log(f"  enhance REVERTED {type_bp.name}: "
                              f"introduced {post_errors - pre_errors} new errors "
                              f"({pre_errors}->{post_errors})")
                    return resp.usage.total_tokens

            self._log(f"  enhanced {type_bp.name}: "
                      f"{len(code.splitlines())} -> {len(enhanced.splitlines())} LOC")

        return resp.usage.total_tokens

    def _needs_depth(self, type_bp, task, file_path: str,
                     project_dir: Path) -> bool:
        """Detect if a type needs additional generation passes.

        Triggers when:
        - FunctionalSpec marks component as "complex"
        - Blueprint has >10 methods
        - Generated code is <50% of target LOC
        - Type is a class (not interface/enum)
        """
        if type_bp.kind in ("interface", "enum", "type"):
            return False

        # Check FunctionalSpec
        spec = getattr(self, '_functional_spec', None)
        if spec:
            for comp in spec.components:
                if comp.name == task.name and comp.complexity == "complex":
                    return True

        # Blueprint method count
        methods = getattr(type_bp, 'methods', [])
        if methods and len(methods) > 10:
            return True

        # LOC vs target
        code_path = project_dir / file_path if file_path else None
        if code_path and code_path.exists():
            loc = len(code_path.read_text().splitlines())
            target = getattr(task, 'target_loc_per_type', 150)
            if loc < target * 0.5 and target > 100:
                return True

        return False

    def _depth_loop(self, type_bp, module_bp, task, project_dir: Path,
                    translator, max_passes: int = 3) -> int:
        """Adaptive depth loop for complex types.

        Reads current code, finds missing methods from blueprint,
        asks LLM to add them. Stops when complete or stalled.
        """
        import re as _re

        total_tokens = 0
        file_path = project_dir / type_bp.target_file
        if not file_path.exists():
            return 0

        target_loc = getattr(task, 'target_loc_per_type', 150)
        bp_methods = {m.name for m in (type_bp.methods or [])}

        for pass_num in range(max_passes):
            current_code = file_path.read_text()
            current_loc = len(current_code.splitlines())

            # Find implemented methods (rough regex — matches method declarations)
            impl_methods = set(_re.findall(
                r'(?:async\s+)?(?:private\s+|protected\s+|public\s+|static\s+)?'
                r'(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{',
                current_code
            ))
            missing = bp_methods - impl_methods - {"constructor"}

            # Stop conditions
            if not missing:
                self._log(f"  depth[{pass_num}] complete: all {len(bp_methods)} methods present")
                break
            if current_loc >= target_loc * 1.2:
                self._log(f"  depth[{pass_num}] LOC target met ({current_loc}/{target_loc})")
                break

            self._log(f"  depth[{pass_num}] {len(missing)} methods missing, expanding...")

            # Build expansion prompt with missing methods
            missing_descs = []
            for m in type_bp.methods or []:
                if m.name in missing:
                    sig = getattr(m, 'sig', '') or getattr(m, 'signature', '')
                    hint = getattr(m, 'hint', '')
                    missing_descs.append(f"- {m.name}{sig}: {hint}" if hint else f"- {m.name}{sig}")

            # Also inject spec context for domain knowledge
            spec_ctx = ""
            spec = getattr(self, '_functional_spec', None)
            if spec:
                for comp in spec.components:
                    if comp.name == task.name:
                        if comp.methods:
                            spec_ctx = "\n## Domain requirements\n" + "\n".join(
                                f"- {m}" for m in comp.methods[:20]
                            )
                        break

            user_prompt = (
                f"## Existing code ({current_loc} LOC)\n"
                f"```typescript\n{current_code}\n```\n\n"
                f"## Methods NOT YET implemented (MUST add ALL of these):\n"
                + "\n".join(missing_descs) +
                f"{spec_ctx}\n\n"
                f"Add ALL missing methods to the existing class. "
                f"Keep ALL existing code intact — do not remove or rewrite anything. "
                f"Return the COMPLETE file with all methods."
            )

            from .translator import TRANSLATE_SYSTEM
            depth_max = min(getattr(self.llm, 'max_output', 8000), 16384)
            expanded, tokens = translator._llm_call(
                TRANSLATE_SYSTEM, user_prompt, max_tokens=depth_max
            )
            total_tokens += tokens

            # Validate expansion
            expanded_clean = translator._strip_code_fences(expanded)
            new_loc = len(expanded_clean.splitlines())

            # Revert if code shrank significantly
            if new_loc < current_loc * 0.8:
                self._log(f"  depth[{pass_num}] REVERTED: code shrank {current_loc}→{new_loc}")
                break

            # Revert if it's just the same size (stalled)
            if new_loc - current_loc < 10 and pass_num > 0:
                self._log(f"  depth[{pass_num}] stalled: only {new_loc - current_loc} LOC added")
                break

            file_path.write_text(expanded_clean)
            self._log(f"  depth[{pass_num}] expanded: {current_loc}→{new_loc} LOC")

            # Update context engine
            if self.engine and type_bp.target_file:
                rel = type_bp.target_file
                if rel.startswith("src/"):
                    rel = rel[4:]
                try:
                    self.engine.update(rel)
                except Exception:
                    pass

        return total_tokens

    def _create_module_blocks(self, task, goal: str) -> list:
        """Create a sequence of Blocks for a ModuleTask.

        Each module gets: ANALYZE → IMPLEMENT × N → REVIEW → REFACTOR → TEST → ABSTRACT
        """
        from ..core.models import Block, BlockType

        blocks = []
        idx = 0

        # Block 0: ANALYZE — generate blueprint
        blocks.append(Block(
            index=idx, block_type=BlockType.ANALYZE,
            objective=f"Generate blueprint for {task.name}",
            branch_name=task.branch_name,
            meta={"module": task.name, "goal": goal},
        ))
        idx += 1

        # Blocks 1..N: IMPLEMENT — one per type
        for type_name in task.types:
            blocks.append(Block(
                index=idx, block_type=BlockType.IMPLEMENT,
                objective=f"Translate {type_name} from {task.name}",
                branch_name=task.branch_name,
                meta={"module": task.name, "type": type_name},
            ))
            idx += 1

        # Block N+1: REVIEW
        blocks.append(Block(
            index=idx, block_type=BlockType.REVIEW,
            objective=f"Review {task.name} code quality",
            branch_name=task.branch_name,
            meta={"module": task.name},
        ))
        idx += 1

        # Block N+2: REFACTOR
        blocks.append(Block(
            index=idx, block_type=BlockType.REFACTOR,
            objective=f"Fix quality issues in {task.name}",
            branch_name=task.branch_name,
            meta={"module": task.name},
        ))
        idx += 1

        # Block N+3: TEST
        blocks.append(Block(
            index=idx, block_type=BlockType.TEST,
            objective=f"Test {task.name} compilation and health",
            branch_name=task.branch_name,
            meta={"module": task.name},
        ))
        idx += 1

        # Block N+4: ABSTRACT
        blocks.append(Block(
            index=idx, block_type=BlockType.ABSTRACT,
            objective=f"Extract learnings from {task.name}",
            branch_name=task.branch_name,
            meta={"module": task.name},
        ))

        # Link hash chain
        prev = None
        for block in blocks:
            if prev:
                block.prev_hash = prev.hash or ""
            prev = block

        return blocks

    def _log_block(self, block) -> None:
        """Log block execution for visibility."""
        icon = {
            "analyze": "📋", "implement": "⚙", "review": "🔍",
            "refactor": "🔧", "test": "🧪", "abstract": "💡",
        }.get(block.block_type.value, "•")
        self._log(f"  {icon} Block {block.index} [{block.block_type.value}] {block.objective}")

    def _fix_reviewer_issues(
        self, module_name: str, files: dict, review_issues: list,
        project_dir: Path,
    ) -> dict:
        """Use LLM to fix critical issues found by the ModuleReviewer.

        This is the bridge: reviewer detects → quality engine acts.
        Targets: missing DI, as-any casts, empty interfaces, integration gaps.
        """
        if not review_issues or not files:
            return files

        # Build a targeted fix prompt from reviewer findings
        issues_text = "\n".join(f"- {issue}" for issue in review_issues[:5])

        from ..core.llm.providers import LLMMessage
        for filename, code in files.items():
            if filename.endswith("index.ts"):
                continue

            system = (
                "You are a code quality fixer. Fix the specific issues listed below. "
                "Keep ALL existing logic intact. Only fix what's listed. "
                "Return the COMPLETE fixed file."
            )
            user = (
                f"## Issues to fix in {filename}:\n{issues_text}\n\n"
                f"## Current code:\n```typescript\n{code}\n```\n\n"
                f"Fix ONLY the listed issues. Return the COMPLETE file."
            )

            try:
                budget = getattr(self, 'dispatch', None)
                max_tok = budget.budget_for("quality_improve") if budget else 12000
                resp = self.llm.complete_with_usage(
                    [LLMMessage("system", system), LLMMessage("user", user)],
                    temperature=0.2, max_tokens=max_tok,
                )
                fixed = resp.content.strip()

                # Strip fences
                if fixed.startswith("```"):
                    lines = fixed.split("\n")
                    lines = [l for l in lines if not l.strip().startswith("```")]
                    fixed = "\n".join(lines)

                # Only accept if it didn't shrink drastically
                if len(fixed.splitlines()) >= len(code.splitlines()) * 0.7:
                    files[filename] = fixed
                    self._log(f"  [quality] fixed {len(review_issues)} reviewer issues in {filename}")

            except Exception as e:
                self._log(f"  [quality] reviewer fix failed for {filename}: {e}")

        return files

    def _should_experiment(self, task: ModuleTask) -> bool:
        """Decide if a module should use the experiment engine (variants A/B).

        Triggers when:
        - Module has >2 dependents (core module, high impact)
        - FunctionalSpec marks component as "complex"
        - Module has >8 types in blueprint
        """
        spec = getattr(self, '_functional_spec', None)
        if spec:
            for comp in spec.components:
                if comp.name == task.name and comp.complexity == "complex":
                    # Only experiment if we have dependents
                    # (no point experimenting on leaf modules)
                    if task.depends_on:
                        return False  # Complex leaf — depth loop handles it
                    # Complex with dependents — experiment
                    return True
        return False

    def _process_module_with_experiment(
        self, task: ModuleTask, project_dir: Path,
        target: str, references: list, project_bp
    ) -> "BranchResult":
        """Process a module using the experiment engine (variants A/B).

        1. Generate 2 variants with different approaches
        2. Evaluate both without LLM
        3. Pick winner or combine
        4. Continue with normal fix pipeline
        """
        from ..engines.experiment import VariantGenerator, VariantEvaluator, VariantCombiner

        self._log(f"  [experiment] generating variants for {task.name}...")

        # Generate blueprint first (same for both variants)
        br = self._process_module(task, project_dir, target, references, project_bp)

        # If module already clean, no need to experiment
        if br.tsc_errors_final == 0 and br.total_loc > 50:
            self._log(f"  [experiment] {task.name} already clean, skipping variants")
            return br

        # Read the generated code
        module_dir = project_dir / "src" / task.name
        files = self._read_module_files(module_dir)
        if not files:
            return br

        # Generate variant B with different approach
        try:
            generator = VariantGenerator(self.llm, verbose=self.verbose)
            bp_file = project_dir / "blueprints" / f"{task.name}.bp.yaml"
            bp_yaml = bp_file.read_text() if bp_file.exists() else ""

            spec_ctx = ""
            spec = getattr(self, '_functional_spec', None)
            if spec:
                spec_ctx = spec.to_prompt_context()

            variants = generator.generate_variants(
                blueprint_yaml=bp_yaml,
                context=f"Module: {task.name}\nDependencies: {task.depends_on}",
                spec_context=spec_ctx,
                max_variants=2,
            )

            if len(variants) < 2:
                self._log(f"  [experiment] only {len(variants)} variant(s), keeping original")
                return br

            # Evaluate
            evaluator = VariantEvaluator(project_dir, verbose=self.verbose)
            results = evaluator.evaluate_all(variants)

            # Compare with existing code
            from ..engines.experiment.variants import Variant
            original_variant = Variant(id="original", approach="pipeline default",
                                       code=list(files.values())[0] if files else "")
            original_result = evaluator.evaluate(original_variant)

            # If original is better, keep it
            if original_result.score() >= results[0].score():
                self._log(f"  [experiment] original wins "
                          f"({original_result.score():.2f} vs {results[0].score():.2f})")
                return br

            # Combine best variant with original
            combiner = VariantCombiner(self.llm, verbose=self.verbose)
            combined = combiner.combine(
                [original_variant, variants[0]],
                [original_result, results[0]],
            )

            if combined and combined.code:
                # Write combined code
                main_file = next(
                    (f for f in sorted(files.keys()) if not f.endswith("index.ts") and f.startswith("i")),
                    list(files.keys())[0] if files else None
                )
                if main_file:
                    (module_dir / Path(main_file).name).write_text(combined.code)
                    br.tokens_used += generator.total_tokens + combiner.tokens_used
                    self._log(f"  [experiment] combined variant applied")

                    # Store as feature
                    try:
                        from ..engines.experiment.features import FeatureStore, Feature
                        store = FeatureStore()
                        store.add(Feature(
                            id=f"{target}_{task.name}",
                            pattern=f"Best approach for {task.name}",
                            domain=getattr(spec, 'domain', '') if spec else '',
                            loc=len(combined.code.splitlines()),
                            quality_score=results[0].score(),
                            approach=variants[0].approach,
                            method_names=[],
                        ))
                    except Exception:
                        pass

        except Exception as e:
            self._log(f"  [experiment] failed: {e}")

        return br

    def _collect_dependency_context(self, task: ModuleTask,
                                    project_dir: Path) -> dict[str, str]:
        """Collect .ts files from dependency modules as context for the fix loop."""
        context = {}
        for dep_name in task.depends_on:
            dep_dir = project_dir / "src" / dep_name
            if not dep_dir.exists():
                continue
            for ts_file in dep_dir.glob("*.ts"):
                rel = str(ts_file.relative_to(project_dir))
                try:
                    context[rel] = ts_file.read_text()
                except Exception:
                    pass
        return context

    def _gather_context_files(self, project_dir: Path) -> dict[str, str]:
        """Collect ALL .ts files in the project for post-merge cross-module fix."""
        context: dict[str, str] = {}
        src_dir = project_dir / "src"
        if not src_dir.exists():
            return context
        for ts_file in src_dir.rglob("*.ts"):
            rel = str(ts_file.relative_to(project_dir))
            try:
                content = ts_file.read_text()
                if len(content) < 50_000:  # skip huge files
                    context[rel] = content
            except Exception:
                pass
        return context

    def _run_selective_discussion(self, task: ModuleTask,
                                    bp: ModuleBlueprint,
                                    project_dir: Path) -> int:
        """Run a lightweight blueprint discussion if module has >2 dependents.

        Returns tokens used. Modifies blueprint constraints in-place.
        """
        if not self.engine or not self.engine.is_initialized:
            return 0

        # Count how many other modules depend on this one
        dep_graph = self.engine.index.dependency_graph()
        dependents = [m for m, deps in dep_graph.items() if task.name in deps]

        if len(dependents) < 2:
            return 0

        self._log(f"  discussion: {task.name} has {len(dependents)} dependents "
                  f"({', '.join(dependents)}), debating blueprint...")

        # Build context about what depends on this module
        dep_context = f"Modules that depend on {task.name}: {', '.join(dependents)}"
        type_list = ", ".join(t.name for t in bp.types)

        system = (
            "You are reviewing a TypeScript module blueprint BEFORE code generation.\n"
            "This module is a FOUNDATION — multiple other modules depend on it.\n\n"
            "Evaluate the blueprint from 3 angles:\n"
            "1. ADVOCATE: What's good about these types for downstream consumers?\n"
            "2. CRITIC: What interfaces might cause problems for dependents?\n"
            "3. ARCHITECT: Are the types well-designed for extensibility?\n\n"
            "Output JSON with:\n"
            "- verdict: 'good' | 'needs_constraints'\n"
            "- constraints: list of 0-3 SHORT rules the translator MUST follow\n"
            "  (e.g. 'All public methods must return typed results, not any')\n"
            "- reasoning: one sentence explaining your verdict"
        )

        import yaml as _yaml
        bp_summary = _yaml.dump(
            {"types": [{"name": t.name, "kind": t.kind,
                        "fields": len(t.fields), "methods": len(t.methods)}
                       for t in bp.types]},
            default_flow_style=False,
        )

        user = (
            f"## Module: {task.name}\n"
            f"## Types: {type_list}\n"
            f"## {dep_context}\n\n"
            f"## Blueprint summary\n```yaml\n{bp_summary}```\n\n"
            f"Evaluate and output JSON only."
        )

        from ..core.llm.providers import LLMMessage
        try:
            resp = self.llm.complete_with_usage(
                [LLMMessage("system", system), LLMMessage("user", user)],
                temperature=0.3, max_tokens=1024,
            )
            tokens = resp.usage.total_tokens
            self.total_tokens += tokens

            import json
            text = resp.content.strip()
            if "```" in text:
                # Strip markdown fences
                import re
                text = re.sub(r'```\w*\n?', '', text).strip()
            data = json.loads(text)

            constraints = data.get("constraints", [])
            if constraints:
                for c in constraints[:3]:
                    bp.constraints.append(f"CONTRACT: {c}")
                self._log(f"  discussion result: {data.get('verdict', '?')} "
                          f"+ {len(constraints)} constraints")
                for c in constraints[:3]:
                    self._log(f"    → {c}")
            else:
                self._log(f"  discussion result: {data.get('verdict', 'good')} (no constraints)")

            return tokens
        except Exception as e:
            self._log(f"  discussion failed: {e}")
            return 0

    def _fix_imports(self, project_dir: Path, module_bp: ModuleBlueprint):
        """Run import resolver on generated code."""
        try:
            from ..engines.tool.graph import ProjectGraph
            from ..engines.tool.import_resolver import ImportResolver

            src_dir = project_dir / "src"
            if not src_dir.exists():
                return

            graph = ProjectGraph(src_dir)
            graph.scan()
            resolver = ImportResolver(graph)

            for type_bp in module_bp.types:
                if type_bp.status != "translated" or not type_bp.target_file:
                    continue
                code_path = project_dir / type_bp.target_file
                if not code_path.exists():
                    continue

                code = code_path.read_text()
                rel_file = str(Path(type_bp.target_file).relative_to("src"))
                report = resolver.resolve(code, rel_file)
                if report.fixes:
                    code_path.write_text(report.code)
                    self._log(f"  import-fix: {len(report.fixes)} fixes in {type_bp.name}")
        except Exception as e:
            self._log(f"  import-fix skipped: {e}")

    def _verify_export_name(self, type_bp: TypeBlueprint, project_dir: Path):
        """Verify that the generated file exports the type with the correct name.

        If the LLM renamed the type (e.g. MutationStrategy -> TransformationRule),
        fix it by replacing the wrong name with the correct one.
        """
        code_path = project_dir / type_bp.target_file
        if not code_path.exists():
            return

        code = code_path.read_text()
        expected = type_bp.name

        # Check if the expected name is exported
        import re
        export_pattern = rf'export\s+(class|interface|enum|type|abstract\s+class)\s+{re.escape(expected)}\b'
        if re.search(export_pattern, code):
            return  # All good

        # Find what name WAS exported instead
        wrong_pattern = r'export\s+(class|interface|enum|type|abstract\s+class)\s+(\w+)'
        match = re.search(wrong_pattern, code)
        if match:
            wrong_name = match.group(2)
            if wrong_name != expected:
                # Replace ALL occurrences of wrong name with correct name
                fixed = code.replace(wrong_name, expected)
                code_path.write_text(fixed)
                self._log(f"  name-fix: {wrong_name} -> {expected} in {type_bp.target_file}")

    def _generate_project_config(self, target: str,
                                 tasks: list[ModuleTask],
                                 project_dir: Path):
        """Generate tsconfig.json and package.json."""
        translator = BlueprintTranslator(self.llm, OUT_DIR, verbose=self.verbose)
        module_names = [t.name for t in tasks]
        translator.generate_project_config(target, module_names, project_dir)
        translator.generate_root_index(module_names, project_dir)

    def _build_emission_index(self, references: list[str]):
        """Build or load emission index for reference matching."""
        index_path = OUT_DIR / ".emission_index.json"
        if index_path.exists():
            try:
                self.emission_index = EmissionIndex.load(index_path, OUT_DIR)
                if self.emission_index.is_fresh():
                    self._log(f"emission index loaded: {self.emission_index.format_stats()}")
                    return
            except Exception:
                pass

        if references:
            self.emission_index = EmissionIndex(OUT_DIR)
            self.emission_index.build(references)
            self.emission_index.save(index_path)
            self._log(f"emission index built: {self.emission_index.format_stats()}")

    def _build_retrieval_engines(self, references: list[str]):
        """Build or load SemanticStore + CodeBlockStore for reference enrichment."""
        try:
            from ..engines.embedding.store import SemanticStore
            from ..engines.memory.block_store import CodeBlockStore
            import yaml

            # SemanticStore: TF-IDF index of descriptors
            store_path = OUT_DIR / ".semantic_store.json"
            if store_path.exists():
                try:
                    self.semantic_store = SemanticStore.load(store_path)
                    self._log(f"semantic store loaded: {self.semantic_store.format_stats()}")
                except Exception:
                    self.semantic_store = None

            if not self.semantic_store and references:
                self.semantic_store = SemanticStore()
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

            # CodeBlockStore: reusable code blocks
            block_store_path = OUT_DIR / ".block_store.json"
            if block_store_path.exists():
                try:
                    self.block_store = CodeBlockStore.load(block_store_path)
                    self._log(f"block store loaded: {self.block_store.format_stats()}")
                except Exception:
                    self.block_store = None
        except Exception as e:
            self._log(f"retrieval engines skipped: {e}")

    def _get_ref_paths(self, references: list[str]) -> list[str]:
        """Collect descriptor paths from reference projects."""
        ref_paths = []
        for proj in references:
            proj_dir = OUT_DIR / proj
            if proj_dir.is_dir():
                for f in proj_dir.rglob("*.yaml"):
                    if f.name not in ("workspace.yaml", "deps.yaml", "meta.yaml"):
                        ref_paths.append(str(f.relative_to(OUT_DIR)))
        return ref_paths

    def _blueprint_from_descriptors(self, task: ModuleTask,
                                    target_dir: str) -> Optional[ModuleBlueprint]:
        """Build a ModuleBlueprint directly from reference descriptors.

        When we have rich YAML descriptors for a reference module, we can
        extract fields, methods, and signatures directly instead of asking
        the LLM to invent them. This produces far more accurate blueprints.
        """
        if not task.ref_descriptors:
            return None

        try:
            import yaml as _yaml
        except ImportError:
            return None

        from .translator import to_kebab_case
        from ..core.models import FieldSpec, MethodSpec

        all_type_bps = []
        type_names_in_task = set(t.lower() for t in task.types)

        for desc_path in task.ref_descriptors:
            full_path = OUT_DIR / desc_path
            if not full_path.exists():
                continue

            try:
                data = _yaml.safe_load(full_path.read_text())
            except Exception:
                continue

            if not isinstance(data, dict):
                continue

            file_purpose = data.get("purpose", "")

            for type_def in data.get("types", []):
                name = type_def.get("name", "")
                if not name or name.startswith("_"):
                    continue

                # Only include types that were selected by the decomposer
                if name.lower() not in type_names_in_task:
                    continue

                # Map kind: struct -> class, trait -> interface, enum -> enum
                kind_map = {"struct": "class", "trait": "interface", "enum": "enum"}
                kind = kind_map.get(type_def.get("kind", "struct"), "class")

                # Extract fields
                fields = []
                for f in type_def.get("fields", []):
                    fname = f.get("name", "")
                    if fname and not fname.startswith("_"):
                        ftype = str(f.get("type", "unknown"))
                        # Map Python types to TypeScript
                        ftype = self._map_python_type(ftype)
                        fields.append(FieldSpec(
                            name=fname,
                            type=ftype,
                            default=str(f.get("default", "")),
                        ))

                # Extract methods
                methods = []
                for m in type_def.get("methods", []):
                    mname = m.get("name", "")
                    if not mname or mname.startswith("_") and mname != "__init__":
                        continue

                    sig = m.get("sig", "")
                    is_async = m.get("is_async", False)
                    vis = m.get("vis", "public")

                    # Convert __init__ to constructor
                    if mname == "__init__":
                        mname = "constructor"

                    # Build hint from calls if available
                    hint = ""
                    detail = m.get("detail", {})
                    calls = detail.get("calls", [])
                    if calls:
                        # Use the call list as implementation hints
                        call_names = [c.split("(")[0].split(".")[-1] for c in calls[:5]
                                      if isinstance(c, str)]
                        hint = "uses: " + ", ".join(call_names)

                    # Convert Python signature to TypeScript-friendly hint
                    ts_sig = self._convert_signature(mname, sig)

                    methods.append(MethodSpec(
                        name=mname,
                        sig=ts_sig,
                        hint=hint or file_purpose[:80] if file_purpose else "",
                        visibility=vis if vis != "public" else "public",
                        is_async=is_async,
                    ))

                # Extract bases
                bases = type_def.get("bases", [])
                extends = ""
                implements = []
                for base in bases:
                    base_str = str(base)
                    # Skip Python-specific bases
                    if base_str in ("ABC", "str", "Enum", "BaseModel", "object"):
                        continue
                    if not extends:
                        extends = base_str

                # Build context/description
                ctx = type_def.get("ctx", "")
                description = ctx[:200] if ctx else file_purpose[:200] if file_purpose else ""

                tb = TypeBlueprint(
                    name=name,
                    kind=kind,
                    target_file=f"{target_dir}/{to_kebab_case(name)}.ts",
                    extends=extends,
                    implements=implements,
                    fields=fields,
                    methods=methods,
                    description=description,
                    references=[desc_path],
                )
                all_type_bps.append(tb)

        if not all_type_bps:
            return None

        # Add types that are in task.types but not found in descriptors
        found_names = {t.name.lower() for t in all_type_bps}
        for type_name in task.types:
            if type_name.lower() not in found_names:
                all_type_bps.append(TypeBlueprint(
                    name=type_name,
                    kind="class",
                    target_file=f"{target_dir}/{to_kebab_case(type_name)}.ts",
                ))

        bp = ModuleBlueprint(
            name=task.name,
            language="typescript",
            target_dir=target_dir,
            types=all_type_bps,
            description=task.description[:300] if task.description else "",
            references=task.ref_descriptors,
        )

        self._log(f"  blueprint from descriptors: {len(all_type_bps)} types, "
                   f"{sum(len(t.methods) for t in all_type_bps)} methods")
        return bp

    @staticmethod
    def _map_python_type(ptype: str) -> str:
        """Map Python types to TypeScript equivalents."""
        mapping = {
            "Any": "unknown",
            "str": "string",
            "int": "number",
            "float": "number",
            "bool": "boolean",
            "None": "void",
            "Dict": "Record<string, unknown>",
            "List": "Array<unknown>",
            "Optional": "unknown | undefined",
            "Set": "Set<unknown>",
            "Tuple": "unknown[]",
        }
        for py, ts in mapping.items():
            if ptype == py:
                return ts
        return "unknown"

    @staticmethod
    def _convert_signature(method_name: str, sig: str) -> str:
        """Convert a Python method signature to a TypeScript-friendly hint.

        Input:  'evolve(self, ctx: EvolutionContext) -> Optional[SkillRecord]'
        Output: '(ctx: EvolutionContext): SkillRecord | undefined'
        """
        if not sig:
            return ""

        # Remove 'self' parameter
        sig = sig.replace("self, ", "").replace("self,", "").replace("self", "")

        # Remove method name prefix if present
        if "(" in sig:
            paren_idx = sig.index("(")
            # Check if there's a method name before the paren
            prefix = sig[:paren_idx].strip()
            if prefix and not prefix.startswith("("):
                sig = sig[paren_idx:]

        # Convert return type
        if " -> " in sig:
            params_part, ret = sig.rsplit(" -> ", 1)
            ret = ret.strip()
            # Map Python return types
            ret = ret.replace("Optional[", "").rstrip("]")
            ret = ret.replace("None", "void")
            ret = ret.replace("str", "string")
            ret = ret.replace("int", "number")
            ret = ret.replace("float", "number")
            ret = ret.replace("bool", "boolean")
            ret = ret.replace("List[", "Array<").replace("]", ">")
            sig = f"{params_part}: {ret}"

        # Clean up multiline signatures
        sig = " ".join(sig.split())

        return sig

    def _read_module_files(self, module_dir: Path) -> dict[str, str]:
        """Read all .ts files in a module directory."""
        files = {}
        if not module_dir.exists():
            return files
        for ts_file in module_dir.glob("*.ts"):
            try:
                files[ts_file.name] = ts_file.read_text()
            except Exception:
                pass
        return files

    def _write_module_files(self, module_dir: Path, files: dict[str, str]):
        """Write improved files back to disk. Guardian checks before write."""
        for filename, code in files.items():
            path = module_dir / filename
            try:
                # Guardian check
                if hasattr(self, 'guardian'):
                    from ..engines.guardian.policy import Decision
                    decision = self.guardian.review(
                        "write_file", path=str(path),
                        turn_state=getattr(self.state_mgr, 'current_turn', None),
                    )
                    if decision == Decision.DENY:
                        self._log(f"  [guardian] DENIED write to {filename}")
                        continue
                path.write_text(code)
            except Exception:
                pass

    def _strip_boilerplate(self, module_dir: Path):
        """Strip defensive boilerplate from generated TypeScript files.

        Removes:
        - typeof/instanceof checks on typed parameters
        - Trivial JSDoc that restates the method signature
        - Empty catch blocks
        - Redundant null checks on non-nullable fields
        """
        import re as _re

        if not module_dir.exists():
            return

        for ts_file in module_dir.rglob("*.ts"):
            if ts_file.name == "index.ts":
                continue
            try:
                code = ts_file.read_text()
                original = code
                lines = code.split("\n")
                cleaned: list[str] = []
                i = 0
                skip_jsdoc = False
                jsdoc_buffer: list[str] = []

                while i < len(lines):
                    line = lines[i]
                    stripped = line.strip()

                    # Collect JSDoc blocks to analyze
                    if stripped.startswith("/**"):
                        jsdoc_buffer = [line]
                        j = i + 1
                        while j < len(lines) and "*/" not in lines[j]:
                            jsdoc_buffer.append(lines[j])
                            j += 1
                        if j < len(lines):
                            jsdoc_buffer.append(lines[j])

                        # Check if JSDoc is trivial (only @param/@returns restating types)
                        jsdoc_text = " ".join(l.strip().lstrip("*/ ") for l in jsdoc_buffer)
                        has_useful = _re.search(
                            r"(?:algorithm|complexity|note|important|warning|example|"
                            r"O\(|sweep|merge|binary|recursive|amortized|"
                            r"invariant|precondition|postcondition|trade.?off)",
                            jsdoc_text, _re.IGNORECASE
                        )
                        # Count meaningful content lines (not just @param, @returns, @throws)
                        content_lines = [
                            l for l in jsdoc_buffer
                            if l.strip().lstrip("* ") and
                            not _re.match(r"^\s*\*?\s*@(param|returns?|throws?|type)\b", l.strip()) and
                            not _re.match(r"^\s*\/?\*+\/?$", l.strip()) and
                            not _re.match(r"^\s*\*\s*(Gets?|Sets?|Creates?|Deletes?|Updates?|Returns?|Checks?|Validates?)\s+", l.strip())
                        ]
                        if not has_useful and len(content_lines) <= 1:
                            # Trivial JSDoc — skip it
                            i = j + 1
                            continue

                        # Keep JSDoc as-is
                        cleaned.extend(jsdoc_buffer)
                        i = j + 1
                        continue

                    # Remove typeof checks on typed params:
                    # "if (typeof x !== 'string') { throw new TypeError(...); }"
                    # or multi-line version
                    if _re.match(r"\s*if\s*\(\s*typeof\s+\w+\s*!==\s*['\"]", stripped):
                        # Check if next line(s) are just throw + closing brace
                        j = i + 1
                        while j < len(lines) and lines[j].strip() in ("", "}"):
                            j += 1
                        if j <= i + 3:  # Small block: if + throw + }
                            # Skip this validation block
                            while i < len(lines) and not (lines[i].strip() == "}" and i > j - 3):
                                i += 1
                            i += 1  # skip closing }
                            continue

                    # Remove instanceof checks on typed params
                    if _re.match(r"\s*if\s*\(\s*!\(\s*\w+\s+instanceof\s+\w+\s*\)\s*\)", stripped):
                        j = i + 1
                        while j < len(lines) and lines[j].strip() in ("", "}"):
                            j += 1
                        if j <= i + 3:
                            while i < len(lines) and not (lines[i].strip() == "}" and i > j - 3):
                                i += 1
                            i += 1
                            continue

                    # Remove "if (!param) throw" on typed non-optional params
                    if _re.match(r"\s*if\s*\(\s*!\w+\s*\)\s*\{\s*$", stripped) or \
                       _re.match(r"\s*if\s*\(\s*!\w+\s*\)\s+throw\b", stripped):
                        if "throw" in stripped:
                            i += 1
                            continue
                        elif i + 1 < len(lines) and "throw" in lines[i + 1]:
                            i += 3  # skip if { throw }
                            continue

                    cleaned.append(line)
                    i += 1

                new_code = "\n".join(cleaned)
                if new_code != original:
                    ts_file.write_text(new_code)
            except Exception:
                pass

    def _modernize_idioms(self, module_dir: Path):
        """Transform old-style JS patterns into modern TypeScript idioms.

        Transforms:
        - `x && x.y` → `x?.y`
        - `if (x !== null && x !== undefined)` → `if (x != null)`
        - `x !== undefined ? x : default` → `x ?? default`
        - `x || default` → `x ?? default` (for non-boolean contexts)
        - `if (x) { return x.y; }` → `return x?.y;`
        """
        import re as _re

        if not module_dir.exists():
            return

        for ts_file in module_dir.rglob("*.ts"):
            if ts_file.name == "index.ts":
                continue
            try:
                code = ts_file.read_text()
                original = code

                # Pattern: `x && x.y` → `x?.y` (member access guard)
                # Match: `foo && foo.bar` or `this.foo && this.foo.bar`
                code = _re.sub(
                    r'\b(\w+(?:\.\w+)*)\s*&&\s*\1\.(\w+)',
                    r'\1?.\2',
                    code
                )

                # Pattern: `x !== undefined && x !== null` → `x != null`
                code = _re.sub(
                    r'(\w+)\s*!==\s*undefined\s*&&\s*\1\s*!==\s*null',
                    r'\1 != null',
                    code
                )
                code = _re.sub(
                    r'(\w+)\s*!==\s*null\s*&&\s*\1\s*!==\s*undefined',
                    r'\1 != null',
                    code
                )

                # Pattern: `x === undefined || x === null` → `x == null`
                code = _re.sub(
                    r'(\w+)\s*===\s*undefined\s*\|\|\s*\1\s*===\s*null',
                    r'\1 == null',
                    code
                )
                code = _re.sub(
                    r'(\w+)\s*===\s*null\s*\|\|\s*\1\s*===\s*undefined',
                    r'\1 == null',
                    code
                )

                # Pattern: `x !== undefined ? x : default` → `x ?? default`
                code = _re.sub(
                    r'(\w+(?:\.\w+)*)\s*!==\s*undefined\s*\?\s*\1\s*:\s*',
                    r'\1 ?? ',
                    code
                )
                code = _re.sub(
                    r'(\w+(?:\.\w+)*)\s*!==\s*null\s*\?\s*\1\s*:\s*',
                    r'\1 ?? ',
                    code
                )
                code = _re.sub(
                    r'(\w+(?:\.\w+)*)\s*!=\s*null\s*\?\s*\1\s*:\s*',
                    r'\1 ?? ',
                    code
                )

                # Pattern: `x || defaultValue` → `x ?? defaultValue`
                # Only for safe cases: assignment context with non-boolean defaults
                # Match: `= expr || 'string'` or `= expr || number` or `= expr || []`
                code = _re.sub(
                    r'(=\s*\w+(?:\.\w+)*)\s*\|\|\s*([\'"\d\[\{])',
                    r'\1 ?? \2',
                    code
                )

                # Pattern: `if (x !== undefined)` on its own line → `if (x != null)`
                code = _re.sub(
                    r'if\s*\(\s*(\w+(?:\.\w+)*)\s*!==\s*undefined\s*\)',
                    r'if (\1 != null)',
                    code
                )

                # Pattern: `x ? x.method() : undefined` → `x?.method()`
                code = _re.sub(
                    r'(\w+)\s*\?\s*\1\.(\w+\([^)]*\))\s*:\s*undefined',
                    r'\1?.\2',
                    code
                )

                if code != original:
                    ts_file.write_text(code)
            except Exception:
                pass

    def _count_loc(self, directory: Path) -> int:
        """Count total lines of code in a directory."""
        if not directory.exists():
            return 0
        total = 0
        for ts_file in directory.rglob("*.ts"):
            try:
                total += len(ts_file.read_text().splitlines())
            except Exception:
                pass
        return total

    def _strip_fences(self, text: str) -> str:
        """Remove markdown code fences from LLM output."""
        import re
        text = text.strip()
        if "```" in text:
            lines = text.split("\n")
            content_lines = [
                line for line in lines
                if not re.match(r'^\s*```\w*\s*$', line)
            ]
            return "\n".join(content_lines).strip()
        return text
