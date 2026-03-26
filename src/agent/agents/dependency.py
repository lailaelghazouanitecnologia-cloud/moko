"""
Dependency Agent — analyzes dependency graphs, imports, call chains.

v2: Uses ActionPipeline for intelligent context building.
Prioritizes deps.yaml and graph meta with a dep-focused pipeline.
"""

from .base import BaseAgent, AgentContext, AgentResult
from ..core.llm.providers import LLMMessage
from ..pipeline.actions import (
    ActionPipeline, PipelineContext, SelectPolicy,
    MapProjects, LoadDeps, LoadGraphMeta, CompressAll,
)


class DependencyAgent(BaseAgent):
    name = "dependency"
    description = "Dependency graph analysis, import chains, circular deps"
    capabilities = [
        "depend", "import", "calls", "uses", "circular",
        "coupling", "fan-in", "fan-out", "graph",
    ]

    def __init__(self):
        super().__init__()
        self._pipeline_ctx: PipelineContext = None

    def run(self, ctx: AgentContext) -> AgentResult:
        # 1. Parse query hints (deps-focused)
        hints = self._dep_hints(ctx.query)

        # 2. Run dep-focused pipeline: map → deps → graph → compress
        pipe = ActionPipeline([
            SelectPolicy(),
            MapProjects(),
            LoadDeps(),
            LoadGraphMeta(),
            CompressAll(),
        ])
        pipe_ctx = PipelineContext(
            query=ctx.query,
            projects=ctx.projects,
            descriptors_dir=ctx.descriptors_dir,
            query_hints=hints,
        )

        # Reuse matrix from previous turn
        if self._pipeline_ctx and self._pipeline_ctx.matrix.turn_count > 0:
            pipe_ctx.matrix = self._pipeline_ctx.matrix

        pipe_ctx = pipe.run(pipe_ctx, verbose=False)
        self._pipeline_ctx = pipe_ctx

        # 3. Supplement with vector search for dep-related file descriptors
        extra_context = ""
        extra_sources = []
        if ctx.vector_store and ctx.vector_store.is_indexed():
            results = ctx.vector_store.search(
                query=ctx.query,
                projects=ctx.projects,
                descriptor_type="deps",
                top_k=10,
            )
            extra_parts = []
            for r in results:
                path_key = f"{r.project}/{r.file_path}"
                if path_key not in pipe_ctx.sources:
                    extra_parts.append(f"# {path_key}\n{r.content[:2000]}")
                    extra_sources.append(path_key)
            if extra_parts:
                extra_context = "\n\n".join(extra_parts[:5])

        # 4. Select prompt
        tags = self._infer_tags(ctx.query)
        prompt = ctx.prompt_registry.select(
            task_type="dependency",
            agent=self.name,
            tags=tags,
        )
        base_system = ctx.prompt_registry.get_base_system()
        system_prompt = prompt.render(base_system=base_system)

        # 5. Build user message with coverage info
        user_parts = []

        files_loaded = len(pipe_ctx.sources) + len(extra_sources)
        coverage = pipe_ctx.matrix.get_coverage_for_project(
            ctx.projects[0] if ctx.projects else ""
        )
        user_parts.append(
            f"**Coverage**: {files_loaded} descriptors loaded. "
            f"Compression: {pipe_ctx.original_chars:,} → {pipe_ctx.compressed_chars:,} chars "
            f"(saved ~{pipe_ctx.tokens_saved:,} tokens). "
            f"Only reference data you can see."
        )

        if ctx.search_context:
            user_parts.append(f"## Relevant Search Results\n{ctx.search_context[:2000]}")

        user_parts.append(f"## Dependency Descriptors\n\n{pipe_ctx.context_for_llm}")

        if extra_context:
            user_parts.append(f"## Additional Dep-Related Files\n\n{extra_context}")

        user_parts.append(f"## Question\n\n{ctx.query}")

        # 6. Call LLM
        messages = [
            LLMMessage("system", system_prompt),
            LLMMessage("user", "\n\n".join(user_parts)),
        ]
        response = ctx.llm.complete(messages, max_tokens=4096)

        # 7. Update matrix
        pipe_ctx.matrix.mark_analyzed()

        all_sources = pipe_ctx.sources + extra_sources
        return AgentResult(
            agent_name=self.name,
            content=response.content,
            sources=all_sources,
            usage=response.usage,
            prompt_id=prompt.metadata.id,
            metadata={
                "files_loaded": files_loaded,
                "files_available": coverage.get("files_available", 0),
                "coverage_pct": round(
                    files_loaded / max(coverage.get("files_available", 1), 1) * 100, 1
                ),
                "original_chars": pipe_ctx.original_chars,
                "compressed_chars": pipe_ctx.compressed_chars,
                "tokens_saved": pipe_ctx.tokens_saved,
                "compression_ratio": pipe_ctx.compressed.ratio if pipe_ctx.compressed else 0,
                "strategies": pipe_ctx.compressed.strategies_applied if pipe_ctx.compressed else [],
            },
        )

    def _dep_hints(self, query: str) -> dict:
        """Dependency queries always want deps and imports."""
        return {
            "wants_deps": True,
            "wants_types": False,
            "wants_functions": "call" in query.lower() or "trace" in query.lower(),
            "depth": "deep" if any(w in query.lower() for w in ["trace", "chain", "circular"]) else "overview",
            "keywords": [],
        }

    def _infer_tags(self, query: str) -> list[str]:
        query_lower = query.lower()
        tags = []
        if any(w in query_lower for w in ["circular", "cycle"]):
            tags.extend(["circular", "health"])
        if any(w in query_lower for w in ["trace", "path", "chain", "flow"]):
            tags.extend(["call-chain", "trace"])
        if any(w in query_lower for w in ["coupling", "cohesion"]):
            tags.extend(["coupling", "health"])
        tags.append("imports")
        return tags
