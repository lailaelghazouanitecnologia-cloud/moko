"""CLI entry point for ava dev."""
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
    p.add_argument("--max-iterations", type=int, default=10, help="Max iteration blocks")
    p.add_argument("--budget", type=int, default=20000, help="On-demand context budget (chars)")
    p.add_argument("--resume", metavar="PLAN_ID", help="Resume a saved plan")
    p.add_argument("--plans", action="store_true", help="List saved plans")
    p.add_argument("--density", metavar="PROJECT", help="Run density analysis on a project")
    p.add_argument("--compose", action="store_true", help="Use blueprint composer (extraction-first)")


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
    supervisor = DevSupervisor(config)

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

    # List plans
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

    # New plan
    if not args.goal:
        print("Usage: ava dev \"goal\" -t target [-r ref1 ref2 ...]")
        print("       ava dev --plans")
        print("       ava dev --resume PLAN_ID")
        sys.exit(1)

    if not args.target:
        print("Error: --target (-t) is required")
        sys.exit(1)

    # Use layered project blueprint — predefined for game engines, LLM-generated for others
    project_bp = None
    goal_lower = args.goal.lower()
    if any(kw in goal_lower for kw in ("game engine", "engine", "renderer", "3d")):
        from ..engines.blueprint.project import game_engine_project
        project_bp = game_engine_project(args.target, args.goal)
        print(f"Using layered project blueprint: {project_bp.total_types} types, "
              f"{len(project_bp.layers)} layers")
    else:
        # Try LLM-generated blueprint for any domain
        from ..engines.blueprint.project import generate_project_blueprint
        from ..llm.providers import LLMProvider
        bp_llm = LLMProvider(provider=args.provider, model=args.model)
        project_bp = generate_project_blueprint(args.goal, args.target, bp_llm)
        if project_bp:
            # Save for reproducibility
            from pathlib import Path
            bp_path = Path("projects") / args.target / "project.bp.yaml"
            bp_path.parent.mkdir(parents=True, exist_ok=True)
            project_bp.save(bp_path)
            print(f"LLM-generated project blueprint: {project_bp.total_types} types, "
                  f"{len(project_bp.layers)} layers")
        else:
            print("No blueprint generated, using non-layered LLM plan")

    supervisor.run(
        goal=args.goal,
        target=args.target,
        references=args.ref,
        max_iterations=args.max_iterations,
        project_bp=project_bp,
    )
