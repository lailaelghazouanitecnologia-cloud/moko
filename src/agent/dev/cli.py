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
    """Register 'features' subcommand — Feature AST navigation."""
    p = subparsers.add_parser("features",
                              help="Browse feature tree of reference projects")
    p.add_argument("projects", nargs="+", help="Reference project(s) to browse")
    p.add_argument("-g", "--goal", default="",
                   help="Goal to filter features (e.g., '2D sprite rendering')")
    p.add_argument("--path", default="",
                   help="Show specific subtree (e.g., 'rendering/forward-renderer')")
    p.add_argument("--expand", action="store_true",
                   help="Expand all nodes (show full tree)")
    p.add_argument("--compare", action="store_true",
                   help="Compare feature trees of two projects")
    p.add_argument("--save", action="store_true",
                   help="Save .features.yaml to data/reference/")


def cmd_features(args: argparse.Namespace):
    """Browse feature trees of reference projects."""
    from pathlib import Path
    from ..engines.reference.feature_ast import (
        build_feature_ast, analyze_goal, auto_select,
        print_tree, print_plan,
    )
    from .. import OUT_DIR

    data_dir = Path("data/reference")
    data_dir.mkdir(parents=True, exist_ok=True)

    if args.compare and len(args.projects) >= 2:
        _cmd_features_compare(args, OUT_DIR, data_dir)
        return

    project = args.projects[0]

    # Load or build AST
    cached = data_dir / f"{project}.features.yaml"
    if cached.exists() and not args.save:
        from ..engines.reference.feature_ast import FeatureNode
        ast = FeatureNode.load(cached)
        print(f"  Loaded feature tree: {project}")
    else:
        ast = build_feature_ast(project, OUT_DIR)
        if args.save:
            ast.save(cached)
            print(f"  Saved: {cached}")

    # If a specific path requested, show subtree
    if args.path:
        subtree = ast.find(args.path)
        if subtree:
            print_tree(subtree, max_depth=10)
        else:
            print(f"  Not found: {args.path}")
            print(f"  Available: {', '.join(n.path for n in ast.walk() if n.kind != 'root')}")
        return

    # If goal provided, analyze and show filtered view
    if args.goal:
        analysis = analyze_goal(args.goal, ast)
        maybes = auto_select(ast, analysis)
        print(f"\n  Goal: \"{args.goal}\"")
        print_tree(ast, show_selection=True, analysis=analysis,
                   max_depth=10 if args.expand else 3)
        print_plan(ast, analysis)
        if maybes:
            unique_maybes = list(dict.fromkeys(maybes))  # dedup preserving order
            print(f"  Optional (not auto-selected): {', '.join(unique_maybes)}")
        return

    # Default: show full tree
    print_tree(ast, max_depth=10 if args.expand else 3)


def _cmd_features_compare(args, out_dir, data_dir):
    """Compare feature trees of two projects side by side."""
    from ..engines.reference.feature_ast import build_feature_ast, FeatureNode

    p1, p2 = args.projects[0], args.projects[1]

    # Load/build both ASTs
    trees = {}
    for proj in [p1, p2]:
        cached = data_dir / f"{proj}.features.yaml"
        if cached.exists():
            trees[proj] = FeatureNode.load(cached)
        else:
            trees[proj] = build_feature_ast(proj, out_dir)

    ast1, ast2 = trees[p1], trees[p2]

    print(f"\n  {'━' * 66}")
    print(f"    FEATURE COMPARISON: {p1} vs {p2}")
    print(f"  {'━' * 66}")
    print(f"\n  {'':>22} {p1:>20} {p2:>20}")
    print(f"  {'─' * 66}")
    print(f"  {'Total LOC':>22} {ast1.ref_loc:>17,} {ast2.ref_loc:>17,}")

    # Collect all unique domain/subsystem names
    def _leaf_nodes(ast):
        return {n.name: n for n in ast.walk()
                if n.kind not in ("root", "domain") and not n.children}

    nodes1 = _leaf_nodes(ast1)
    nodes2 = _leaf_nodes(ast2)
    all_names = sorted(set(nodes1.keys()) | set(nodes2.keys()))

    print(f"\n  {'Feature':<22} {p1:>20} {p2:>20}")
    print(f"  {'─' * 66}")

    for name in all_names:
        n1 = nodes1.get(name)
        n2 = nodes2.get(name)
        loc1 = f"{n1.ref_loc:,} LOC" if n1 else "—"
        loc2 = f"{n2.ref_loc:,} LOC" if n2 else "—"
        types1 = f"({len(n1.ref_types)}t)" if n1 else ""
        types2 = f"({len(n2.ref_types)}t)" if n2 else ""
        print(f"  {name:<22} {loc1:>14} {types1:>5} {loc2:>14} {types2:>5}")

    print(f"  {'━' * 66}\n")


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


# ── Intel subcommand ───────────────────────────────────────

def register_intel_subparser(subparsers: argparse._SubParsersAction):
    """Register 'intel' subcommand."""
    p = subparsers.add_parser("intel",
                              help="Project Intelligence: analyze, navigate, compare reference projects")
    p.add_argument("projects", nargs="+", help="Project name(s) to analyze or navigate")
    p.add_argument("--provider", default="groq", help="LLM provider")
    p.add_argument("--model", help="Override model")
    p.add_argument("-v", "--verbose", action="store_true", help="Verbose output")

    # Navigation flags (mutually exclusive sections)
    group = p.add_mutually_exclusive_group()
    group.add_argument("--summary", action="store_true", help="Show brief overview")
    group.add_argument("--style", action="store_true", help="Show programming style analysis")
    group.add_argument("--patterns", action="store_true", help="Show architectural patterns")
    group.add_argument("--features", action="store_true", help="Show features with algorithms")
    group.add_argument("--decisions", action="store_true", help="Show design decisions")
    group.add_argument("--metrics", action="store_true", help="Show detailed metrics")
    group.add_argument("--quality", action="store_true", help="Show quality calibration targets")
    group.add_argument("--graph", action="store_true", help="Show dependency graph")
    group.add_argument("--compare", action="store_true", help="Compare 2+ projects")

    # Detail drilldown
    p.add_argument("--pattern", metavar="NAME", help="Show detail for a specific pattern")
    p.add_argument("--feature", metavar="NAME", help="Show detail for a specific feature")
    p.add_argument("--module", metavar="NAME", help="Show detail for a specific module")

    # Generation
    p.add_argument("--regenerate", action="store_true",
                   help="Force regeneration even if .pi.yaml exists")


def cmd_intel(args: argparse.Namespace):
    """Execute intel command."""
    from pathlib import Path
    from ..engines.reference.intelligence import IntelligenceGenerator
    from ..engines.reference.models import ProjectIntelligence
    from .. import OUT_DIR

    data_dir = Path("data/reference")
    data_dir.mkdir(parents=True, exist_ok=True)

    # Load or generate PI for each project
    pis = []
    for project_name in args.projects:
        pi_path = data_dir / f"{project_name}.pi.yaml"

        if pi_path.exists() and not args.regenerate:
            pi = ProjectIntelligence.load(pi_path)
            pis.append(pi)
        else:
            # Check if Roska descriptors exist
            ref_dir = OUT_DIR / project_name
            if not ref_dir.exists():
                print(f"No Roska descriptors for '{project_name}'. Run: lyzed-ts -i <repo> -o out -n {project_name}")
                continue

            # Generate
            llm = None
            try:
                from ..llm.providers import LLMProvider
                llm = LLMProvider(provider=args.provider, model=args.model)
            except Exception:
                pass

            gen = IntelligenceGenerator(OUT_DIR, llm=llm, verbose=args.verbose)
            pi = gen.generate(project_name)
            pi.save(pi_path)
            pi.save_markdown(data_dir / f"{project_name}.pi.md")
            print(f"Generated: {pi_path}")
            if gen.total_tokens > 0:
                print(f"  LLM tokens: {gen.total_tokens:,}")
            pis.append(pi)

    if not pis:
        return

    # Compare mode
    if args.compare and len(pis) >= 2:
        _print_comparison(pis)
        return

    # Navigate each project
    for pi in pis:
        if args.style:
            _print_style(pi)
        elif args.patterns:
            _print_patterns(pi)
        elif args.features:
            _print_features(pi)
        elif args.decisions:
            _print_decisions(pi)
        elif args.metrics:
            _print_metrics(pi)
        elif args.quality:
            _print_quality(pi)
        elif args.graph:
            _print_graph(pi)
        elif args.pattern:
            _print_pattern_detail(pi, args.pattern)
        elif args.feature:
            _print_feature_detail(pi, args.feature)
        else:
            _print_summary(pi)


def _print_summary(pi):
    """Brief overview."""
    m = pi.metrics
    print(f"{'━' * 70}")
    print(f"  PROJECT INTELLIGENCE: {pi.project}")
    print(f"{'━' * 70}")
    print(f"  {pi.purpose}")
    print(f"  Domain: {pi.domain} | Language: {pi.language} | "
          f"Size: {pi.size_tier} | Maturity: {pi.maturity}")
    print()
    print(f"  {m.glob.total_loc:,} LOC | {m.glob.total_modules} modules | "
          f"{m.glob.total_types} types | {m.glob.total_functions} functions")
    print()

    # Patterns
    if pi.patterns:
        print(f"  PATTERNS ({len(pi.patterns)}):")
        for p in pi.patterns:
            bar = _bar(p.loc, 2000)
            print(f"    {p.name:<28} {bar} {p.where:<18} {p.loc:,} LOC")
        print()

    # Features
    if pi.features:
        print(f"  FEATURES ({len(pi.features)}):")
        for f in pi.features:
            cx = {"low": "░", "medium": "▒", "high": "▓"}.get(f.complexity, "?")
            print(f"    {cx} {f.name:<26} {f.description[:50]}")
        print()

    # Style one-liner
    s = pi.style
    print(f"  STYLE: {s.naming.methods} methods | {s.naming.classes} classes | "
          f"{s.error_handling.strategy} | {s.async_style.style} | "
          f"{s.typing.strictness} typing")

    # Graph one-liner
    dg = pi.dependency_graph
    if dg.layers:
        layer_strs = [f"[{','.join(l)}]" for l in dg.layers]
        print(f"  GRAPH: {' → '.join(layer_strs)}")

    print(f"{'━' * 70}")


def _print_style(pi):
    s = pi.style
    print(f"{'━' * 70}")
    print(f"  STYLE: {pi.project}")
    print(f"{'━' * 70}")

    print(f"\n  Naming:")
    print(f"    Modules:   {s.naming.modules}")
    print(f"    Classes:   {s.naming.classes}")
    print(f"    Methods:   {s.naming.methods}")
    print(f"    Constants: {s.naming.constants}")
    print(f"    Private:   {s.naming.private_prefix or 'none'}")
    if s.naming.examples:
        print(f"    Examples:  {', '.join(s.naming.examples)}")

    print(f"\n  Error Handling:")
    print(f"    Strategy:    {s.error_handling.strategy}")
    print(f"    Custom:      {'yes' if s.error_handling.custom_exceptions else 'no'}")
    print(f"    Retry:       {'yes' if s.error_handling.retry_pattern else 'no'}")
    print(f"    Degradation: {'yes' if s.error_handling.graceful_degradation else 'no'}")

    print(f"\n  Async:")
    print(f"    Style:     {s.async_style.style}")
    print(f"    Blocking:  {s.async_style.blocking_workaround or 'n/a'}")

    print(f"\n  Typing:")
    print(f"    Strictness:  {s.typing.strictness}")
    print(f"    Dataclasses: {'yes' if s.typing.dataclasses else 'no'}")
    print(f"    Generics:    {'yes' if s.typing.generics else 'no'}")

    print(f"\n  Documentation:")
    print(f"    Module docs:  {s.documentation.module_docstrings}")
    print(f"    Method docs:  {s.documentation.method_docstrings}")
    print(f"    Comments:     {s.documentation.inline_comments}")

    print(f"\n  Organization:")
    print(f"    File/class:   {s.organization.file_per_class}")
    print(f"    Barrel:       {'yes' if s.organization.barrel_exports else 'no'}")
    print(f"    Max file:     {s.organization.max_file_loc} LOC")
    print(f"{'━' * 70}")


def _print_patterns(pi):
    print(f"{'━' * 70}")
    print(f"  PATTERNS: {pi.project} ({len(pi.patterns)})")
    print(f"{'━' * 70}")
    for p in pi.patterns:
        print(f"\n  {p.name}")
        print(f"  {'─' * 40}")
        print(f"  What: {p.what}")
        print(f"  How:  {p.how}")
        print(f"  Components: {', '.join(p.components)}")
        print(f"  Where: {p.where} ({p.loc:,} LOC)")
        print(f"  Reusable: {p.reusable_when}")
    print(f"\n{'━' * 70}")


def _print_features(pi):
    print(f"{'━' * 70}")
    print(f"  FEATURES: {pi.project} ({len(pi.features)})")
    print(f"{'━' * 70}")
    for f in pi.features:
        cx = {"low": "●○○", "medium": "●●○", "high": "●●●"}.get(f.complexity, "???")
        print(f"\n  {f.name} [{cx}] ({f.loc:,} LOC)")
        print(f"  {'─' * 40}")
        print(f"  {f.description}")
        print(f"  Algorithm: {f.algorithm}")
        if f.key_insight:
            print(f"  Insight:   {f.key_insight}")
        if f.modules:
            print(f"  Modules:   {', '.join(f.modules)}")
    print(f"\n{'━' * 70}")


def _print_decisions(pi):
    print(f"{'━' * 70}")
    print(f"  DECISIONS: {pi.project} ({len(pi.decisions)})")
    print(f"{'━' * 70}")
    for d in pi.decisions:
        print(f"\n  [{d.area}]")
        print(f"  Choice: {d.choice}")
        print(f"  Why:    {d.why}")
    print(f"\n{'━' * 70}")


def _print_metrics(pi):
    m = pi.metrics
    print(f"{'━' * 70}")
    print(f"  METRICS: {pi.project}")
    print(f"{'━' * 70}")
    print(f"\n  Global:")
    print(f"    Total LOC:      {m.glob.total_loc:>8,}")
    print(f"    Modules:        {m.glob.total_modules:>8}")
    print(f"    Types:          {m.glob.total_types:>8}")
    print(f"    Functions:      {m.glob.total_functions:>8}")
    print(f"\n  Per Module:")
    print(f"    Avg LOC:        {m.per_module.avg_loc:>8.0f}")
    print(f"    Median LOC:     {m.per_module.median_loc:>8.0f}")
    print(f"    Max LOC:        {m.per_module.max_loc:>8}")
    print(f"    Min LOC:        {m.per_module.min_loc:>8}")
    print(f"\n  Per Type:")
    print(f"    Avg LOC:        {m.per_type.avg_loc:>8.0f}")
    print(f"    Median LOC:     {m.per_type.median_loc:>8.0f}")
    print(f"    Avg methods:    {m.per_type.avg_methods:>8.1f}")
    print(f"    Avg fields:     {m.per_type.avg_fields:>8.1f}")
    print(f"\n  Per Function:")
    print(f"    Avg LOC:        {m.per_function.avg_loc:>8.0f}")
    print(f"    Avg params:     {m.per_function.avg_params:>8.1f}")
    print(f"    Async ratio:    {m.per_function.async_ratio:>7.0%}")
    print(f"{'━' * 70}")


def _print_quality(pi):
    q = pi.quality
    print(f"{'━' * 70}")
    print(f"  QUALITY TARGETS: {pi.project}")
    print(f"{'━' * 70}")
    print(f"\n  {'Metric':<20} {'P25':>8} {'Median':>8} {'P75':>8} {'Max':>8}")
    print(f"  {'─' * 52}")
    _qrow("LOC/type", q.loc_per_type)
    _qrow("Methods/type", q.methods_per_type)
    _qrow("LOC/function", q.loc_per_function)
    _qrow("Params/function", q.params_per_function)
    print(f"\n  Error handling: {q.error_handling}")
    print(f"  Test coverage:  {q.test_coverage}")
    print(f"{'━' * 70}")


def _qrow(label, p):
    print(f"  {label:<20} {p.p25:>8.0f} {p.median:>8.0f} {p.p75:>8.0f} {p.max:>8.0f}")


def _print_graph(pi):
    dg = pi.dependency_graph
    print(f"{'━' * 70}")
    print(f"  DEPENDENCY GRAPH: {pi.project}")
    print(f"{'━' * 70}")
    print(f"  Style: {dg.style} | Coupling: {dg.coupling} | Hub: {dg.hub_module}")
    print()
    for i, layer in enumerate(dg.layers):
        indent = "  " * (i + 1)
        arrow = "→ " if i > 0 else "  "
        print(f"  L{i} {arrow}[{', '.join(layer)}]")
    print(f"{'━' * 70}")


def _print_pattern_detail(pi, name):
    for p in pi.patterns:
        if name.lower() in p.name.lower():
            print(f"\n  Pattern: {p.name}")
            print(f"  {'━' * 50}")
            print(f"  What: {p.what}")
            print(f"  How:  {p.how}")
            print(f"  Components: {', '.join(p.components)}")
            print(f"  Where: {p.where} ({p.loc:,} LOC)")
            print(f"  Reusable when: {p.reusable_when}")
            return
    print(f"  Pattern '{name}' not found. Available: {', '.join(p.name for p in pi.patterns)}")


def _print_feature_detail(pi, name):
    for f in pi.features:
        if name.lower() in f.name.lower():
            print(f"\n  Feature: {f.name}")
            print(f"  {'━' * 50}")
            print(f"  {f.description}")
            print(f"  Algorithm: {f.algorithm}")
            if f.key_insight:
                print(f"  Key insight: {f.key_insight}")
            print(f"  Modules: {', '.join(f.modules)}")
            print(f"  LOC: {f.loc:,} | Complexity: {f.complexity}")
            return
    print(f"  Feature '{name}' not found. Available: {', '.join(f.name for f in pi.features)}")


def _print_comparison(pis):
    print(f"{'━' * 70}")
    print(f"  COMPARISON: {' vs '.join(pi.project for pi in pis)}")
    print(f"{'━' * 70}")

    # Metrics table
    print(f"\n  {'Metric':<25}", end="")
    for pi in pis:
        print(f" {pi.project:>12}", end="")
    print()
    print(f"  {'─' * (25 + 13 * len(pis))}")

    rows = [
        ("LOC", lambda pi: f"{pi.metrics.glob.total_loc:,}"),
        ("Modules", lambda pi: str(pi.metrics.glob.total_modules)),
        ("Types", lambda pi: str(pi.metrics.glob.total_types)),
        ("Functions", lambda pi: str(pi.metrics.glob.total_functions)),
        ("Avg LOC/type", lambda pi: f"{pi.metrics.per_type.avg_loc:.0f}"),
        ("Avg methods/type", lambda pi: f"{pi.metrics.per_type.avg_methods:.1f}"),
        ("Async ratio", lambda pi: f"{pi.metrics.per_function.async_ratio:.0%}"),
    ]
    for label, fn in rows:
        print(f"  {label:<25}", end="")
        for pi in pis:
            print(f" {fn(pi):>12}", end="")
        print()

    # Style comparison
    print(f"\n  {'Style':<25}", end="")
    for pi in pis:
        print(f" {pi.project:>12}", end="")
    print()
    print(f"  {'─' * (25 + 13 * len(pis))}")

    style_rows = [
        ("Methods", lambda pi: pi.style.naming.methods),
        ("Errors", lambda pi: pi.style.error_handling.strategy),
        ("Async", lambda pi: pi.style.async_style.style),
        ("Typing", lambda pi: pi.style.typing.strictness),
        ("Docs", lambda pi: pi.style.documentation.module_docstrings),
    ]
    for label, fn in style_rows:
        print(f"  {label:<25}", end="")
        for pi in pis:
            print(f" {fn(pi):>12}", end="")
        print()

    # Patterns
    print(f"\n  Patterns:")
    all_patterns = set()
    for pi in pis:
        for p in pi.patterns:
            all_patterns.add(p.name)
    for pname in sorted(all_patterns):
        present = []
        for pi in pis:
            if any(p.name == pname for p in pi.patterns):
                present.append(pi.project)
        markers = " ".join(present)
        print(f"    {pname:<30} {markers}")

    # Features
    print(f"\n  Features:")
    all_features = set()
    for pi in pis:
        for f in pi.features:
            all_features.add(f.name)
    for fname in sorted(all_features):
        present = []
        for pi in pis:
            if any(f.name == fname for f in pi.features):
                present.append(pi.project)
        markers = " ".join(present)
        print(f"    {fname:<30} {markers}")

    print(f"\n{'━' * 70}")


def _bar(value: int, max_val: int, width: int = 8) -> str:
    """Small ASCII bar."""
    filled = min(width, max(1, int(value / max(max_val, 1) * width)))
    return "█" * filled + "░" * (width - filled)
