"""
Security Agent — reviews codebase for security concerns.

Searches descriptors for patterns indicating security issues:
- Functions handling credentials, tokens, keys
- Shell exec, file access, network calls
- Missing error handling, exposed internals
"""

from .base import BaseAgent, AgentContext, AgentResult
from ..llm.providers import LLMMessage


class SecurityAgent(BaseAgent):
    name = "security"
    description = "Security review: vulnerabilities, credentials, auth"
    capabilities = [
        "security", "vulnerab", "credential", "auth", "token",
        "password", "inject", "permission", "secret",
    ]

    def run(self, ctx: AgentContext) -> AgentResult:
        # 1. Select prompt
        prompt = ctx.prompt_registry.select(
            task_type="security",
            agent=self.name,
            tags=["audit", "comprehensive"],
        )
        base_system = ctx.prompt_registry.get_base_system()
        system_prompt = prompt.render(base_system=base_system)

        # 2. Load security-relevant descriptors
        descriptors, sources = self._load_security_context(ctx)

        # 3. Call LLM
        user_parts = []
        if ctx.search_context:
            user_parts.append(f"## Relevant Search Results\n{ctx.search_context[:2000]}")
        user_parts.append(f"## Roska Descriptors\n\n{descriptors}")
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

    def _load_security_context(self, ctx: AgentContext) -> tuple[str, list[str]]:
        """Load descriptors with security-relevant content."""
        parts = []
        sources = []
        total_chars = 0
        char_budget = ctx.max_tokens * 4

        # Security-relevant search queries
        security_queries = [
            ctx.query,
            "credentials token secret password api_key",
            "execute command subprocess shell",
            "network request http fetch",
            "authentication authorization permission",
        ]

        seen_paths = set()

        for sq in security_queries:
            if ctx.vector_store and ctx.vector_store.is_indexed():
                results = ctx.vector_store.search(
                    query=sq,
                    projects=ctx.projects,
                    top_k=8,
                )
                for r in results:
                    path_key = f"{r.project}/{r.file_path}"
                    if path_key in seen_paths or total_chars >= char_budget:
                        continue
                    seen_paths.add(path_key)
                    parts.append(f"# {path_key}\n{r.content}")
                    sources.append(path_key)
                    total_chars += len(r.content)

        # Also include workspace for context
        for project in ctx.projects:
            ws_path = ctx.descriptors_dir / project / "workspace.yaml"
            path_key = f"{project}/workspace.yaml"
            if ws_path.exists() and path_key not in seen_paths and total_chars < char_budget:
                content = ws_path.read_text(errors="replace")
                parts.append(f"# WORKSPACE: {project}\n{content}")
                sources.append(path_key)
                total_chars += len(content)

        return "\n\n".join(parts), sources
