"""
DevManager — coordinates multiple DevSupervisors across branches.

Sits above DevSupervisor. Runs main branch first, then launches
evaluation/experiment branches in parallel with ThreadPoolExecutor.

Usage:
    manager = DevManager(config)
    project = manager.run_project(goal, target, references, eval_yaml_path)
"""
from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

from .branch import Branch, Project, EvalConfig, EvalResult, load_eval_yaml
from .plan import BranchType, BranchStatus
from .supervisor import DevSupervisor
from .evaluation import (
    create_eval_plan, setup_eval_workspace, modify_blueprint_for_eval,
    benchmark_type, format_eval_report,
)
from .blueprint import ModuleBlueprint
from ..engines.blueprint.project import ProjectBlueprint


class DevManager:
    """Coordinates multiple DevSupervisors across branches of a project.

    Phase 1: Run main branch (full pipeline via DevSupervisor)
    Phase 2: Run evaluation branches in parallel (one type per branch)
    Phase 3: Compare & report
    """

    def __init__(self, config: dict = None):
        self.config = config or {}
        self.max_parallel = self.config.get("max_parallel", 3)
        self.verbose = self.config.get("verbose", False)
        self.projects_dir = Path("projects")

        # Shared guardrail across all branches
        from .guardrails import RunGuard, RunLimits
        self.guard = RunGuard(RunLimits.from_config(self.config))
        # Inject guard into supervisor configs so all share the same instance
        self.config["_guard"] = self.guard

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [manager] {msg}")

    def run_project(self, goal: str, target: str,
                    references: list[str] = None,
                    max_iterations: int = 100,
                    project_bp: ProjectBlueprint = None,
                    eval_yaml: Path = None) -> Project:
        """Full project execution: main + evaluations.

        Args:
            goal: Development goal
            target: Target project name
            references: Reference projects for emission index
            max_iterations: Max iterations for main branch
            project_bp: Layered project blueprint (optional)
            eval_yaml: Path to eval.yaml with evaluation configs
        """
        t0 = time.time()

        # 1. Create project
        project = Project(
            name=target,
            goal=goal,
            project_dir=str(self.projects_dir / target),
        )

        # 2. Create main branch
        main_branch = project.add_branch("main", BranchType.MAIN)
        self._log(f"project {target}: main branch created")

        # 3. Run main branch
        self._log("running main branch...")
        main_branch.status = BranchStatus.RUNNING
        try:
            supervisor = DevSupervisor(self.config)
            plan = supervisor.run(
                goal, target, references,
                max_iterations=max_iterations,
                project_bp=project_bp,
            )
            main_branch.plan = plan
            main_branch.status = BranchStatus.COMPLETED
            main_branch.completed_at = time.time()
            self._log(f"main branch done: {plan.total_tokens:,} tokens, "
                       f"{len(plan.completed_blocks)} blocks")
        except Exception as e:
            main_branch.status = BranchStatus.FAILED
            self._log(f"main branch failed: {e}")
            # Still try to save project state
            self._save_project(project)
            raise

        # 4. Load evaluation configs
        eval_configs: list[EvalConfig] = []
        if eval_yaml:
            eval_configs = load_eval_yaml(eval_yaml)
        else:
            # Check default location
            default_eval = self.projects_dir / target / "eval.yaml"
            if default_eval.exists():
                eval_configs = load_eval_yaml(default_eval)

        if not eval_configs:
            self._log("no evaluation configs found, skipping eval phase")
            self._save_project(project)
            print(project.format_status())
            return project

        # 5. Create evaluation branches
        for cfg in eval_configs:
            name = f"eval/{cfg.target_type.lower()}-{cfg.variation[:20].replace(' ', '-').lower()}"
            project.add_branch(name, BranchType.EVALUATION,
                               parent="main", eval_config=cfg)
            self._log(f"eval branch: {name}")

        # 6. Run evaluations in parallel
        self._log(f"running {len(project.evaluations)} eval branches "
                   f"(max_parallel={self.max_parallel})...")
        self._run_eval_branches(project, references)

        # 7. Report
        report = format_eval_report(project)
        print(report)

        # 8. Save
        self._save_project(project)
        self._save_eval_results(project)

        elapsed = time.time() - t0
        self._log(f"project complete: {elapsed:.1f}s, "
                   f"{project.total_tokens:,} total tokens")

        return project

    def run_eval_only(self, target: str,
                      references: list[str] = None,
                      eval_yaml: Path = None) -> Project:
        """Run only the evaluation phase on an existing project.

        Assumes main branch already completed. Useful for re-running
        evaluations with different configs without rebuilding main.
        """
        project_dir = self.projects_dir / target
        project_file = project_dir / "project.json"

        # Load or create project
        if project_file.exists():
            project = Project.load(project_file)
            self._log(f"loaded existing project: {project.name}")
        else:
            # Create minimal project pointing to existing generated code
            project = Project(
                name=target,
                goal=f"Evaluate {target}",
                project_dir=str(project_dir),
            )
            # Create a placeholder main branch (code already exists)
            main = project.add_branch("main", BranchType.MAIN)
            main.status = BranchStatus.COMPLETED

        # Load eval configs
        eval_configs: list[EvalConfig] = []
        if eval_yaml:
            eval_configs = load_eval_yaml(eval_yaml)
        else:
            default_eval = project_dir / "eval.yaml"
            if default_eval.exists():
                eval_configs = load_eval_yaml(default_eval)

        if not eval_configs:
            self._log("no evaluation configs found")
            return project

        # Clear old eval branches and results
        project.branches = [b for b in project.branches
                            if b.branch_type != BranchType.EVALUATION]

        # Create new eval branches
        for cfg in eval_configs:
            name = f"eval/{cfg.target_type.lower()}-{cfg.variation[:20].replace(' ', '-').lower()}"
            project.add_branch(name, BranchType.EVALUATION,
                               parent="main", eval_config=cfg)

        # Run
        self._run_eval_branches(project, references)

        # Report & save
        report = format_eval_report(project)
        print(report)
        self._save_project(project)
        self._save_eval_results(project)

        return project

    def _run_eval_branches(self, project: Project,
                           references: list[str] = None):
        """Run all evaluation branches in parallel."""
        eval_branches = project.evaluations
        if not eval_branches:
            return

        # Guardrail: cap eval branches
        max_branches = self.guard.limits.max_eval_branches
        if len(eval_branches) > max_branches:
            print(f"  ⚠ Capping eval branches: {len(eval_branches)} → {max_branches}")
            eval_branches = eval_branches[:max_branches]

        project_dir = Path(project.project_dir)
        max_workers = min(self.max_parallel, self.guard.limits.max_parallel_branches)

        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = {}
            for branch in eval_branches:
                if not self.guard.check_eval_branch():
                    self._log(f"eval branch limit reached, skipping {branch.name}")
                    branch.status = BranchStatus.FAILED
                    continue
                future = pool.submit(
                    self._run_one_eval, project_dir, branch, references
                )
                futures[future] = branch

            for future in as_completed(futures):
                branch = futures[future]
                try:
                    result = future.result()
                    branch.eval_results.append(result)
                    branch.status = BranchStatus.COMPLETED
                    branch.completed_at = time.time()
                    self._log(
                        f"eval done: {branch.name} — "
                        f"LOC={result.metrics.get('loc', '?')}, "
                        f"density={result.metrics.get('density', '?')}%"
                    )
                except Exception as e:
                    branch.status = BranchStatus.FAILED
                    self._log(f"eval failed: {branch.name} — {e}")

    def _run_one_eval(self, project_dir: Path, branch: Branch,
                      references: list[str] = None) -> EvalResult:
        """Run one evaluation branch: re-generate ONE type with variation."""
        cfg = branch.eval_config
        branch.status = BranchStatus.RUNNING

        # 1. Setup workspace (copy main's code, delete target type)
        branch_dir = setup_eval_workspace(project_dir, branch.name, cfg)

        # 2. Load module blueprint
        bp_path = branch_dir / "blueprints" / f"{cfg.target_module}.bp.yaml"
        if not bp_path.exists():
            # Fallback to main's blueprint
            bp_path = project_dir / "blueprints" / f"{cfg.target_module}.bp.yaml"

        if not bp_path.exists():
            raise FileNotFoundError(
                f"Blueprint not found: {bp_path}"
            )

        module_bp = ModuleBlueprint.load(bp_path)

        # 3. Modify blueprint with variation constraints
        module_bp = modify_blueprint_for_eval(module_bp, cfg)

        # 4. Create supervisor and translate just the target type
        eval_supervisor = DevSupervisor(self.config)

        # Find the target type blueprint
        target_type_bp = None
        for t in module_bp.types:
            if t.name == cfg.target_type:
                target_type_bp = t
                break

        if not target_type_bp:
            raise ValueError(
                f"Type {cfg.target_type} not found in {cfg.target_module} blueprint"
            )

        # Reset the target type to pending
        target_type_bp.status = "pending"

        # 5. Initialize translator with optional overrides
        from .translator import BlueprintTranslator
        translator = BlueprintTranslator(
            llm=eval_supervisor.llm,
            verbose=self.verbose,
        )

        # Apply temperature override
        temperature = cfg.temperature if cfg.temperature >= 0 else None

        # Translate the type
        from .translator import to_kebab_case
        target_type_bp.target_file = (
            f"src/{cfg.target_module}/{to_kebab_case(cfg.target_type)}.ts"
        )

        # Add variation as extra constraint in the system prompt
        if cfg.system_override:
            # TODO: pass system_override to translator
            pass

        rel_path, tokens, refs_used = translator.translate_type(
            target_type_bp, module_bp, branch_dir
        )

        # 6. Benchmark against main
        result = benchmark_type(project_dir, branch_dir, cfg, module_bp)
        result.metrics["tokens"] = tokens
        result.metrics["refs_used"] = len(refs_used)

        return result

    def _save_project(self, project: Project):
        """Save project state."""
        project_dir = Path(project.project_dir)
        project_dir.mkdir(parents=True, exist_ok=True)
        project.save(project_dir / "project.json")

    def _save_eval_results(self, project: Project):
        """Save evaluation results to YAML for easy inspection."""
        import yaml

        project_dir = Path(project.project_dir)
        results = []
        for branch in project.evaluations:
            for r in branch.eval_results:
                results.append({
                    "branch": r.branch_name,
                    "type": r.target_type,
                    "variation": r.variation,
                    "metrics": r.metrics,
                    "code_hash": r.code_hash,
                })

        if results:
            out_path = project_dir / "eval-results.yaml"
            out_path.write_text(yaml.dump(
                {"evaluation_results": results},
                default_flow_style=False, sort_keys=False,
            ))
            self._log(f"results saved: {out_path}")
