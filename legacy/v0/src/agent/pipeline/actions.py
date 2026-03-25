"""
Action Pipeline — composable chain of actions that transform context.

Each Action is a step in the pipeline:
  MapProject → FocusScope → LoadDescriptors → Compress → BuildPrompt → Call LLM

Actions can be composed, reordered, and conditionally skipped.
The pipeline carries a PipelineContext that accumulates state.

This is the execution engine: the StateMatrix tracks what's known,
the CompressionEngine reduces tokens, and the Pipeline orchestrates both.
"""

import sys
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Callable

from .matrix import StateMatrix, AnalysisState
from .compressor import CompressionEngine, CompressionPolicy, CompressionResult


@dataclass
class PipelineContext:
    """Shared state flowing through the pipeline."""
    # Input
    query: str
    projects: list[str]
    descriptors_dir: Path
    query_hints: dict = field(default_factory=dict)

    # Accumulated by actions
    matrix: StateMatrix = field(default_factory=StateMatrix)
    compressor: CompressionEngine = field(default=None)
    policy: CompressionPolicy = field(default=None)

    # Descriptors loaded (before compression)
    raw_descriptors: list[tuple[str, str, str]] = field(default_factory=list)
    # After compression
    compressed: Optional[CompressionResult] = None
    # Final context string for LLM
    context_for_llm: str = ""
    # Sources tracked
    sources: list[str] = field(default_factory=list)

    # Metrics
    original_chars: int = 0
    compressed_chars: int = 0
    tokens_saved: int = 0

    def __post_init__(self):
        if self.policy is None:
            self.policy = CompressionPolicy.balanced()
        if self.compressor is None:
            self.compressor = CompressionEngine(self.policy)


class Action(ABC):
    """Base class for pipeline actions."""
    name: str = "base"

    @abstractmethod
    def execute(self, ctx: PipelineContext) -> PipelineContext:
        """Transform the pipeline context. Returns the same ctx (mutated)."""
        ...

    def should_skip(self, ctx: PipelineContext) -> bool:
        """Override to conditionally skip this action."""
        return False


class SelectPolicy(Action):
    """Select compression policy based on query depth and project size."""
    name = "select_policy"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        hints = ctx.query_hints
        depth = hints.get("depth", "overview")

        # Count total files across all projects
        total_files = 0
        for project in ctx.projects:
            project_dir = ctx.descriptors_dir / project
            if project_dir.is_dir():
                total_files += sum(1 for _ in project_dir.rglob("*.yaml"))

        # Select policy based on depth + size
        if depth == "deep" and total_files < 200:
            ctx.policy = CompressionPolicy.detailed()
        elif total_files > 500 or len(ctx.projects) > 2:
            ctx.policy = CompressionPolicy.aggressive()
        else:
            ctx.policy = CompressionPolicy.balanced()

        ctx.compressor = CompressionEngine(ctx.policy)
        return ctx


class MapProjects(Action):
    """Load workspace.yaml and build project maps in the state matrix."""
    name = "map_projects"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        # Import synth parser
        src_dir = Path(__file__).resolve().parent.parent.parent
        if str(src_dir) not in sys.path:
            sys.path.insert(0, str(src_dir))
        from synth import parse_workspace

        for project in ctx.projects:
            ws_path = ctx.descriptors_dir / project / "workspace.yaml"
            if ws_path.exists():
                ws_data = parse_workspace(ws_path)
                ctx.matrix.map_project(project, ws_data)

                # Add workspace to raw descriptors (always uncompressed)
                content = ws_path.read_text(errors="replace")
                ctx.raw_descriptors.append(
                    (f"{project}/workspace.yaml", content, "workspace")
                )
                ctx.sources.append(f"{project}/workspace.yaml")
                ctx.original_chars += len(content)

        return ctx


class LoadDeps(Action):
    """Load deps.yaml — compressed."""
    name = "load_deps"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        for project in ctx.projects:
            deps_path = ctx.descriptors_dir / project / "deps.yaml"
            if deps_path.exists():
                content = deps_path.read_text(errors="replace")
                ctx.raw_descriptors.append(
                    (f"{project}/deps.yaml", content, "deps")
                )
                ctx.sources.append(f"{project}/deps.yaml")
                ctx.original_chars += len(content)
        return ctx

    def should_skip(self, ctx: PipelineContext) -> bool:
        return not ctx.query_hints.get("wants_deps", True)


class LoadGraphMeta(Action):
    """Load graph meta.yaml — always compressed."""
    name = "load_graph"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        for project in ctx.projects:
            meta_path = ctx.descriptors_dir / project / "graphs" / "meta.yaml"
            if meta_path.exists():
                content = meta_path.read_text(errors="replace")
                ctx.raw_descriptors.append(
                    (f"{project}/graphs/meta.yaml", content, "graph")
                )
                ctx.sources.append(f"{project}/graphs/meta.yaml")
                ctx.original_chars += len(content)
        return ctx


class LoadRelevantFiles(Action):
    """Load file descriptors based on query relevance scoring."""
    name = "load_files"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        import re
        hints = ctx.query_hints
        budget_chars = ctx.policy.target_tokens * 4

        # Already used chars
        used_chars = sum(len(c) for _, c, _ in ctx.raw_descriptors)

        for project in ctx.projects:
            project_dir = ctx.descriptors_dir / project
            if not project_dir.is_dir():
                continue

            # Score all file descriptors
            scored = []
            for yaml_path in project_dir.rglob("*.yaml"):
                if yaml_path.name in ("workspace.yaml", "module.yaml", "meta.yaml", "deps.yaml"):
                    continue
                if "graphs" in str(yaml_path.relative_to(project_dir)):
                    continue

                rel = f"{project}/{yaml_path.relative_to(project_dir)}"
                if rel in ctx.matrix.loaded_descriptors:
                    continue  # Already sent in previous turn

                content = yaml_path.read_text(errors="replace")
                score = self._score(yaml_path, content, hints)
                scored.append((score, rel, content))

            scored.sort(key=lambda x: -x[0])

            for score, rel, content in scored:
                # Compress before budget check
                compressed = ctx.compressor.compress_descriptor(content, "file")
                if used_chars + len(compressed) > budget_chars:
                    break
                ctx.raw_descriptors.append((rel, content, "file"))
                ctx.sources.append(rel)
                ctx.original_chars += len(content)
                used_chars += len(compressed)

        return ctx

    def _score(self, path: Path, content: str, hints: dict) -> float:
        import re
        score = 0.0
        path_str = str(path).lower()
        content_lower = content[:2000].lower()

        for kw in hints.get("keywords", []):
            kw_lower = kw.lower()
            if kw_lower in path_str:
                score += 20
            if kw_lower in content_lower:
                score += 5

        if hints.get("wants_types") and "types:" in content_lower:
            score += min(content_lower.count("- name:") * 3, 15)

        if hints.get("wants_functions") and "functions:" in content_lower:
            score += 8

        lines_match = re.search(r'lines:\s*(\d+)', content[:500])
        if lines_match:
            score += min(int(lines_match.group(1)) / 100, 5)

        if "/test" in path_str or "__test" in path_str:
            score -= 10

        return score


class CompressAll(Action):
    """Apply compression engine to all loaded descriptors."""
    name = "compress"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        budget_chars = ctx.policy.target_tokens * 4
        ctx.compressed = ctx.compressor.compress_batch(
            ctx.raw_descriptors, budget_chars
        )
        ctx.compressed_chars = ctx.compressed.compressed_chars
        ctx.tokens_saved = (ctx.original_chars - ctx.compressed_chars) // 4
        ctx.context_for_llm = ctx.compressed.content

        # Mark what we loaded in the matrix
        ctx.matrix.mark_loaded(ctx.sources)

        return ctx


class InjectAbstractContext(Action):
    """If this is a follow-up query, inject the abstract context from matrix
    instead of re-sending raw descriptors."""
    name = "inject_abstract"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.matrix.turn_count > 0:
            abstract = ctx.matrix.generate_abstract_context()
            if abstract:
                ctx.context_for_llm = (
                    f"## What you already know (from previous analysis)\n"
                    f"{abstract}\n\n"
                    f"## New descriptors for this query\n"
                    f"{ctx.context_for_llm}"
                )
        return ctx

    def should_skip(self, ctx: PipelineContext) -> bool:
        return ctx.matrix.turn_count == 0


# ── Pipeline ──────────────────────────────────────────────────────

class ActionPipeline:
    """Composable chain of actions that builds compressed LLM context.

    Usage:
        pipe = ActionPipeline.default()
        result = pipe.run(PipelineContext(
            query="How does cline handle tools?",
            projects=["cline-core"],
            descriptors_dir=Path("out"),
            query_hints=parse_query_hints(query),
        ))
        # result.context_for_llm is the compressed context
        # result.tokens_saved is how many tokens were saved
    """

    def __init__(self, actions: list[Action] = None):
        self.actions: list[Action] = actions or []

    def add(self, action: Action) -> "ActionPipeline":
        """Fluent API: pipe.add(MapProjects()).add(LoadDeps())..."""
        self.actions.append(action)
        return self

    def run(self, ctx: PipelineContext, verbose: bool = False) -> PipelineContext:
        """Execute all actions in sequence."""
        for action in self.actions:
            if action.should_skip(ctx):
                if verbose:
                    print(f"    [pipeline] skip {action.name}", file=sys.stderr)
                continue

            t0 = time.time()
            ctx = action.execute(ctx)
            elapsed = time.time() - t0

            if verbose:
                print(
                    f"    [pipeline] {action.name} ({elapsed:.2f}s) "
                    f"descriptors={len(ctx.raw_descriptors)} "
                    f"chars={ctx.original_chars:,}",
                    file=sys.stderr,
                )

        return ctx

    @classmethod
    def default(cls) -> "ActionPipeline":
        """Standard pipeline: map → deps → graph → files → compress → abstract."""
        return cls([
            SelectPolicy(),
            MapProjects(),
            LoadDeps(),
            LoadGraphMeta(),
            LoadRelevantFiles(),
            CompressAll(),
            InjectAbstractContext(),
        ])

    @classmethod
    def lightweight(cls) -> "ActionPipeline":
        """Lightweight pipeline: map → compress (skip deps/graph for simple queries)."""
        return cls([
            SelectPolicy(),
            MapProjects(),
            LoadRelevantFiles(),
            CompressAll(),
        ])

    @classmethod
    def compare(cls) -> "ActionPipeline":
        """For compare agent: map multiple projects, no file descriptors."""
        return cls([
            SelectPolicy(),
            MapProjects(),
            CompressAll(),
        ])
