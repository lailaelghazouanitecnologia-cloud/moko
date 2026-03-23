"""
Compare Agent — cross-project comparison.

Wraps synth.py's build_profile() and detect_patterns() to build project profiles,
then feeds them to the LLM with a comparison prompt.
"""

import sys
from dataclasses import asdict
from pathlib import Path

from .base import BaseAgent, AgentContext, AgentResult
from ..llm.providers import LLMMessage


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

    def run(self, ctx: AgentContext) -> AgentResult:
        synth = _get_synth()

        if len(ctx.projects) < 2:
            return AgentResult(
                agent_name=self.name,
                content="Comparison requires at least 2 projects. "
                        f"Available: {', '.join(ctx.projects)}",
            )

        # 1. Build profiles using synth.py
        profiles = []
        for project in ctx.projects:
            try:
                profile = synth.build_profile(project, ctx.descriptors_dir)
                profiles.append(profile)
            except Exception as e:
                profiles.append(synth.ProjectProfile(name=project))

        # 2. Serialize profiles for LLM
        profile_text = self._format_profiles(profiles, synth)

        # 3. Select prompt
        prompt = ctx.prompt_registry.select(
            task_type="compare",
            agent=self.name,
            tags=["multi-project", "frameworks"],
        )
        base_system = ctx.prompt_registry.get_base_system()
        system_prompt = prompt.render(base_system=base_system)

        # 4. Call LLM
        user_parts = [
            f"## Project Profiles\n\n{profile_text}",
            f"## Question\n\n{ctx.query}",
        ]

        messages = [
            LLMMessage("system", system_prompt),
            LLMMessage("user", "\n\n".join(user_parts)),
        ]
        response = ctx.llm.complete(messages, max_tokens=4096)

        return AgentResult(
            agent_name=self.name,
            content=response.content,
            sources=[f"{p.name}/workspace.yaml" for p in profiles],
            usage=response.usage,
            prompt_id=prompt.metadata.id,
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
