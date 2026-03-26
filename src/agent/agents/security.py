"""
Security Agent — reviews codebase for security concerns.

v2: Uses ActionPipeline for compressed context building.
Multi-query search pattern against vector store, then compresses all results.
"""

from .base import BaseAgent, AgentContext, AgentResult
from ..core.llm.providers import LLMMessage
from ..pipeline.actions import (
    ActionPipeline, PipelineContext, SelectPolicy,
    MapProjects, LoadRelevantFiles, CompressAll,
)


class SecurityAgent(BaseAgent):
    name = "security"
    description = "Security review: vulnerabilities, credentials, auth"
    capabilities = [
        "security", "vulnerab", "credential", "auth", "token",
        "password", "inject", "permission", "secret",
    ]

    def __init__(self):
        super().__init__()
        self._pipeline_ctx: PipelineContext = None

    def run(self, ctx: AgentContext) -> AgentResult:
        # 1. Run lightweight pipeline for workspace context
        hints = {
            "wants_deps": False,
            "wants_types": True,
            "wants_functions": True,
            "depth": "deep",
            "keywords": self._security_keywords(ctx.query),
        }

        pipe = ActionPipeline([
            SelectPolicy(),
            MapProjects(),
            LoadRelevantFiles(),
            CompressAll(),
        ])
        pipe_ctx = PipelineContext(
            query=ctx.query,
            projects=ctx.projects,
            descriptors_dir=ctx.descriptors_dir,
            query_hints=hints,
        )

        if self._pipeline_ctx and self._pipeline_ctx.matrix.turn_count > 0:
            pipe_ctx.matrix = self._pipeline_ctx.matrix

        pipe_ctx = pipe.run(pipe_ctx, verbose=False)
        self._pipeline_ctx = pipe_ctx

        # 2. Multi-query vector search for security-relevant descriptors
        extra_context, extra_sources = self._security_search(ctx, pipe_ctx.sources)

        # 3. Select prompt
        prompt = ctx.prompt_registry.select(
            task_type="security",
            agent=self.name,
            tags=["audit", "comprehensive"],
        )
        base_system = ctx.prompt_registry.get_base_system()
        system_prompt = prompt.render(base_system=base_system)

        # 4. Build message with coverage
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

        user_parts.append(f"## Roska Descriptors\n\n{pipe_ctx.context_for_llm}")

        if extra_context:
            user_parts.append(f"## Security-Relevant Files (Vector Search)\n\n{extra_context}")

        user_parts.append(f"## Question\n\n{ctx.query}")

        # 5. Call LLM
        messages = [
            LLMMessage("system", system_prompt),
            LLMMessage("user", "\n\n".join(user_parts)),
        ]
        response = ctx.llm.complete(messages, max_tokens=4096)

        # 6. Update matrix
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

    def _security_search(self, ctx: AgentContext, already: list[str]) -> tuple[str, list[str]]:
        """Multi-query vector search for security patterns."""
        if not ctx.vector_store or not ctx.vector_store.is_indexed():
            return "", []

        security_queries = [
            ctx.query,
            "credentials token secret password api_key",
            "execute command subprocess shell",
            "network request http fetch",
            "authentication authorization permission",
        ]

        parts = []
        sources = []
        seen = set(already)
        total_chars = 0
        budget = 8000  # compressed chars budget for extra search results

        for sq in security_queries:
            results = ctx.vector_store.search(
                query=sq,
                projects=ctx.projects,
                top_k=8,
            )
            for r in results:
                path_key = f"{r.project}/{r.file_path}"
                if path_key in seen or total_chars >= budget:
                    continue
                seen.add(path_key)
                # Truncate individual results
                content = r.content[:2000]
                parts.append(f"# {path_key}\n{content}")
                sources.append(path_key)
                total_chars += len(content)

        return "\n\n".join(parts), sources

    def _security_keywords(self, query: str) -> list[str]:
        """Extract security-relevant keywords from query."""
        import re
        base = re.findall(r'\b[a-zA-Z]\w{3,}\b', query)
        extra = ["auth", "credential", "secret", "token", "password",
                 "exec", "shell", "inject", "permission", "http"]
        return list(set(base + extra))
