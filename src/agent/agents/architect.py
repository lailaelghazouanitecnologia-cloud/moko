"""
Architect Agent — analyzes project architecture, modules, and patterns.

Uses vector search to find the most relevant descriptors (not just biggest-first
like the original analyze.py). Selects prompt from registry based on query.
"""

import sys
from pathlib import Path

from .base import BaseAgent, AgentContext, AgentResult
from ..llm.providers import LLMMessage


def _load_descriptors_for_context(ctx: AgentContext) -> tuple[str, list[str]]:
    """Load descriptors for LLM context. Uses vector search + priority loading.

    Returns (descriptor_text, source_paths).
    """
    parts = []
    sources = []
    total_chars = 0
    char_budget = ctx.max_tokens * 4  # ~4 chars per token

    # Priority 1: always include workspace.yaml
    for project in ctx.projects:
        ws_path = ctx.descriptors_dir / project / "workspace.yaml"
        if ws_path.exists():
            content = ws_path.read_text(errors="replace")
            parts.append(f"# WORKSPACE: {project}\n{content}")
            sources.append(f"{project}/workspace.yaml")
            total_chars += len(content)

    # Priority 2: deps.yaml
    for project in ctx.projects:
        deps_path = ctx.descriptors_dir / project / "deps.yaml"
        if deps_path.exists() and total_chars < char_budget:
            content = deps_path.read_text(errors="replace")
            truncated = content[:4000]
            parts.append(f"# DEPS: {project}\n{truncated}")
            sources.append(f"{project}/deps.yaml")
            total_chars += len(truncated)

    # Priority 3: graph meta
    for project in ctx.projects:
        meta_path = ctx.descriptors_dir / project / "graphs" / "meta.yaml"
        if meta_path.exists() and total_chars < char_budget:
            content = meta_path.read_text(errors="replace")
            parts.append(f"# GRAPH: {project}\n{content[:4000]}")
            sources.append(f"{project}/graphs/meta.yaml")
            total_chars += min(len(content), 4000)

    # Priority 4: vector search results (most relevant descriptors)
    if ctx.vector_store and ctx.vector_store.is_indexed():
        search_results = ctx.vector_store.search(
            query=ctx.query,
            projects=ctx.projects,
            top_k=20,
        )
        for r in search_results:
            if total_chars >= char_budget:
                break
            if f"{r.project}/{r.file_path}" in sources:
                continue
            parts.append(f"# FILE: {r.project}/{r.file_path}\n{r.content}")
            sources.append(f"{r.project}/{r.file_path}")
            total_chars += len(r.content)

    # Priority 5: fill remaining budget with module.yaml files
    for project in ctx.projects:
        project_dir = ctx.descriptors_dir / project
        if not project_dir.is_dir():
            continue
        for mod_yaml in sorted(project_dir.rglob("module.yaml")):
            if total_chars >= char_budget:
                break
            rel = f"{project}/{mod_yaml.relative_to(project_dir)}"
            if rel in sources:
                continue
            content = mod_yaml.read_text(errors="replace")
            parts.append(f"# MODULE: {rel}\n{content}")
            sources.append(rel)
            total_chars += len(content)

    return "\n\n".join(parts), sources


class ArchitectAgent(BaseAgent):
    name = "architect"
    description = "Analyzes project architecture, module structure, patterns"
    capabilities = [
        "architecture", "structure", "overview", "modules", "patterns",
        "onboard", "how", "built", "design", "components",
    ]

    def run(self, ctx: AgentContext) -> AgentResult:
        # 1. Select prompt from registry
        tags = self._infer_tags(ctx.query)
        prompt = ctx.prompt_registry.select(
            task_type="architecture",
            agent=self.name,
            tags=tags,
        )
        base_system = ctx.prompt_registry.get_base_system()
        system_prompt = prompt.render(base_system=base_system)

        # 2. Load descriptors (vector search + priority)
        descriptors, sources = _load_descriptors_for_context(ctx)

        # 3. Build user message
        user_parts = []
        if ctx.search_context:
            user_parts.append(f"## Relevant Search Results\n{ctx.search_context[:3000]}")
        user_parts.append(f"## Roska Descriptors\n\n{descriptors}")
        user_parts.append(f"## Question\n\n{ctx.query}")
        user_message = "\n\n".join(user_parts)

        # 4. Call LLM
        messages = [
            LLMMessage("system", system_prompt),
            LLMMessage("user", user_message),
        ]
        response = ctx.llm.complete(messages, max_tokens=4096)

        return AgentResult(
            agent_name=self.name,
            content=response.content,
            sources=sources,
            usage=response.usage,
            prompt_id=prompt.metadata.id,
        )

    def _infer_tags(self, query: str) -> list[str]:
        """Infer prompt tags from query keywords."""
        query_lower = query.lower()
        tags = []
        if any(w in query_lower for w in ["overview", "high-level", "summary"]):
            tags.append("overview")
        if any(w in query_lower for w in ["deep", "detail", "trace", "execution"]):
            tags.append("deep")
            tags.append("detailed")
        if any(w in query_lower for w in ["onboard", "new developer", "getting started", "first day"]):
            tags.append("onboarding")
            tags.append("beginner")
        if any(w in query_lower for w in ["quality", "refactor", "god class", "coupling"]):
            tags.append("code-quality")
        tags.append("structural")
        tags.append("single-project")
        return tags
