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

from ..llm.providers import LLMProvider
from .. import OUT_DIR

from .git_manager import GitManager
from .compile_fix_loop import CompileFixLoop
from .task_decomposer import TaskDecomposer, ModuleTask
from .translator import BlueprintTranslator
from .blueprint import ModuleBlueprint, TypeBlueprint
from .emission import EmissionIndex
from .density import DensityAnalyzer


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


@dataclass
class PipelineResult:
    """Result of the full branch pipeline."""
    branches: list[BranchResult] = field(default_factory=list)
    total_loc: int = 0
    total_tokens: int = 0
    elapsed_s: float = 0.0
    final_tsc_errors: int = 0

    def format_report(self) -> str:
        """Pretty-print the full pipeline result."""
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
            f"{self.elapsed_s:.1f}s, {self.final_tsc_errors} final tsc errors",
            f"{'━' * 70}",
        ])
        return "\n".join(lines)


class BranchPipelineOrchestrator:
    """Branch-per-module pipeline: decompose -> branch -> generate -> fix -> merge."""

    def __init__(self, config: dict = None):
        config = config or {}
        self.llm = LLMProvider(
            provider=config.get("provider", "groq"),
            model=config.get("model"),
        )
        self.verbose = config.get("verbose", False)
        self.projects_dir = Path("projects")

        self.git: Optional[GitManager] = None
        self.decomposer = TaskDecomposer(self.llm, verbose=self.verbose)
        self.fix_loop: Optional[CompileFixLoop] = None
        self.emission_index: Optional[EmissionIndex] = None
        self.total_tokens = 0

        # Guardrails
        from .guardrails import RunGuard, RunLimits
        self.guard = RunGuard(RunLimits.from_config(config))

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [pipeline] {msg}")

    def run(self, goal: str, target: str,
            references: list[str] = None,
            project_bp=None) -> PipelineResult:
        """Main entry point: decompose -> branch -> generate -> fix -> merge."""
        start = time.time()
        references = references or []
        project_dir = self.projects_dir / target
        project_dir.mkdir(parents=True, exist_ok=True)

        # 1. Initialize git
        self.git = GitManager(project_dir, verbose=self.verbose)
        self.git.init_repo()
        self.git.ensure_main_branch()

        # 2. Initialize compile-fix loop
        self.fix_loop = CompileFixLoop(
            self.llm, project_dir,
            max_iterations=4, verbose=self.verbose,
        )

        # 3. Build emission index if references exist
        self._build_emission_index(references)

        # 4. Decompose into module tasks
        print(f"\n  Decomposing: {goal}")
        tasks = self.decomposer.decompose(
            goal=goal, target=target,
            references=references, project_bp=project_bp,
        )
        self.total_tokens += self.decomposer.total_tokens

        # 5. Generate project config on main
        self._generate_project_config(target, tasks, project_dir)
        self.git.commit_all(f"chore: project config for {target}")

        # 6. Process tasks in dependency order
        result = PipelineResult()
        levels = self.decomposer.topo_sort(tasks)

        for level_idx, level in enumerate(levels):
            print(f"\n  Level {level_idx}: {', '.join(t.name for t in level)}")
            for task in level:
                branch_result = self._process_module(
                    task, project_dir, target, references, project_bp,
                )
                result.branches.append(branch_result)
                result.total_tokens += branch_result.tokens_used
                result.total_loc += branch_result.total_loc

        # 7. Final tsc check on main
        self.git.checkout("main")
        final_check = self.fix_loop.check_tsc()
        result.final_tsc_errors = max(0, final_check.error_count)
        result.elapsed_s = time.time() - start
        result.total_tokens += self.total_tokens

        print(f"\n{result.format_report()}")
        return result

    def _process_module(self, task: ModuleTask, project_dir: Path,
                        target: str, references: list[str],
                        project_bp) -> BranchResult:
        """Process one module: branch -> generate -> fix -> merge."""
        start = time.time()
        br = BranchResult(module_name=task.name, branch_name=task.branch_name)

        print(f"\n    [{task.branch_name}] Generating {task.name} "
              f"({len(task.types)} types)...")

        try:
            # 1. Create branch from main
            self.git.checkout("main")
            if self.git.branch_exists(task.branch_name):
                self.git.checkout(task.branch_name)
            else:
                self.git.create_branch(task.branch_name, "main")

            # 2. Generate module code
            tokens = self._generate_module(task, project_dir, target, references, project_bp)
            br.tokens_used = tokens

            # 3. Count LOC
            module_dir = project_dir / "src" / task.name
            br.total_loc = self._count_loc(module_dir)
            br.types_generated = len(task.types)

            # 4. Commit generated code
            self.git.commit_all(f"feat({task.name}): generate {len(task.types)} types")

            # 5. Compile-fix loop
            context_files = self._collect_dependency_context(task, project_dir)

            initial_check = self.fix_loop.check_module(module_dir)
            br.tsc_errors_initial = max(0, initial_check.error_count)

            if not initial_check.success and initial_check.error_count > 0:
                iterations = self.fix_loop.run(module_dir, context_files)
                br.fix_iterations = len(iterations)
                br.tokens_used += self.fix_loop.total_tokens

                if iterations:
                    br.tsc_errors_final = iterations[-1].errors_after
                else:
                    br.tsc_errors_final = br.tsc_errors_initial

                # Commit fixes if any changes were made
                if self.git.has_uncommitted():
                    self.git.commit_all(f"fix({task.name}): resolve tsc errors")
            else:
                br.tsc_errors_final = 0

            # 6. Merge to main
            merged = self.git.merge(
                task.branch_name, "main",
                f"feat({task.name}): {task.description or f'{len(task.types)} types'}"
            )
            if merged:
                br.status = "merged"
                self.git.delete_branch(task.branch_name)
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

        status_icon = "OK" if br.status == "merged" else "FAIL"
        print(f"    [{task.branch_name}] {status_icon}: {br.total_loc} LOC, "
              f"{br.tsc_errors_initial}->{br.tsc_errors_final} errors, "
              f"{br.fix_iterations} fix rounds, {br.tokens_used:,} tokens")

        return br

    def _generate_module(self, task: ModuleTask, project_dir: Path,
                         target: str, references: list[str],
                         project_bp) -> int:
        """Generate all types for a module using BlueprintTranslator."""
        # Build translator
        translator = BlueprintTranslator(
            self.llm, OUT_DIR, verbose=self.verbose,
            emission_index=self.emission_index,
        )

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

        goal = f"Module '{task.name}' with types: {', '.join(task.types)}."
        if layer_desc:
            goal += f" {layer_desc}."

        bp, bp_tokens = translator.generate_blueprint(
            module_name=task.name,
            goal=goal,
            ref_paths=ref_paths,
            language="typescript",
            target_dir=f"src/{task.name}",
        )

        # Blueprint guardrail: reject if LLM generated >2x the requested types
        max_allowed = len(task.types) * 2
        if len(bp.types) > max_allowed:
            self._log(f"  blueprint inflated: {len(bp.types)} types vs {len(task.types)} requested, trimming to requested")
            # Keep only the types that were explicitly requested
            requested_names = set(t.lower() for t in task.types)
            kept = [t for t in bp.types if t.name.lower() in requested_names
                    or any(t.name.lower() == rn for rn in requested_names)]
            # If we lost some requested types, they'll be added below
            bp.types = kept

        # Ensure all planned types exist in blueprint
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

        # Save blueprint
        bp_dir.mkdir(parents=True, exist_ok=True)
        bp.save(bp_dir / f"{task.name}.bp.yaml")

        # Translate each type
        total_tokens = bp_tokens
        for type_bp in bp.types:
            try:
                file_path, tokens, refs_used = translator.translate_type(
                    type_bp, bp, project_dir,
                )
                total_tokens += tokens
                self._log(f"  translated {type_bp.name} -> {file_path}")

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
        """Second pass: enhance generated code with richer implementations."""
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

        # Build enhancement prompt
        import yaml as _yaml
        bp_yaml = _yaml.dump(
            type_bp.to_dict(), default_flow_style=False,
            allow_unicode=True, sort_keys=False, width=120,
        )

        system = (
            "You are enhancing TypeScript code. The code below is functionally correct "
            "but sparse. Add: complete error handling, edge case coverage, JSDoc comments, "
            "private helper methods, and any missing method implementations from the blueprint.\n\n"
            "Rules:\n"
            "1. Output the COMPLETE enhanced file.\n"
            "2. Keep all existing functionality intact.\n"
            "3. Add missing methods from the blueprint.\n"
            "4. Add JSDoc for public methods.\n"
            "5. Add input validation and error handling.\n"
            "6. Output ONLY the source code. No markdown fences."
        )

        user = (
            f"## Current code\n```typescript\n{code}\n```\n\n"
            f"## Blueprint\n```yaml\n{bp_yaml}\n```\n\n"
            f"Enhance this code. Output the COMPLETE file."
        )

        from ..llm.providers import LLMMessage
        resp = self.llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", user)],
            temperature=0.2, max_tokens=12000,
        )

        enhanced = self._strip_fences(resp.content)
        if enhanced.strip() and len(enhanced.splitlines()) > len(code.splitlines()):
            code_path.write_text(enhanced + "\n")
            self._log(f"  enhanced {type_bp.name}: "
                      f"{len(code.splitlines())} -> {len(enhanced.splitlines())} LOC")

        return resp.usage.total_tokens

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
