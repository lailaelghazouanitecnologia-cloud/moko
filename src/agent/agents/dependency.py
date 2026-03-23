"""
Dependency Agent — analyzes dependency graphs, imports, call chains.

Focuses on deps.yaml, graph meta.yaml, and import chains.
Answers "what depends on X", "find circular deps", "trace call path from A to B".
"""

from .base import BaseAgent, AgentContext, AgentResult
from ..llm.providers import LLMMessage


class DependencyAgent(BaseAgent):
    name = "dependency"
    description = "Dependency graph analysis, import chains, circular deps"
    capabilities = [
        "depend", "import", "calls", "uses", "circular",
        "coupling", "fan-in", "fan-out", "graph",
    ]

    def run(self, ctx: AgentContext) -> AgentResult:
        # 1. Select prompt
        tags = self._infer_tags(ctx.query)
        prompt = ctx.prompt_registry.select(
            task_type="dependency",
            agent=self.name,
            tags=tags,
        )
        base_system = ctx.prompt_registry.get_base_system()
        system_prompt = prompt.render(base_system=base_system)

        # 2. Load dependency-focused descriptors
        descriptors, sources = self._load_deps_context(ctx)

        # 3. Build message
        user_parts = []
        if ctx.search_context:
            user_parts.append(f"## Relevant Search Results\n{ctx.search_context[:2000]}")
        user_parts.append(f"## Dependency Descriptors\n\n{descriptors}")
        user_parts.append(f"## Question\n\n{ctx.query}")

        messages = [
            LLMMessage("system", system_prompt),
            LLMMessage("user", "\n\n".join(user_parts)),
        ]
        response = ctx.llm.complete(messages, max_tokens=4096)

        return AgentResult(
            agent_name=self.name,
            content=response.content,
            sources=sources,
            usage=response.usage,
            prompt_id=prompt.metadata.id,
        )

    def _load_deps_context(self, ctx: AgentContext) -> tuple[str, list[str]]:
        """Load dependency-focused descriptors (deps.yaml, graph meta, workspace)."""
        parts = []
        sources = []
        total_chars = 0
        char_budget = ctx.max_tokens * 4

        for project in ctx.projects:
            project_dir = ctx.descriptors_dir / project
            if not project_dir.is_dir():
                continue

            # deps.yaml — full content (most important for this agent)
            deps_path = project_dir / "deps.yaml"
            if deps_path.exists():
                content = deps_path.read_text(errors="replace")
                parts.append(f"# DEPS: {project}\n{content}")
                sources.append(f"{project}/deps.yaml")
                total_chars += len(content)

            # Graph meta
            meta_path = project_dir / "graphs" / "meta.yaml"
            if meta_path.exists() and total_chars < char_budget:
                content = meta_path.read_text(errors="replace")
                parts.append(f"# GRAPH META: {project}\n{content}")
                sources.append(f"{project}/graphs/meta.yaml")
                total_chars += len(content)

            # Workspace for module list
            ws_path = project_dir / "workspace.yaml"
            if ws_path.exists() and total_chars < char_budget:
                content = ws_path.read_text(errors="replace")
                parts.append(f"# WORKSPACE: {project}\n{content}")
                sources.append(f"{project}/workspace.yaml")
                total_chars += len(content)

        # Supplement with vector search for dependency-related descriptors
        if ctx.vector_store and ctx.vector_store.is_indexed():
            search_results = ctx.vector_store.search(
                query=ctx.query,
                projects=ctx.projects,
                descriptor_type="deps",
                top_k=10,
            )
            for r in search_results:
                if total_chars >= char_budget:
                    break
                if f"{r.project}/{r.file_path}" in sources:
                    continue
                parts.append(f"# {r.project}/{r.file_path}\n{r.content}")
                sources.append(f"{r.project}/{r.file_path}")
                total_chars += len(r.content)

        return "\n\n".join(parts), sources

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
