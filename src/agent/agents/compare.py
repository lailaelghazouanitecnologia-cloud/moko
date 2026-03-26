"""
Compare Agent — cross-project comparison.

v2: Uses ActionPipeline.compare() for compressed workspace loading.
Wraps synth.py's build_profile() and detect_patterns().
"""

import sys
from pathlib import Path

from .base import BaseAgent, AgentContext, AgentResult
from ..core.llm.providers import LLMMessage
from ..pipeline.actions import ActionPipeline, PipelineContext


def _get_synth():
    """Import synth.py functions."""
    src_dir = Path(__file__).resolve().parent.parent.parent
    if str(src_dir) not in sys.path:
        sys.path.insert(0, str(src_dir))
    import synth
    return synth


class CompareAgent(BaseAgent):
    name = "compare"
    description = "Cross-project comparison and synthesis"
    capabilities = [
        "compare", "versus", "vs", "difference", "similar",
        "benchmark", "contrast",
    ]

    def __init__(self):
        super().__init__()
        self._pipeline_ctx: PipelineContext = None

    def run(self, ctx: AgentContext) -> AgentResult:
        synth = _get_synth()

        if len(ctx.projects) < 2:
            return AgentResult(
                agent_name=self.name,
                content="Comparison requires at least 2 projects. "
                        f"Available: {', '.join(ctx.projects)}",
            )

        # 1. Run compare pipeline (map + compress, no file descriptors)
        pipe = ActionPipeline.compare()
        pipe_ctx = PipelineContext(
            query=ctx.query,
            projects=ctx.projects,
            descriptors_dir=ctx.descriptors_dir,
            query_hints={"depth": "overview", "keywords": []},
        )

        if self._pipeline_ctx and self._pipeline_ctx.matrix.turn_count > 0:
            pipe_ctx.matrix = self._pipeline_ctx.matrix

        pipe_ctx = pipe.run(pipe_ctx, verbose=False)
        self._pipeline_ctx = pipe_ctx

        # 2. Build profiles using synth.py
        profiles = []
        for project in ctx.projects:
            try:
                profile = synth.build_profile(project, ctx.descriptors_dir)
                profiles.append(profile)
            except Exception:
                profiles.append(synth.ProjectProfile(name=project))

        # 3. Serialize profiles for LLM
        profile_text = self._format_profiles(profiles, synth)

        # 4. Select prompt
        prompt = ctx.prompt_registry.select(
            task_type="compare",
            agent=self.name,
            tags=["multi-project", "frameworks"],
        )
        base_system = ctx.prompt_registry.get_base_system()
        system_prompt = prompt.render(base_system=base_system)

        # 5. Build message with compressed workspace context + profiles
        user_parts = []

        files_loaded = len(pipe_ctx.sources)
        user_parts.append(
            f"**Coverage**: {files_loaded} workspace descriptors loaded for {len(ctx.projects)} projects. "
            f"Compression: {pipe_ctx.original_chars:,} → {pipe_ctx.compressed_chars:,} chars "
            f"(saved ~{pipe_ctx.tokens_saved:,} tokens). "
            f"Only reference data you can see."
        )

        if pipe_ctx.context_for_llm:
            user_parts.append(f"## Workspace Context\n\n{pipe_ctx.context_for_llm}")

        user_parts.append(f"## Project Profiles\n\n{profile_text}")
        user_parts.append(f"## Question\n\n{ctx.query}")

        # 6. Call LLM
        messages = [
            LLMMessage("system", system_prompt),
            LLMMessage("user", "\n\n".join(user_parts)),
        ]
        response = ctx.llm.complete(messages, max_tokens=4096)

        # 7. Update matrix
        pipe_ctx.matrix.mark_analyzed()

        return AgentResult(
            agent_name=self.name,
            content=response.content,
            sources=pipe_ctx.sources + [f"{p.name}/workspace.yaml" for p in profiles
                                         if f"{p.name}/workspace.yaml" not in pipe_ctx.sources],
            usage=response.usage,
            prompt_id=prompt.metadata.id,
            metadata={
                "files_loaded": files_loaded,
                "files_available": sum(p.total_files for p in profiles),
                "coverage_pct": 0.0,  # compare only loads workspaces
                "original_chars": pipe_ctx.original_chars,
                "compressed_chars": pipe_ctx.compressed_chars,
                "tokens_saved": pipe_ctx.tokens_saved,
                "compression_ratio": pipe_ctx.compressed.ratio if pipe_ctx.compressed else 0,
                "strategies": pipe_ctx.compressed.strategies_applied if pipe_ctx.compressed else [],
            },
        )

    def _format_profiles(self, profiles, synth) -> str:
        """Format project profiles as readable text for LLM."""
        parts = []
        for p in profiles:
            lines = [
                f"### {p.name}",
                f"Language: {p.lang}",
                f"Files: {p.total_files} | Lines: {p.total_lines:,}",
                f"Descriptors: {p.yaml_count} ({p.descriptor_size_kb} KB)",
                f"Patterns: {', '.join(p.patterns) if p.patterns else 'none detected'}",
            ]

            # Layers
            if p.layers:
                lines.append(f"Layers:")
                if p.layers.logic_lines:
                    lines.append(f"  - logic: {p.layers.logic_files} files, {p.layers.logic_lines:,} lines")
                if p.layers.ui_lines:
                    lines.append(f"  - ui: {p.layers.ui_files} files, {p.layers.ui_lines:,} lines")
                if p.layers.test_lines:
                    lines.append(f"  - test: {p.layers.test_files} files, {p.layers.test_lines:,} lines")

            # Modules
            if p.modules:
                lines.append(f"Modules ({len(p.modules)}):")
                for m in p.modules[:10]:
                    lines.append(f"  - {m.name}: {m.files}f/{m.lines}L/{m.types}T/{m.functions}F")

            # Top types
            if p.top_types:
                lines.append(f"Top Types:")
                for t in p.top_types[:8]:
                    lines.append(f"  - {t.name} ({t.kind}): {t.methods}m/{t.fields}f")

            # Top functions
            if p.top_functions:
                lines.append(f"Top Functions:")
                for f in p.top_functions[:8]:
                    calls_str = f" calls: {len(f.calls)}" if f.calls else ""
                    async_str = " async" if f.is_async else ""
                    lines.append(f"  - {f.name}{async_str}{calls_str}")

            parts.append("\n".join(lines))

        return "\n\n---\n\n".join(parts)
