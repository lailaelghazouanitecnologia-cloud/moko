"""
Branch & Project — hierarchical organization above Plans.

A Project owns multiple Branches (main + evaluations/experiments).
Each Branch owns a Plan (chain of Blocks). Evaluation branches
re-implement a single type with a variation and benchmark it.

Hierarchy: Manager → Project → Branch → Plan → Block
"""
from __future__ import annotations

import hashlib
import json
import time
import yaml
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .plan import Plan, BranchType, BranchStatus


@dataclass
class EvalConfig:
    """What to change and measure in an evaluation branch.

    An evaluation targets ONE type, re-implements it with a variation
    (different algorithm, constraints, or approach), and benchmarks
    the result against main's version.
    """
    target_type: str              # "Vec3" — which type to re-implement
    target_module: str            # "math" — which module it's in
    variation: str                # "SIMD-optimized Float32Array layout"
    constraints: list[str] = field(default_factory=list)
    benchmark_metrics: list[str] = field(default_factory=lambda: [
        "loc", "density", "method_count", "tsc_errors"
    ])

    # Optional overrides for this variation
    system_override: str = ""     # custom system prompt snippet for translator
    refs_override: list[str] = field(default_factory=list)
    temperature: float = -1       # -1 = use default

    def to_dict(self) -> dict:
        d = {
            "target_type": self.target_type,
            "target_module": self.target_module,
            "variation": self.variation,
            "constraints": self.constraints,
            "benchmark_metrics": self.benchmark_metrics,
        }
        if self.system_override:
            d["system_override"] = self.system_override
        if self.refs_override:
            d["refs_override"] = self.refs_override
        if self.temperature >= 0:
            d["temperature"] = self.temperature
        return d

    @classmethod
    def from_dict(cls, d: dict) -> EvalConfig:
        return cls(
            target_type=d["target_type"],
            target_module=d["target_module"],
            variation=d["variation"],
            constraints=d.get("constraints", []),
            benchmark_metrics=d.get("benchmark_metrics",
                                    ["loc", "density", "method_count", "tsc_errors"]),
            system_override=d.get("system_override", ""),
            refs_override=d.get("refs_override", []),
            temperature=d.get("temperature", -1),
        )


@dataclass
class EvalResult:
    """Benchmark result for one evaluation run."""
    branch_name: str
    target_type: str
    variation: str
    metrics: dict = field(default_factory=dict)  # {loc, density, method_count, ...}
    code_hash: str = ""           # hash of generated code for diffing
    code_snippet: str = ""        # first 500 chars for quick comparison
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "branch_name": self.branch_name,
            "target_type": self.target_type,
            "variation": self.variation,
            "metrics": self.metrics,
            "code_hash": self.code_hash,
            "timestamp": self.timestamp,
        }

    @classmethod
    def from_dict(cls, d: dict) -> EvalResult:
        return cls(
            branch_name=d["branch_name"],
            target_type=d["target_type"],
            variation=d.get("variation", ""),
            metrics=d.get("metrics", {}),
            code_hash=d.get("code_hash", ""),
            timestamp=d.get("timestamp", 0.0),
        )


@dataclass
class Branch:
    """A named sequence of blocks forming a coherent unit of work.

    Like a git branch: main is canonical, evaluations fork from it
    to test variations of specific types.
    """
    name: str                          # "main", "eval/vec3-simd"
    branch_type: BranchType            # MAIN, EVALUATION, EXPERIMENT
    status: BranchStatus = BranchStatus.PENDING
    plan: Optional[Plan] = None        # owns a plan (chain of blocks)
    parent_branch: str = ""            # fork point: "main"
    fork_block: int = -1               # block index where forked from parent

    # Evaluation-specific
    eval_config: Optional[EvalConfig] = None
    eval_results: list[EvalResult] = field(default_factory=list)

    # Timing
    created_at: float = field(default_factory=time.time)
    completed_at: float = 0.0

    @property
    def elapsed_s(self) -> float:
        if self.completed_at > 0:
            return self.completed_at - self.created_at
        return 0.0

    @property
    def total_tokens(self) -> int:
        return self.plan.total_tokens if self.plan else 0

    def to_dict(self) -> dict:
        d = {
            "name": self.name,
            "branch_type": self.branch_type.value,
            "status": self.status.value,
            "parent_branch": self.parent_branch,
            "fork_block": self.fork_block,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
        }
        if self.plan:
            d["plan"] = self.plan.to_dict()
        if self.eval_config:
            d["eval_config"] = self.eval_config.to_dict()
        if self.eval_results:
            d["eval_results"] = [r.to_dict() for r in self.eval_results]
        return d

    @classmethod
    def from_dict(cls, d: dict) -> Branch:
        branch = cls(
            name=d["name"],
            branch_type=BranchType(d["branch_type"]),
            status=BranchStatus(d.get("status", "pending")),
            parent_branch=d.get("parent_branch", ""),
            fork_block=d.get("fork_block", -1),
            created_at=d.get("created_at", 0.0),
            completed_at=d.get("completed_at", 0.0),
        )
        if "plan" in d:
            branch.plan = Plan.load_dict(d["plan"])
        if "eval_config" in d:
            branch.eval_config = EvalConfig.from_dict(d["eval_config"])
        if "eval_results" in d:
            branch.eval_results = [EvalResult.from_dict(r) for r in d["eval_results"]]
        return branch


@dataclass
class Project:
    """A collection of branches sharing the same goal and resources.

    The project owns a main branch (canonical development) and zero or
    more evaluation/experiment branches that fork from main.
    """
    name: str
    goal: str
    language: str = "typescript"
    branches: list[Branch] = field(default_factory=list)

    # Shared resource paths (all branches share these)
    emission_index_path: str = ""
    semantic_store_path: str = ""
    project_dir: str = ""

    # Project metadata
    created_at: float = field(default_factory=time.time)
    project_id: str = ""

    def __post_init__(self):
        if not self.project_id:
            self.project_id = hashlib.sha256(
                f"{self.name}:{self.created_at}".encode()
            ).hexdigest()[:12]

    @property
    def main(self) -> Optional[Branch]:
        """The main development branch."""
        for b in self.branches:
            if b.branch_type == BranchType.MAIN:
                return b
        return None

    @property
    def evaluations(self) -> list[Branch]:
        """All evaluation branches."""
        return [b for b in self.branches if b.branch_type == BranchType.EVALUATION]

    @property
    def experiments(self) -> list[Branch]:
        """All experiment branches."""
        return [b for b in self.branches if b.branch_type == BranchType.EXPERIMENT]

    @property
    def total_tokens(self) -> int:
        return sum(b.total_tokens for b in self.branches)

    def get_branch(self, name: str) -> Optional[Branch]:
        for b in self.branches:
            if b.name == name:
                return b
        return None

    def add_branch(self, name: str, branch_type: BranchType,
                   parent: str = "main", eval_config: EvalConfig = None) -> Branch:
        """Create and register a new branch."""
        parent_branch = self.get_branch(parent)
        fork_block = -1
        if parent_branch and parent_branch.plan:
            # Fork at the last completed block
            completed = parent_branch.plan.completed_blocks
            fork_block = completed[-1].index if completed else -1

        branch = Branch(
            name=name,
            branch_type=branch_type,
            parent_branch=parent,
            fork_block=fork_block,
            eval_config=eval_config,
        )
        self.branches.append(branch)
        return branch

    def format_status(self) -> str:
        """Visual summary of the project and all branches."""
        W = 66
        lines = [
            f"{'━' * W}",
            f"  PROJECT: {self.name}",
            f"  Goal: {self.goal[:50]}",
            f"  Branches: {len(self.branches)}",
            f"{'━' * W}",
        ]
        for b in self.branches:
            icon = {"pending": "○", "running": "◉", "completed": "●",
                    "failed": "✗"}[b.status.value]
            type_tag = f"[{b.branch_type.value}]"
            tokens = f"{b.total_tokens:,} tok" if b.total_tokens else ""
            time_str = f" {b.elapsed_s:.1f}s" if b.elapsed_s else ""
            fork = f" ← {b.parent_branch}@{b.fork_block}" if b.parent_branch else ""

            lines.append(f"  {icon} {b.name} {type_tag}{fork}{time_str}")
            if b.eval_config:
                lines.append(f"    vary: {b.eval_config.target_type} "
                             f"→ {b.eval_config.variation[:50]}")
            if tokens:
                lines.append(f"    {tokens}")

            # Eval results
            for r in b.eval_results:
                m = r.metrics
                lines.append(f"    result: LOC={m.get('loc', '?')} "
                             f"density={m.get('density', '?')}% "
                             f"methods={m.get('method_count', '?')}")

        lines.append(f"{'─' * W}")
        lines.append(f"  Total tokens: {self.total_tokens:,}")
        lines.append(f"{'━' * W}")
        return "\n".join(lines)

    def save(self, path: Path):
        """Save project state to JSON."""
        data = {
            "project_id": self.project_id,
            "name": self.name,
            "goal": self.goal,
            "language": self.language,
            "created_at": self.created_at,
            "emission_index_path": self.emission_index_path,
            "semantic_store_path": self.semantic_store_path,
            "project_dir": self.project_dir,
            "branches": [b.to_dict() for b in self.branches],
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2))

    @classmethod
    def load(cls, path: Path) -> Project:
        """Load project state from JSON."""
        data = json.loads(path.read_text())
        proj = cls(
            name=data["name"],
            goal=data["goal"],
            language=data.get("language", "typescript"),
            emission_index_path=data.get("emission_index_path", ""),
            semantic_store_path=data.get("semantic_store_path", ""),
            project_dir=data.get("project_dir", ""),
            created_at=data.get("created_at", 0.0),
            project_id=data.get("project_id", ""),
        )
        for bd in data.get("branches", []):
            proj.branches.append(Branch.from_dict(bd))
        return proj


# ── YAML helpers ────────────────────────────────────────────

def load_eval_yaml(path: Path) -> list[EvalConfig]:
    """Load evaluation configs from a YAML file.

    Format:
        evaluations:
          - name: vec3-simd
            target_type: Vec3
            target_module: math
            variation: "SIMD-optimized Float32Array layout"
            constraints: [...]
            benchmark_metrics: [loc, density, method_count, tsc_errors]
    """
    if not path.exists():
        return []

    text = path.read_text()
    data = yaml.safe_load(text)
    if not data or "evaluations" not in data:
        return []

    configs = []
    for ed in data["evaluations"]:
        configs.append(EvalConfig(
            target_type=ed["target_type"],
            target_module=ed["target_module"],
            variation=ed["variation"],
            constraints=ed.get("constraints", []),
            benchmark_metrics=ed.get("benchmark_metrics",
                                     ["loc", "density", "method_count", "tsc_errors"]),
            system_override=ed.get("system_override", ""),
            refs_override=ed.get("refs_override", []),
            temperature=ed.get("temperature", -1),
        ))
    return configs
