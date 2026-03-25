"""
Core data models — merged from dev/blueprint.py and dev/plan.py.

Contains all shared dataclasses used across actors, engines, tools, and workflows:
  - Blueprint models: FieldSpec, MethodSpec, TypeBlueprint, ModuleBlueprint
  - Plan models: Plan, Block, BlockType, BlockStatus, BranchType, BranchStatus
  - Discussion models: Stance, Discussion, DiscussionPoint, RegisteredInsight
  - Decision models: AbstractionResult, FeatureDecision
"""
from __future__ import annotations

import hashlib
import json
import time
import yaml
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional


# ── Blueprint Models ──────────────────────────────────────────


@dataclass
class FieldSpec:
    """A field/property in a type."""
    name: str
    type: str = ""
    default: str = ""

    def to_dict(self) -> dict:
        d = {"name": self.name}
        if self.type:
            d["type"] = self.type
        if self.default:
            d["default"] = self.default
        return d

    @classmethod
    def from_dict(cls, d) -> FieldSpec:
        if isinstance(d, str):
            # "x: number = 0" shorthand
            parts = d.split("=", 1)
            name_type = parts[0].strip()
            default = parts[1].strip() if len(parts) > 1 else ""
            if ":" in name_type:
                name, typ = name_type.split(":", 1)
                return cls(name=name.strip(), type=typ.strip(), default=default)
            return cls(name=name_type, default=default)
        return cls(
            name=d.get("name", ""),
            type=d.get("type", ""),
            default=str(d.get("default", "")),
        )


@dataclass
class MethodSpec:
    """A method specification with optional implementation hints."""
    name: str
    sig: str = ""              # "(v: Vec3): Vec3"
    hint: str = ""             # "element-wise addition, return new"
    visibility: str = "public"
    is_async: bool = False
    is_static: bool = False

    def to_dict(self) -> dict:
        d = {"name": self.name}
        if self.sig:
            d["sig"] = self.sig
        if self.hint:
            d["hint"] = self.hint
        if self.visibility != "public":
            d["vis"] = self.visibility
        if self.is_async:
            d["async"] = True
        if self.is_static:
            d["static"] = True
        return d

    @classmethod
    def from_dict(cls, d) -> MethodSpec:
        if isinstance(d, str):
            return cls(name=d)
        return cls(
            name=d.get("name", ""),
            sig=d.get("sig", ""),
            hint=d.get("hint", ""),
            visibility=d.get("vis", "public"),
            is_async=d.get("async", False),
            is_static=d.get("static", False),
        )


@dataclass
class TypeBlueprint:
    """Blueprint for a single type (class, interface, enum)."""
    name: str
    kind: str = "class"        # class, interface, enum, struct
    target_file: str = ""      # "src/math/vec3.ts"
    extends: str = ""
    implements: list[str] = field(default_factory=list)
    fields: list[FieldSpec] = field(default_factory=list)
    methods: list[MethodSpec] = field(default_factory=list)
    static_members: list[MethodSpec] = field(default_factory=list)
    constraints: list[str] = field(default_factory=list)
    references: list[str] = field(default_factory=list)
    description: str = ""
    status: str = "pending"    # pending | translated | verified

    def to_dict(self) -> dict:
        d = {
            "name": self.name,
            "kind": self.kind,
            "status": self.status,
        }
        if self.target_file:
            d["target_file"] = self.target_file
        if self.extends:
            d["extends"] = self.extends
        if self.implements:
            d["implements"] = self.implements
        if self.description:
            d["description"] = self.description
        if self.fields:
            d["fields"] = [f.to_dict() for f in self.fields]
        if self.methods:
            d["methods"] = [m.to_dict() for m in self.methods]
        if self.static_members:
            d["static"] = [m.to_dict() for m in self.static_members]
        if self.constraints:
            d["constraints"] = self.constraints
        if self.references:
            d["references"] = self.references
        return d

    @classmethod
    def from_dict(cls, d: dict) -> TypeBlueprint:
        return cls(
            name=d.get("name", ""),
            kind=d.get("kind", "class"),
            target_file=d.get("target_file", ""),
            extends=d.get("extends", ""),
            implements=d.get("implements", []),
            fields=[FieldSpec.from_dict(f) for f in d.get("fields", [])],
            methods=[MethodSpec.from_dict(m) for m in d.get("methods", [])],
            static_members=[MethodSpec.from_dict(m) for m in d.get("static", [])],
            constraints=d.get("constraints", []),
            references=d.get("references", []),
            description=d.get("description", ""),
            status=d.get("status", "pending"),
        )


@dataclass
class ModuleBlueprint:
    """Blueprint for a module containing multiple types."""
    name: str                  # "math"
    language: str = "typescript"
    target_dir: str = ""       # "src/math"
    types: list[TypeBlueprint] = field(default_factory=list)
    constraints: list[str] = field(default_factory=list)
    references: list[str] = field(default_factory=list)
    description: str = ""

    @property
    def pending_types(self) -> list[TypeBlueprint]:
        return [t for t in self.types if t.status == "pending"]

    @property
    def translated_types(self) -> list[TypeBlueprint]:
        return [t for t in self.types if t.status == "translated"]

    def get_type(self, name: str) -> Optional[TypeBlueprint]:
        for t in self.types:
            if t.name == name:
                return t
        return None

    def mark_translated(self, type_name: str):
        t = self.get_type(type_name)
        if t:
            t.status = "translated"

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "language": self.language,
            "target_dir": self.target_dir,
            "description": self.description,
            "constraints": self.constraints,
            "references": self.references,
            "types": [t.to_dict() for t in self.types],
        }

    def save(self, path: Path):
        """Write blueprint to YAML file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        header = f"## Blueprint — {self.name}\n"
        content = yaml.dump(self.to_dict(), default_flow_style=False,
                            allow_unicode=True, sort_keys=False, width=120)
        path.write_text(header + content)

    @classmethod
    def load(cls, path: Path) -> ModuleBlueprint:
        """Load blueprint from YAML file."""
        text = path.read_text()
        # Strip header comment
        lines = text.split("\n")
        yaml_lines = [l for l in lines if not l.startswith("##")]
        data = yaml.safe_load("\n".join(yaml_lines))
        if not data:
            raise ValueError(f"Empty blueprint: {path}")
        return cls(
            name=data.get("name", path.stem),
            language=data.get("language", "typescript"),
            target_dir=data.get("target_dir", ""),
            types=[TypeBlueprint.from_dict(t) for t in data.get("types", [])],
            constraints=data.get("constraints", []),
            references=data.get("references", []),
            description=data.get("description", ""),
        )

    def type_to_yaml(self, type_name: str) -> str:
        """Serialize a single type from this blueprint to YAML string."""
        t = self.get_type(type_name)
        if not t:
            return ""
        return yaml.dump(t.to_dict(), default_flow_style=False,
                         allow_unicode=True, sort_keys=False, width=120)

    def format_summary(self) -> str:
        """Human-readable summary."""
        lines = [f"Blueprint: {self.name} ({self.language})"]
        lines.append(f"  Target: {self.target_dir}")
        lines.append(f"  Types: {len(self.types)} "
                      f"({len(self.pending_types)} pending, "
                      f"{len(self.translated_types)} translated)")
        for t in self.types:
            icon = {"pending": "○", "translated": "●", "verified": "✓"}
            lines.append(f"  {icon.get(t.status, '?')} {t.name} [{t.kind}] "
                          f"— {len(t.methods)} methods, {len(t.fields)} fields")
        return "\n".join(lines)


# ── Plan Models ───────────────────────────────────────────────


class BranchType(str, Enum):
    """Types of development branches."""
    MAIN = "main"
    EVALUATION = "evaluation"   # A/B test a single type variation
    EXPERIMENT = "experiment"   # free-form exploration


class BranchStatus(str, Enum):
    """Lifecycle of a branch."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class BlockStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"       # abstraction decided it's not worth it
    FAILED = "failed"


class BlockType(str, Enum):
    ANALYZE = "analyze"       # study references, understand the problem
    IMPLEMENT = "implement"   # write code
    TEST = "test"             # run tests, compare results
    REFACTOR = "refactor"     # improve what exists
    REVIEW = "review"         # code review / security check
    ABSTRACT = "abstract"     # post-iteration abstraction & decision


class Stance(str, Enum):
    """Strategic perspectives the agent cycles through during debates."""
    ADVOCATE = "advocate"       # argues FOR adopting a pattern/feature
    CRITIC = "critic"           # argues AGAINST, finds weaknesses
    PRAGMATIST = "pragmatist"   # evaluates effort vs value realistically
    ARCHITECT = "architect"     # considers long-term design implications


@dataclass
class DiscussionPoint:
    """One turn in a block's internal debate."""
    stance: Stance
    topic: str                  # what's being discussed
    reference: str              # source file/pattern being debated
    argument: str               # the actual reasoning
    conclusion: str             # "adopt", "reject", "adapt", "needs_more_info"
    confidence: float = 0.0     # 0.0-1.0
    tokens_used: int = 0
    context_loaded: list[str] = field(default_factory=list)  # descriptors loaded on-demand


@dataclass
class Discussion:
    """A structured debate within a block, cycling stances strategically."""
    topic: str
    points: list[DiscussionPoint] = field(default_factory=list)
    consensus: str = ""         # final agreed position
    value_generated: list[str] = field(default_factory=list)  # key insights extracted

    @property
    def total_tokens(self) -> int:
        return sum(p.tokens_used for p in self.points)

    def format(self) -> str:
        lines = [f"  Discussion: {self.topic}"]
        for p in self.points:
            icon = {"advocate": "+", "critic": "-", "pragmatist": "=", "architect": "^"}
            lines.append(f"    [{icon.get(p.stance.value, '?')}] {p.stance.value}: {p.conclusion} "
                         f"({p.confidence:.0%}) re: {p.reference[:40]}")
        if self.consensus:
            lines.append(f"    Consensus: {self.consensus}")
        if self.value_generated:
            lines.append(f"    Value: {', '.join(self.value_generated[:3])}")
        return "\n".join(lines)


@dataclass
class RegisteredInsight:
    """Something valuable discovered and registered during block execution."""
    content: str
    source: str           # where it came from
    block_index: int      # which block found it
    category: str         # "pattern", "anti-pattern", "api", "architecture", "test"
    relevance: float      # 0.0-1.0


@dataclass
class FeatureDecision:
    """Result of evaluating whether to bring a feature."""
    feature: str
    source: str               # e.g. "glm4/inference/vllm_cli_demo.py"
    value_score: float         # 0.0-1.0 — does it add real value?
    effort_score: float        # 0.0-1.0 — how much work?
    verdict: str               # "adopt", "adapt", "skip", "defer"
    reasoning: str


@dataclass
class AbstractionResult:
    """Output of the post-block abstraction process."""
    block_hash: str
    achievements: list[str]
    improvements: list[str]
    feature_decisions: list[FeatureDecision]
    metrics_delta: dict = field(default_factory=dict)  # before/after
    next_priority: str = ""    # what the next block should focus on
    confidence: float = 0.0


@dataclass
class Block:
    """One iteration in the plan chain."""
    index: int
    block_type: BlockType
    objective: str
    status: BlockStatus = BlockStatus.PENDING

    # Branch ownership
    branch_name: str = "main"

    # Chain
    prev_hash: str = ""
    hash: str = ""

    # Timing
    started_at: float = 0.0
    completed_at: float = 0.0

    # Content
    input_context: str = ""           # what this block received
    output: str = ""                  # what this block produced
    references_used: list[str] = field(default_factory=list)
    files_changed: list[str] = field(default_factory=list)

    # Metrics
    tokens_used: int = 0
    test_results: dict = field(default_factory=dict)   # {passed, failed, skipped}
    quality_score: float = 0.0        # 0.0-1.0

    # Discussions (debates within this block)
    discussions: list[Discussion] = field(default_factory=list)

    # Registry (insights worth keeping)
    registered: list[RegisteredInsight] = field(default_factory=list)
    discarded: list[str] = field(default_factory=list)  # things explicitly dropped

    # Abstraction (filled after block completes)
    abstraction: Optional[AbstractionResult] = None

    # Block metadata (blueprint path, type name, etc.)
    meta: dict = field(default_factory=dict)

    def compute_hash(self) -> str:
        """SHA-256 of block content + prev_hash = chain integrity."""
        payload = json.dumps({
            "index": self.index,
            "type": self.block_type.value,
            "objective": self.objective,
            "prev_hash": self.prev_hash,
            "output_len": len(self.output),
            "references": self.references_used,
            "files_changed": self.files_changed,
            "tokens_used": self.tokens_used,
            "completed_at": self.completed_at,
        }, sort_keys=True)
        self.hash = hashlib.sha256(payload.encode()).hexdigest()[:16]
        return self.hash

    def start(self):
        self.status = BlockStatus.IN_PROGRESS
        self.started_at = time.time()

    def complete(self, output: str, files_changed: list[str] = None,
                 tokens_used: int = 0, test_results: dict = None,
                 prev_block: Block = None):
        self.status = BlockStatus.COMPLETED
        self.completed_at = time.time()
        self.output = output
        self.files_changed = files_changed or []
        self.tokens_used = tokens_used
        self.test_results = test_results or {}
        # Update chain link from previous completed block
        if prev_block and prev_block.hash:
            self.prev_hash = prev_block.hash
        self.compute_hash()

    def skip(self, reason: str):
        self.status = BlockStatus.SKIPPED
        self.completed_at = time.time()
        self.output = f"SKIPPED: {reason}"
        self.compute_hash()

    def fail(self, error: str):
        self.status = BlockStatus.FAILED
        self.completed_at = time.time()
        self.output = f"FAILED: {error}"
        self.compute_hash()

    @property
    def elapsed_s(self) -> float:
        if self.completed_at and self.started_at:
            return round(self.completed_at - self.started_at, 2)
        return 0.0

    def register_insight(self, content: str, source: str, category: str,
                         relevance: float = 0.7):
        """Register a valuable insight discovered during this block."""
        self.registered.append(RegisteredInsight(
            content=content, source=source, block_index=self.index,
            category=category, relevance=relevance,
        ))

    def discard(self, what: str):
        """Explicitly mark something as not worth keeping."""
        self.discarded.append(what)

    def to_dict(self) -> dict:
        d = {
            "index": self.index,
            "type": self.block_type.value,
            "objective": self.objective,
            "status": self.status.value,
            "branch_name": self.branch_name,
            "prev_hash": self.prev_hash,
            "hash": self.hash,
            "elapsed_s": self.elapsed_s,
            "output": self.output,
            "references_used": self.references_used,
            "files_changed": self.files_changed,
            "tokens_used": self.tokens_used,
            "test_results": self.test_results,
            "quality_score": self.quality_score,
        }
        if self.meta:
            d["meta"] = self.meta
        if self.discussions:
            d["discussions"] = [
                {
                    "topic": disc.topic,
                    "points": [
                        {"stance": p.stance.value, "topic": p.topic,
                         "reference": p.reference, "conclusion": p.conclusion,
                         "confidence": p.confidence}
                        for p in disc.points
                    ],
                    "consensus": disc.consensus,
                    "value_generated": disc.value_generated,
                }
                for disc in self.discussions
            ]
        if self.registered:
            d["registered"] = [
                {"content": r.content, "source": r.source,
                 "category": r.category, "relevance": r.relevance}
                for r in self.registered
            ]
        if self.discarded:
            d["discarded"] = self.discarded
        if self.abstraction:
            d["abstraction"] = {
                "achievements": self.abstraction.achievements,
                "improvements": self.abstraction.improvements,
                "feature_decisions": [
                    {"feature": fd.feature, "source": fd.source,
                     "value": fd.value_score, "effort": fd.effort_score,
                     "verdict": fd.verdict, "reasoning": fd.reasoning}
                    for fd in self.abstraction.feature_decisions
                ],
                "next_priority": self.abstraction.next_priority,
            }
        return d


@dataclass
class Plan:
    """Ordered chain of Blocks. The full development plan."""
    goal: str
    target_project: str
    reference_projects: list[str] = field(default_factory=list)
    blocks: list[Block] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    plan_id: str = ""

    def __post_init__(self):
        if not self.plan_id:
            self.plan_id = hashlib.sha256(
                f"{self.goal}:{self.created_at}".encode()
            ).hexdigest()[:12]

    @property
    def current_block(self) -> Optional[Block]:
        for b in self.blocks:
            if b.status == BlockStatus.IN_PROGRESS:
                return b
        return None

    @property
    def next_pending(self) -> Optional[Block]:
        for b in self.blocks:
            if b.status == BlockStatus.PENDING:
                return b
        return None

    @property
    def completed_blocks(self) -> list[Block]:
        return [b for b in self.blocks if b.status == BlockStatus.COMPLETED]

    @property
    def total_tokens(self) -> int:
        return sum(b.tokens_used for b in self.blocks)

    @property
    def chain_valid(self) -> bool:
        """Verify chain integrity."""
        for i, block in enumerate(self.blocks):
            if block.status in (BlockStatus.PENDING, BlockStatus.IN_PROGRESS):
                continue
            if i == 0 and block.prev_hash != "":
                return False
            if i > 0 and block.prev_hash != self.blocks[i - 1].hash:
                return False
        return True

    def add_block(self, block_type: BlockType, objective: str,
                  meta: dict = None) -> Block:
        prev_hash = self.blocks[-1].hash if self.blocks else ""
        block = Block(
            index=len(self.blocks),
            block_type=block_type,
            objective=objective,
            prev_hash=prev_hash,
            meta=meta or {},
        )
        self.blocks.append(block)
        return block

    def insert_block_after(self, after_index: int, block_type: BlockType,
                           objective: str) -> Block:
        """Insert a new block dynamically (abstraction may add blocks)."""
        block = Block(
            index=after_index + 1,
            block_type=block_type,
            objective=objective,
        )
        self.blocks.insert(after_index + 1, block)
        # Re-index
        for i, b in enumerate(self.blocks):
            b.index = i
        # Re-chain completed blocks
        for i in range(1, len(self.blocks)):
            if self.blocks[i - 1].hash:
                self.blocks[i].prev_hash = self.blocks[i - 1].hash
        return block

    def format_status(self) -> str:
        """Visual representation of the plan chain."""
        W = 66
        lines = [
            f"{'━' * W}",
            f"  PLAN: {self.goal[:50]}",
            f"  ID: {self.plan_id}  Target: {self.target_project}",
        ]
        if self.reference_projects:
            lines.append(f"  References: {', '.join(self.reference_projects)}")
        lines.append(f"{'━' * W}")

        for b in self.blocks:
            status_icon = {
                BlockStatus.PENDING: "○",
                BlockStatus.IN_PROGRESS: "◉",
                BlockStatus.COMPLETED: "●",
                BlockStatus.SKIPPED: "⊘",
                BlockStatus.FAILED: "✗",
            }[b.status]

            hash_str = f" [{b.hash[:8]}]" if b.hash else ""
            chain_str = f"←{b.prev_hash[:8]}" if b.prev_hash else "←genesis"
            time_str = f" ({b.elapsed_s:.1f}s)" if b.elapsed_s else ""

            lines.append(
                f"  {status_icon} Block {b.index} [{b.block_type.value}]{hash_str} {chain_str}{time_str}"
            )
            lines.append(f"    {b.objective[:60]}")

            if b.test_results:
                p = b.test_results.get("passed", 0)
                f = b.test_results.get("failed", 0)
                lines.append(f"    Tests: {p} passed, {f} failed")

            if b.abstraction:
                decisions = b.abstraction.feature_decisions
                adopted = [d for d in decisions if d.verdict == "adopt"]
                skipped = [d for d in decisions if d.verdict == "skip"]
                if adopted:
                    lines.append(f"    Adopted: {', '.join(d.feature for d in adopted)}")
                if skipped:
                    lines.append(f"    Skipped: {', '.join(d.feature for d in skipped)}")

        lines.append(f"{'─' * W}")
        done = len(self.completed_blocks)
        total = len(self.blocks)
        bar_len = 30
        filled = int(done / max(total, 1) * bar_len)
        bar = "█" * filled + "░" * (bar_len - filled)
        lines.append(f"  Progress: [{bar}] {done}/{total} blocks")
        lines.append(f"  Tokens:   {self.total_tokens:,}")
        lines.append(f"  Chain:    {'✓ valid' if self.chain_valid else '✗ BROKEN'}")
        lines.append(f"{'━' * W}")
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "plan_id": self.plan_id,
            "goal": self.goal,
            "target_project": self.target_project,
            "reference_projects": self.reference_projects,
            "created_at": self.created_at,
            "blocks": [b.to_dict() for b in self.blocks],
            "chain_valid": self.chain_valid,
            "total_tokens": self.total_tokens,
        }

    def save(self, path: Path):
        path.write_text(json.dumps(self.to_dict(), indent=2))

    @classmethod
    def load(cls, path: Path) -> Plan:
        data = json.loads(path.read_text())
        return cls.load_dict(data)

    @classmethod
    def load_dict(cls, data: dict) -> Plan:
        """Load Plan from a dict (used by Branch.from_dict and Plan.load)."""
        plan = cls(
            goal=data["goal"],
            target_project=data["target_project"],
            reference_projects=data.get("reference_projects", []),
            created_at=data.get("created_at", time.time()),
            plan_id=data.get("plan_id", ""),
        )
        for bd in data.get("blocks", []):
            block = Block(
                index=bd["index"],
                block_type=BlockType(bd["type"]),
                objective=bd["objective"],
                status=BlockStatus(bd["status"]),
                branch_name=bd.get("branch_name", "main"),
                prev_hash=bd.get("prev_hash", ""),
                hash=bd.get("hash", ""),
                output=bd.get("output", ""),
                references_used=bd.get("references_used", []),
                files_changed=bd.get("files_changed", []),
                tokens_used=bd.get("tokens_used", 0),
                test_results=bd.get("test_results", {}),
                quality_score=bd.get("quality_score", 0.0),
                meta=bd.get("meta", {}),
            )
            plan.blocks.append(block)
        return plan
