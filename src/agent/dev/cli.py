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

    supervisor.run(
        goal=args.goal,
        target=args.target,
        references=args.ref,
        max_iterations=args.max_iterations,
    )
