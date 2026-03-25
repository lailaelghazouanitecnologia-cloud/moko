"""CLI entry point for ava dev and ava features."""
from __future__ import annotations

import argparse
import sys


def register_subparser(subparsers: argparse._SubParsersAction):
    """Register 'dev' subcommand."""
    p = subparsers.add_parser("dev", help="Iterative development agent with plan blockchain")
    p.add_argument("goal", nargs="?", help="Development goal")
    p.add_argument("-t", "--target", help="Target project name")
    p.add_argument("-r", "--ref", nargs="+", default=[], help="Reference projects")
    p.add_argument("--provider", default="groq", help="LLM provider")
    p.add_argument("--model", help="Override model")
    p.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    p.add_argument("--max-iterations", type=int, default=50, help="Max iteration blocks")
    p.add_argument("--budget", type=int, default=20000, help="On-demand context budget (chars)")
    p.add_argument("--resume", metavar="PLAN_ID", help="Resume a saved plan")
    p.add_argument("--plans", action="store_true", help="List saved plans")
    p.add_argument("--density", metavar="PROJECT", help="Run density analysis on a project")
    p.add_argument("--compose", action="store_true", help="Use blueprint composer (extraction-first)")
    p.add_argument("--branches", action="store_true",
                   help="Use branch-per-module pipeline (generate -> tsc fix -> merge)")

    # Branch & evaluation flags
    p.add_argument("--eval", action="store_true",
                   help="Run evaluation branches from eval.yaml after main")
    p.add_argument("--eval-only", action="store_true",
                   help="Run only evaluations (skip main, assumes it exists)")
    p.add_argument("--eval-file", metavar="PATH",
                   help="Path to eval.yaml (default: projects/<target>/eval.yaml)")
    p.add_argument("--eval-report", metavar="PROJECT",
                   help="Show evaluation report for a project")
    p.add_argument("--branch", metavar="NAME",
                   help="Run a specific branch only")
    p.add_argument("--max-parallel", type=int, default=3,
                   help="Max parallel evaluation branches")

    # Plan mode — show scope estimation for user acceptance before generation
    p.add_argument("--plan", action="store_true",
                   help="Plan mode: show scope and blueprint for approval before generating")

    # Style rules
    p.add_argument("--init", metavar="PROJECT",
                   help="Initialize .ava/ style config for a project")
    p.add_argument("--score", metavar="PROJECT",
                   help="Run rich quality analysis on a project")


def cmd_dev(args: argparse.Namespace):
    """Execute dev command."""
    from .supervisor import DevSupervisor
    from .. import OUT_DIR

    config = {
        "provider": args.provider,
        "model": args.model,
        "verbose": args.verbose,
        "budget_chars": args.budget,
    }

    # Style init
    if args.init:
        from pathlib import Path
        from ..engines.quality.style_rules import StyleRules

        project_dir = Path("projects") / args.init
        project_dir.mkdir(parents=True, exist_ok=True)
        StyleRules.generate_template(project_dir)
        print(f"Initialized .ava/ style config in {project_dir}")
        print(f"  .ava/style.yaml    — edit style preferences")
        print(f"  .ava/rules/        — add rule files (*.md)")
        print(f"  ava.md             — free-form project instructions")
        return

    # Rich quality score
    if args.score:
        from pathlib import Path
        from ..engines.quality.learned_scorer import ProfileExtractor, LearnedScorer, CodeProfile
        from ..engines.quality.style_rules import StyleRules

        project_dir = Path("projects") / args.score
        if not project_dir.exists():
            print(f"Project not found: {project_dir}")
            sys.exit(1)

        extractor = ProfileExtractor()
        profile = extractor.extract_project(str(project_dir), name=args.score)

        print(f"{'━' * 70}")
        print(f"  QUALITY REPORT: {args.score}")
        print(f"{'━' * 70}")
        print(f"  Files: {profile.total_files}  LOC: {profile.total_loc}")
        print()

        # Print metrics by category
        _print_profile_report(profile)

        # Check style rules
        rules = StyleRules.load(project_dir)
        if rules.has_custom_rules():
            print(f"\n  Style Rules: loaded from .ava/")
            # Validate code against rules
            src_dir = project_dir / "src" if (project_dir / "src").exists() else project_dir
            total_violations = 0
            for ts_file in src_dir.rglob("*.ts"):
                code = ts_file.read_text()
                violations = rules.validate_code(code, str(ts_file.relative_to(project_dir)))
                total_violations += len(violations)
                for v in violations[:3]:  # show first 3 per file
                    print(f"    {v}")
            if total_violations > 0:
                print(f"    ... {total_violations} total violations")
        else:
            print(f"\n  No .ava/ style rules (run: ava dev --init {args.score})")

        print(f"{'━' * 70}")
        return

    # Density analysis
    if args.density:
        from pathlib import Path
        from .density import DensityAnalyzer

        project_dir = Path("projects") / args.density
        bp_dir = project_dir / "blueprints"
        if not bp_dir.exists():
            print(f"No blueprints found: {bp_dir}")
            sys.exit(1)

        analyzer = DensityAnalyzer(project_dir, OUT_DIR)
        densities = analyzer.analyze_project(bp_dir)

        if not densities:
            print("No modules analyzed.")
            return

        print(f"{'━' * 66}")
        print(f"  DENSITY REPORT: {args.density}")
        print(f"{'━' * 66}")
        for mod_d in densities:
            print(mod_d.format())
        avg = sum(d.avg_density for d in densities) / len(densities)
        total_loc = sum(d.total_lines for d in densities)
        print(f"{'─' * 66}")
        print(f"  Overall: density={avg:.0%}, {total_loc} LOC")
        print(f"{'━' * 66}")
        return

    # Evaluation report
    if args.eval_report:
        from pathlib import Path
        from .branch import Project
        from .evaluation import format_eval_report

        project_file = Path("projects") / args.eval_report / "project.json"
        if not project_file.exists():
            print(f"No project found: {project_file}")
            sys.exit(1)

        project = Project.load(project_file)
        print(format_eval_report(project))
        return

    # List plans
    supervisor = DevSupervisor(config)
    if args.plans:
        plans = supervisor.list_plans()
        if not plans:
            print("No saved plans.")
            return
        print(f"{'ID':<14} {'Goal':<40} {'Target':<12} {'Blocks':>6} {'Tokens':>8}")
        print("─" * 82)
        for p in plans:
            print(f"{p['id']:<14} {p['goal'][:40]:<40} {p['target']:<12} "
                  f"{p['blocks']:>6} {p['tokens']:>8,}")
        return

    # Resume plan
    if args.resume:
        plan_path = OUT_DIR / ".plans" / f"{args.resume}.json"
        if not plan_path.exists():
            print(f"Plan not found: {args.resume}")
            sys.exit(1)
        supervisor.resume(plan_path)
        return

    # Eval-only mode (skip main, just run evaluations)
    if args.eval_only:
        if not args.target:
            print("Error: --target (-t) is required for --eval-only")
            sys.exit(1)

        from pathlib import Path
        from .manager import DevManager

        config["max_parallel"] = args.max_parallel
        manager = DevManager(config)

        eval_yaml = Path(args.eval_file) if args.eval_file else None
        manager.run_eval_only(
            target=args.target,
            references=args.ref or None,
            eval_yaml=eval_yaml,
        )
        return

    # New plan
    if not args.goal:
        print("Usage: ava dev \"goal\" -t target [-r ref1 ref2 ...]")
        print("       ava dev \"goal\" -t target --eval")
        print("       ava dev --eval-only -t target")
        print("       ava dev --eval-report PROJECT")
        print("       ava dev --plans")
        print("       ava dev --resume PLAN_ID")
        sys.exit(1)

    if not args.target:
        print("Error: --target (-t) is required")
        sys.exit(1)

    # Intelligent project scope estimation via ProjectAdvisor
    from ..engines.blueprint.advisor import ProjectAdvisor
    from pathlib import Path

    advisor_db = str(Path("projects") / ".advisor_history.jsonl")
    advisor = ProjectAdvisor(db_path=advisor_db)
    scope = advisor.estimate(args.goal, references=args.ref)
    print(f"[advisor] {scope.summary()}")

    project_bp = None
    if scope.mode == "strict":
        # Full blueprint — known category with references
        project_bp = advisor.to_blueprint(scope, args.target, args.goal)
        if project_bp and project_bp.total_types == 0:
            # Strict mode but no predefined types → use game_engine_project for engines
            if scope.category == "game_engine":
                from ..engines.blueprint.project import game_engine_project
                project_bp = game_engine_project(args.target, args.goal)
        if project_bp:
            print(f"  → strict blueprint: {project_bp.total_types} types, "
                  f"{len(project_bp.layers)} layers")
    elif scope.mode == "guide":
        # Guide mode: blueprint with modules, LLM fills in types
        project_bp = advisor.to_blueprint(scope, args.target, args.goal)
        if project_bp:
            bp_path = Path("projects") / args.target / "project.bp.yaml"
            bp_path.parent.mkdir(parents=True, exist_ok=True)
            project_bp.save(bp_path)
            print(f"  → guide blueprint: {len(project_bp.layers)} modules suggested, "
                  f"LLM decides types")
    else:
        # Free mode: LLM generates blueprint from scratch
        from ..engines.blueprint.project import generate_project_blueprint
        from ..llm.providers import LLMProvider
        bp_llm = LLMProvider(provider=args.provider, model=args.model)
        project_bp = generate_project_blueprint(args.goal, args.target, bp_llm)
        if project_bp:
            bp_path = Path("projects") / args.target / "project.bp.yaml"
            bp_path.parent.mkdir(parents=True, exist_ok=True)
            project_bp.save(bp_path)
            print(f"  → free blueprint (LLM): {project_bp.total_types} types, "
                  f"{len(project_bp.layers)} layers")
        else:
            print("  → no blueprint, using non-layered LLM plan")

    # ── Plan mode: show scope for user acceptance ──────────
    if args.plan:
        print(f"\n{'━' * 60}")
        print(f"  PLAN: {args.goal}")
        print(f"{'━' * 60}")
        print(f"  Target:     {args.target}")
        print(f"  Category:   {scope.category}")
        print(f"  Mode:       {scope.mode}")
        print(f"  Confidence: {scope.confidence:.0%}")
        if scope.estimated_modules:
            print(f"  Modules:    ~{scope.estimated_modules}")
        if scope.estimated_loc:
            print(f"  Est. LOC:   ~{scope.estimated_loc}")
        if project_bp:
            print(f"\n  Blueprint layers:")
            for layer in project_bp.layers:
                types_info = f" ({len(layer.types)} types)" if layer.types else " (LLM decides)"
                print(f"    • {layer.name}: {layer.description}{types_info}")
        if args.ref:
            print(f"\n  References: {', '.join(args.ref)}")

        # Style hints that will guide generation
        from ..engines.quality.style_profile import StyleProfile, CLAUDE_DEFAULT_STYLE
        style = StyleProfile()
        hints = style.to_prompt_hints()
        if hints:
            print(f"\n  Style hints:")
            for h in hints:
                print(f"    - {h}")

        print(f"{'━' * 60}")
        answer = input("\n  Proceed? [Y/n/edit] ").strip().lower()
        if answer in ("n", "no"):
            print("  Cancelled.")
            return
        if answer in ("e", "edit"):
            print("  (Edit support coming soon — rerun with adjusted flags)")
            return
        print()

    # Branch pipeline mode
    if args.branches:
        from .branch_pipeline import BranchPipelineOrchestrator
        orchestrator = BranchPipelineOrchestrator(config)
        result = orchestrator.run(
            goal=args.goal,
            target=args.target,
            references=args.ref or None,
            project_bp=project_bp,
        )
        print(result.format_report())
        return

    # Run with or without evaluation
    if args.eval:
        from pathlib import Path
        from .manager import DevManager

        config["max_parallel"] = args.max_parallel
        manager = DevManager(config)

        eval_yaml = Path(args.eval_file) if args.eval_file else None
        manager.run_project(
            goal=args.goal,
            target=args.target,
            references=args.ref or None,
            max_iterations=args.max_iterations,
            project_bp=project_bp,
            eval_yaml=eval_yaml,
        )
    else:
        supervisor.run(
            goal=args.goal,
            target=args.target,
            references=args.ref,
            max_iterations=args.max_iterations,
            project_bp=project_bp,
        )


# ── Features subcommand ────────────────────────────────────

def register_features_subparser(subparsers: argparse._SubParsersAction):
    """Register 'features' subcommand."""
    p = subparsers.add_parser("features",
                              help="Analyze references, discover features, discuss & propose evals")
    p.add_argument("-t", "--target", required=True, help="Target project name")
    p.add_argument("-r", "--ref", nargs="+", required=True, help="Reference projects to analyze")
    p.add_argument("-g", "--goal", default="", help="Target project goal (for relevance scoring)")
    p.add_argument("--provider", default="groq", help="LLM provider")
    p.add_argument("--model", help="Override model")
    p.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    p.add_argument("--no-discuss", action="store_true",
                   help="Skip discussions, only list features")
    p.add_argument("--max-features", type=int, default=15,
                   help="Max features to discover")
    p.add_argument("--run", action="store_true",
                   help="After generating proposals, run evaluations immediately")
    p.add_argument("--max-parallel", type=int, default=3,
                   help="Max parallel eval branches (with --run)")


def cmd_features(args: argparse.Namespace):
    """Execute features command."""
    from .features import FeatureAnalyzer

    config = {
        "provider": args.provider,
        "model": args.model,
        "verbose": args.verbose,
    }

    analyzer = FeatureAnalyzer(config)
    report = analyzer.run(
        target=args.target,
        references=args.ref,
        goal=args.goal,
        discuss=not args.no_discuss,
        max_features=args.max_features,
    )

    # Optionally run evaluations on the generated proposals
    if args.run and report.discussions:
        proposals = sum(len(d.eval_proposals) for d in report.discussions)
        if proposals > 0:
            print(f"\nRunning {proposals} evaluation branches...")
            from .manager import DevManager

            config["max_parallel"] = args.max_parallel
            manager = DevManager(config)
            manager.run_eval_only(
                target=args.target,
                references=args.ref,
            )
        else:
            print("\nNo proposals generated, nothing to evaluate.")


# ── Duel subcommand ─────────────────────────────────────────

def register_duel_subparser(subparsers: argparse._SubParsersAction):
    """Register 'duel' subcommand."""
    p = subparsers.add_parser("duel",
                              help="Claude vs Ava head-to-head comparison")
    p.add_argument("-t", "--target", required=True, help="Target project name")
    p.add_argument("-g", "--goal", default="", help="Project goal / spec")
    p.add_argument("--provider", default="groq", help="LLM provider")
    p.add_argument("--model", help="Override model")
    p.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    # Legacy type-level duel (with refs)
    p.add_argument("-r", "--ref", nargs="+", help="Reference projects (type-level duel)")
    p.add_argument("-m", "--module", help="Module to compare (type-level duel)")
    p.add_argument("--types", nargs="+", help="Types to compare (type-level duel)")
    # Project-level duel (no refs, full pipeline)
    p.add_argument("--project", action="store_true",
                   help="Project-level duel: full pipeline, no refs, iterative")


def cmd_duel(args: argparse.Namespace):
    """Execute duel command."""
    config = {
        "provider": args.provider,
        "model": args.model,
        "verbose": args.verbose,
    }

    if args.project or not args.ref:
        # Project-level duel (fair, no refs)
        from .duel_project import ProjectDuel
        runner = ProjectDuel(config)
        runner.run(
            target=args.target,
            goal=args.goal,
        )
    else:
        # Type-level duel (with refs)
        from .duel import DuelRunner
        if not args.module or not args.types:
            print("Type-level duel requires: -m MODULE --types TYPE1 TYPE2")
            sys.exit(1)
        runner = DuelRunner(config)
        runner.run(
            target=args.target,
            references=args.ref,
            module=args.module,
            types=args.types,
            goal=args.goal,
        )


def _print_profile_report(profile):
    """Print a rich quality report organized by metric category."""
    categories = [
        ("Type System", [
            ("readonly_density", profile.readonly_density, "/100 LOC"),
            ("generic_density", profile.generic_density, "/100 LOC"),
            ("union_density", profile.union_density, "/100 LOC"),
            ("any_density", profile.any_density, "/100 LOC (lower=better)"),
            ("discriminated_unions", profile.discriminated_union_count, ""),
            ("branded_types", profile.branded_type_count, ""),
        ]),
        ("Complexity & Structure", [
            ("cognitive_complexity_avg", profile.cognitive_complexity_avg, "per func"),
            ("max_nesting_depth", profile.max_nesting_depth, ""),
            ("avg_nesting_depth", profile.avg_nesting_depth, ""),
            ("max_function_length", profile.max_function_length, "LOC"),
            ("long_function_ratio", profile.long_function_ratio, ""),
            ("parameter_count_avg", profile.parameter_count_avg, "per func"),
            ("early_return_ratio", profile.early_return_ratio, ""),
        ]),
        ("Coupling & Cohesion", [
            ("afferent_coupling_avg", profile.afferent_coupling_avg, "fan-in"),
            ("efferent_coupling_avg", profile.efferent_coupling_avg, "fan-out"),
            ("instability_index", profile.instability_index, "0-1"),
            ("circular_dependencies", profile.circular_dependency_count, ""),
            ("cohesion_ratio", profile.cohesion_ratio, "0-1"),
            ("god_class_count", profile.god_class_count, ""),
        ]),
        ("Naming & Legibility", [
            ("avg_identifier_length", profile.avg_identifier_length, "chars"),
            ("short_name_ratio", profile.short_name_ratio, ""),
            ("semantic_name_score", profile.semantic_name_score, "0-1"),
            ("naming_uniformity", profile.naming_convention_uniformity, "0-1"),
            ("magic_number_density", profile.magic_number_density, "/100 LOC"),
        ]),
        ("Error Handling", [
            ("error_boundary_coverage", profile.error_boundary_coverage, ""),
            ("empty_catch_count", profile.empty_catch_count, ""),
            ("null_safety_coverage", profile.null_safety_coverage, ""),
        ]),
        ("Duplication & Dead Code", [
            ("duplicate_block_ratio", profile.duplicate_block_ratio, ""),
            ("dead_code_ratio", profile.dead_code_ratio, ""),
            ("unused_parameter_ratio", profile.unused_parameter_ratio, ""),
            ("commented_code_ratio", profile.commented_code_ratio, ""),
        ]),
        ("Design Patterns", [
            ("dependency_injection_ratio", profile.dependency_injection_ratio, ""),
            ("immutability_score", profile.immutability_score, ""),
            ("guard_clause_ratio", profile.guard_clause_ratio, ""),
            ("factory_pattern_count", profile.factory_pattern_count, ""),
        ]),
    ]

    for cat_name, metrics in categories:
        print(f"  {cat_name}:")
        for name, value, unit in metrics:
            if isinstance(value, float):
                val_str = f"{value:.2f}"
            else:
                val_str = str(value)
            suffix = f" {unit}" if unit else ""
            print(f"    {name:<30} {val_str:>8}{suffix}")
        print()
