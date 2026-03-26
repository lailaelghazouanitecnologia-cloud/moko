"""
Search Agent — semantic search across all descriptors.

This is a pure retrieval agent: it does NOT call the LLM.
It queries the vector store and returns formatted results.
Used as a pre-pass by the Supervisor to inject context into other agents.
"""

from .base import BaseAgent, AgentContext, AgentResult


class SearchAgent(BaseAgent):
    name = "search"
    description = "Semantic search across all descriptors"
    capabilities = ["search", "find", "locate", "where", "which file", "look for"]

    def run(self, ctx: AgentContext) -> AgentResult:
        """Search the vector store and return formatted results. No LLM call."""
        if not ctx.vector_store or not ctx.vector_store.is_indexed():
            return AgentResult(
                agent_name=self.name,
                content="[Vector index not built. Run: ava agent --index]",
            )

        results = ctx.vector_store.search(
            query=ctx.query,
            projects=ctx.projects if ctx.projects else None,
            top_k=15,
        )

        if not results:
            return AgentResult(
                agent_name=self.name,
                content="No matching descriptors found.",
                sources=[],
            )

        # Format results
        lines = [f"Found {len(results)} relevant descriptors:\n"]
        for i, r in enumerate(results, 1):
            lines.append(f"### {i}. {r.project}/{r.file_path}")
            lines.append(f"   Type: {r.descriptor_type} | Layer: {r.layer} | Lines: {r.lines}")
            if r.types:
                lines.append(f"   Types: {', '.join(r.types[:5])}")
            if r.functions:
                lines.append(f"   Functions: {', '.join(r.functions[:5])}")

            # Include a snippet of content
            snippet = r.content[:300].strip()
            if len(r.content) > 300:
                snippet += "..."
            lines.append(f"   ```yaml\n   {snippet}\n   ```")
            lines.append("")

        return AgentResult(
            agent_name=self.name,
            content="\n".join(lines),
            sources=[f"{r.project}/{r.file_path}" for r in results],
        )
