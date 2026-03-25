"""
Architect Agent — analyzes project architecture, modules, and patterns.

v3: Uses the ActionPipeline for intelligent context building.
The pipeline applies compression, tracks state via the matrix,
and produces the minimal context needed for each query.
"""

import re
from pathlib import Path

from .base import BaseAgent, AgentContext, AgentResult
from ..llm.providers import LLMMessage
from ..pipeline.actions import ActionPipeline, PipelineContext
from ..pipeline.compressor import CompressionPolicy


def _parse_query_hints(query: str) -> dict:
    """Extract structural hints from the query to prioritize descriptors."""
    ql = query.lower()
    stop_words = {
        "what", "how", "does", "this", "that", "with", "from", "about",
        "which", "where", "when", "analyze", "review", "overview",
        "architecture", "structure", "project", "codebase", "the",
        "and", "for", "are", "its", "have", "has", "been", "deep",
        "dive", "into",
    }
    return {
        "keywords": [
            w for w in re.findall(r'\b[a-zA-Z]\w{3,}\b', query)
            if w.lower() not in stop_words
        ],
        "wants_types": any(w in ql for w in [
            "class", "type", "interface", "inherit", "abstract",
            "handler", "factory", "pattern",
        ]),
        "wants_functions": any(w in ql for w in [
            "function", "method", "call", "execut", "run", "flow",
            "pipeline", "process", "handle",
        ]),
        "wants_deps": any(w in ql for w in [
            "import", "depend", "module", "coupling",
        ]),
        "depth": "deep" if any(w in ql for w in [
            "deep", "detail", "trace", "all", "comprehensive",
        ]) else "overview",
    }


class ArchitectAgent(BaseAgent):
    name = "architect"
    description = "Analyzes project architecture, module structure, patterns"
    capabilities = [
        "architecture", "structure", "overview", "modules", "patterns",
        "onboard", "how", "built", "design", "components",
    ]

    def __init__(self):
        super().__init__()
        self._pipeline_ctx: PipelineContext = None

    def run(self, ctx: AgentContext) -> AgentResult:
        # 1. Parse query hints
        hints = _parse_query_hints(ctx.query)

        # 2. Run pipeline to build compressed context
        pipe = ActionPipeline.default()
        pipe_ctx = PipelineContext(
            query=ctx.query,
            projects=ctx.projects,
            descriptors_dir=ctx.descriptors_dir,
            query_hints=hints,
        )

        # Reuse matrix from previous turn if available
        if self._pipeline_ctx and self._pipeline_ctx.matrix.turn_count > 0:
            pipe_ctx.matrix = self._pipeline_ctx.matrix

        pipe_ctx = pipe.run(pipe_ctx, verbose=False)
        self._pipeline_ctx = pipe_ctx

        # 3. Select prompt
        tags = self._infer_tags(ctx.query)
        prompt = ctx.prompt_registry.select(
            task_type="architecture",
            agent=self.name,
            tags=tags,
        )
        base_system = ctx.prompt_registry.get_base_system()
        system_prompt = prompt.render(base_system=base_system)

        # 4. Build user message with compressed context + coverage
        user_parts = []

        # Coverage disclaimer
        coverage = pipe_ctx.matrix.get_coverage_for_project(
            ctx.projects[0] if ctx.projects else ""
        )
        files_loaded = len(pipe_ctx.sources)
        user_parts.append(
            f"**Coverage**: {files_loaded} descriptors loaded. "
            f"Compression: {pipe_ctx.original_chars:,} → {pipe_ctx.compressed_chars:,} chars "
            f"(saved ~{pipe_ctx.tokens_saved:,} tokens). "
            f"Only reference data you can see."
        )

        if ctx.search_context:
            user_parts.append(f"## Relevant Search Results\n{ctx.search_context[:3000]}")

        user_parts.append(f"## Roska Descriptors\n\n{pipe_ctx.context_for_llm}")
        user_parts.append(f"## Question\n\n{ctx.query}")
        user_message = "\n\n".join(user_parts)

        # 5. Call LLM
        messages = [
            LLMMessage("system", system_prompt),
            LLMMessage("user", user_message),
        ]
        response = ctx.llm.complete(messages, max_tokens=4096)

        # 6. Update matrix
        pipe_ctx.matrix.mark_analyzed()

        return AgentResult(
            agent_name=self.name,
            content=response.content,
            sources=pipe_ctx.sources,
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

    def _infer_tags(self, query: str) -> list[str]:
        query_lower = query.lower()
        tags = []
        if any(w in query_lower for w in ["overview", "high-level", "summary"]):
            tags.append("overview")
        if any(w in query_lower for w in ["deep", "detail", "trace", "execution"]):
            tags.append("deep")
            tags.append("detailed")
        if any(w in query_lower for w in ["onboard", "new developer", "getting started"]):
            tags.append("onboarding")
            tags.append("beginner")
        if any(w in query_lower for w in ["quality", "refactor", "god class", "coupling"]):
            tags.append("code-quality")
        tags.append("structural")
        tags.append("single-project")
        return tags
