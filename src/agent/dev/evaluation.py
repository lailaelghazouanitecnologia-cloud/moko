"""
Evaluation — benchmark variations of a single type.

An evaluation branch re-implements ONE type with a different algorithm
or approach, then benchmarks against the main branch's version.

Flow:
  1. Load main's blueprint for the target module
  2. Create a mini-plan: ANALYZE (modify blueprint) + IMPLEMENT (translate)
  3. Translate the target type with variation constraints
  4. Benchmark: density, LOC, method count, tsc errors
  5. Return EvalResult for comparison
"""
from __future__ import annotations

import hashlib
import re
import shutil
import subprocess
import time
from pathlib import Path
from typing import Optional

from .branch import Branch, EvalConfig, EvalResult, Project
from .plan import Plan, Block, BlockType, BlockStatus, BranchType, BranchStatus
from .blueprint import ModuleBlueprint


def create_eval_plan(eval_config: EvalConfig, goal: str, target: str,
                     branch_name: str) -> Plan:
    """Create a minimal plan for evaluating one type variation.

    The plan has 3 blocks:
      0. ANALYZE: Load and modify blueprint for target type
      1. IMPLEMENT: Translate target type with variation
      2. TEST: Benchmark against main
    """
    plan = Plan(
        goal=f"Evaluate {eval_config.target_type}: {eval_config.variation}",
        target_project=target,
    )

    plan.add_block(
        BlockType.ANALYZE,
        f"Prepare blueprint for {eval_config.target_type} "
        f"({eval_config.variation[:40]})",
        meta={
            "module": eval_config.target_module,
            "type": eval_config.target_type,
            "eval_variation": eval_config.variation,
        },
    )
    # Set branch_name on all blocks
    plan.blocks[-1].branch_name = branch_name

    plan.add_block(
        BlockType.IMPLEMENT,
        f"Translate {eval_config.target_type} with variation",
        meta={
            "module": eval_config.target_module,
            "type": eval_config.target_type,
            "eval_variation": eval_config.variation,
            "constraints": eval_config.constraints,
        },
    )
    plan.blocks[-1].branch_name = branch_name

    plan.add_block(
        BlockType.TEST,
        f"Benchmark {eval_config.target_type} against main",
        meta={
            "module": eval_config.target_module,
            "type": eval_config.target_type,
        },
    )
    plan.blocks[-1].branch_name = branch_name

    return plan


def setup_eval_workspace(project_dir: Path, branch_name: str,
                         eval_config: EvalConfig) -> Path:
    """Create workspace for an evaluation branch.

    Copies main's code as base, then deletes the target type file
    so it can be re-generated with the variation.

    Returns the branch workspace directory.
    """
    branch_dir = project_dir / "branches" / branch_name
    src_dir = project_dir / "src"

    # Copy the target module from main
    module_src = src_dir / eval_config.target_module
    branch_module = branch_dir / "src" / eval_config.target_module

    if branch_module.exists():
        shutil.rmtree(branch_module)

    branch_dir.mkdir(parents=True, exist_ok=True)
    (branch_dir / "src").mkdir(exist_ok=True)

    if module_src.exists():
        shutil.copytree(module_src, branch_module)

    # Copy blueprints
    bp_src = project_dir / "blueprints"
    bp_dst = branch_dir / "blueprints"
    bp_dst.mkdir(parents=True, exist_ok=True)
    bp_file = bp_src / f"{eval_config.target_module}.bp.yaml"
    if bp_file.exists():
        shutil.copy2(bp_file, bp_dst / bp_file.name)

    # Delete the target type file so it gets re-generated
    from .translator import to_kebab_case
    target_file = branch_module / f"{to_kebab_case(eval_config.target_type)}.ts"
    if target_file.exists():
        target_file.unlink()

    return branch_dir


def modify_blueprint_for_eval(blueprint: ModuleBlueprint,
                              eval_config: EvalConfig) -> ModuleBlueprint:
    """Modify a module blueprint to apply evaluation constraints.

    Adds variation description and constraints to the target type's
    blueprint, so the translator generates a different implementation.
    """
    for type_bp in blueprint.types:
        if type_bp.name == eval_config.target_type:
            # Prepend variation to description
            original = type_bp.description or ""
            type_bp.description = (
                f"VARIATION: {eval_config.variation}. {original}"
            )
            # Add constraints
            if not hasattr(type_bp, 'constraints'):
                type_bp.constraints = []
            # Store constraints in the module-level constraints
            # (these get passed to the translator)
            for c in eval_config.constraints:
                if c not in blueprint.constraints:
                    blueprint.constraints.append(c)
            break

    return blueprint


def benchmark_type(project_dir: Path, branch_dir: Path,
                   eval_config: EvalConfig,
                   module_bp: ModuleBlueprint) -> EvalResult:
    """Benchmark a generated type against main's version.

    Compares: LOC, density, method count, tsc errors.
    """
    from .translator import to_kebab_case
    from .density import DensityAnalyzer

    target_file = f"src/{eval_config.target_module}/{to_kebab_case(eval_config.target_type)}.ts"

    # Main's version
    main_path = project_dir / target_file
    main_code = main_path.read_text() if main_path.exists() else ""
    main_loc = len(main_code.splitlines())
    main_methods = _count_methods(main_code)

    # Eval's version
    eval_path = branch_dir / target_file
    eval_code = eval_path.read_text() if eval_path.exists() else ""
    eval_loc = len(eval_code.splitlines())
    eval_methods = _count_methods(eval_code)

    # Code hash for diffing
    code_hash = hashlib.sha256(eval_code.encode()).hexdigest()[:16]

    # Density (if blueprint available)
    density = 0.0
    type_bp = None
    for t in module_bp.types:
        if t.name == eval_config.target_type:
            type_bp = t
            break

    if type_bp:
        analyzer = DensityAnalyzer(branch_dir)
        score = analyzer.analyze_file(type_bp, module_bp)
        density = score.density

    # TSC check (quick, just for this one file)
    tsc_errors = _check_tsc(eval_path)

    metrics = {
        "loc": eval_loc,
        "loc_main": main_loc,
        "loc_delta": eval_loc - main_loc,
        "density": round(density * 100, 1),
        "method_count": eval_methods,
        "method_count_main": main_methods,
        "tsc_errors": tsc_errors,
    }

    return EvalResult(
        branch_name=f"eval/{to_kebab_case(eval_config.target_type)}-{eval_config.variation[:20].replace(' ', '-').lower()}",
        target_type=eval_config.target_type,
        variation=eval_config.variation,
        metrics=metrics,
        code_hash=code_hash,
        code_snippet=eval_code[:500],
    )


def format_eval_report(project: Project) -> str:
    """Format comparison table across all evaluation branches."""
    lines = [
        f"{'━' * 70}",
        f"  EVALUATION REPORT: {project.name}",
        f"{'━' * 70}",
        "",
    ]

    # Collect all results
    all_results: list[EvalResult] = []
    for branch in project.evaluations:
        all_results.extend(branch.eval_results)

    if not all_results:
        lines.append("  No evaluation results yet.")
        return "\n".join(lines)

    # Group by target type
    by_type: dict[str, list[EvalResult]] = {}
    for r in all_results:
        by_type.setdefault(r.target_type, []).append(r)

    for type_name, results in by_type.items():
        lines.append(f"  {type_name}:")
        lines.append(f"  {'─' * 66}")

        # Header
        lines.append(
            f"    {'Variation':<30} {'LOC':>5} {'Δ':>5} {'Density':>8} "
            f"{'Methods':>8} {'TSC':>4}"
        )
        lines.append(f"    {'─' * 62}")

        # Main baseline
        if results:
            m0 = results[0].metrics
            lines.append(
                f"    {'(main baseline)':<30} {m0.get('loc_main', '?'):>5} "
                f"{'—':>5} {'—':>8} "
                f"{m0.get('method_count_main', '?'):>8} {'—':>4}"
            )

        # Each variation
        for r in results:
            m = r.metrics
            var_name = r.variation[:30]
            delta = f"{m.get('loc_delta', 0):+d}"
            lines.append(
                f"    {var_name:<30} {m.get('loc', '?'):>5} {delta:>5} "
                f"{m.get('density', '?'):>7}% "
                f"{m.get('method_count', '?'):>8} {m.get('tsc_errors', '?'):>4}"
            )

        lines.append("")

    lines.append(f"{'━' * 70}")
    return "\n".join(lines)


# ── Private helpers ─────────────────────────────────────────

_METHOD_RE = re.compile(
    r'(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*'
    r'(\w+)\s*(?:<[^>]*>)?\s*\(',
    re.MULTILINE,
)


def _count_methods(code: str) -> int:
    """Count method/function definitions in TypeScript code."""
    matches = _METHOD_RE.findall(code)
    # Filter out common non-method keywords
    skip = {"if", "for", "while", "switch", "catch", "import", "require",
            "export", "return", "new", "throw", "console", "super"}
    return len([m for m in matches if m not in skip])


def _check_tsc(file_path: Path) -> int:
    """Run tsc --noEmit on a single file, return error count."""
    if not file_path.exists():
        return -1
    try:
        result = subprocess.run(
            ["npx", "tsc", "--noEmit", "--strict", str(file_path)],
            capture_output=True, text=True, timeout=30,
            cwd=file_path.parent.parent.parent,  # project root
        )
        if result.returncode == 0:
            return 0
        # Count error lines
        return len([l for l in result.stdout.splitlines()
                    if "error TS" in l])
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return -1
