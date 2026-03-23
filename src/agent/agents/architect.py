"""
Architect Agent — analyzes project architecture, modules, and patterns.

v2: Query-aware descriptor loading. Instead of just loading workspace+deps+modules
(which misses all individual file descriptors where the real type/function data lives),
we now:
1. Always load workspace.yaml + deps.yaml (structural overview)
2. Parse the query to identify which file descriptors are most relevant
3. Load individual file descriptors sorted by relevance (types, imports, size)
4. Track coverage: how much of the codebase we're actually showing the LLM
5. Inject coverage metadata so the LLM knows what it's NOT seeing

This fixes the core issue: the LLM was seeing module summaries but not the
actual type definitions, function signatures, and call graphs.
"""

import re
import sys
from pathlib import Path

from .base import BaseAgent, AgentContext, AgentResult
from ..llm.providers import LLMMessage


def _parse_query_hints(query: str) -> dict:
    """Extract structural hints from the query to prioritize descriptors.

    Returns dict with:
    - keywords: important terms to match against file paths/content
    - wants_types: True if query asks about classes/types/interfaces
    - wants_functions: True if asks about functions/methods/execution
    - wants_deps: True if asks about imports/dependencies
    - depth: "overview" or "deep"
    """
    ql = query.lower()
    return {
        "keywords": [w for w in re.findall(r'\b[a-zA-Z]\w{3,}\b', query) if w.lower() not in {
            "what", "how", "does", "this", "that", "with", "from", "about",
            "which", "where", "when", "analyze", "review", "overview",
            "architecture", "structure", "project", "codebase",
        }],
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


def _score_file_descriptor(path: Path, content: str, hints: dict) -> float:
    """Score a file descriptor's relevance to the query. Higher = more relevant."""
    score = 0.0
    path_str = str(path).lower()
    content_lower = content[:2000].lower()

    # Keyword match in path (strongest signal)
    for kw in hints["keywords"]:
        kw_lower = kw.lower()
        if kw_lower in path_str:
            score += 20
        if kw_lower in content_lower:
            score += 5

    # Prefer files with types if query asks about types
    if hints["wants_types"]:
        type_count = content_lower.count("- name:")
        score += min(type_count * 3, 15)

    # Prefer files with functions if query asks about execution
    if hints["wants_functions"]:
        if "functions:" in content_lower:
            score += 8
        func_count = content_lower.count("calls:")
        score += min(func_count * 2, 10)

    # Prefer larger files (more information)
    lines_match = re.search(r'lines:\s*(\d+)', content[:500])
    if lines_match:
        lines = int(lines_match.group(1))
        score += min(lines / 100, 5)  # cap at 5 bonus points

    # Penalize test files for architecture queries
    if "/test" in path_str or "__test" in path_str or ".test." in path_str:
        score -= 10

    return score


def _load_descriptors_for_context(ctx: AgentContext) -> tuple[str, list[str], dict]:
    """Load descriptors for LLM context with query-aware relevance scoring.

    Returns (descriptor_text, source_paths, coverage_metadata).
    """
    parts = []
    sources = []
    total_chars = 0
    char_budget = ctx.max_tokens * 4

    # Parse query for relevance hints
    hints = _parse_query_hints(ctx.query)

    # Track coverage
    total_files_available = 0
    total_files_loaded = 0
    total_types_available = 0
    total_types_loaded = 0

    for project in ctx.projects:
        project_dir = ctx.descriptors_dir / project
        if not project_dir.is_dir():
            continue

        # ── Priority 1: workspace.yaml (always — it's the map) ──
        ws_path = project_dir / "workspace.yaml"
        if ws_path.exists():
            content = ws_path.read_text(errors="replace")
            parts.append(f"# WORKSPACE: {project}\n{content}")
            sources.append(f"{project}/workspace.yaml")
            total_chars += len(content)

        # ── Priority 2: deps.yaml (module-level dependency graph) ──
        deps_path = project_dir / "deps.yaml"
        if deps_path.exists() and total_chars < char_budget:
            content = deps_path.read_text(errors="replace")
            # Don't truncate if query is about deps
            limit = len(content) if hints["wants_deps"] else 6000
            truncated = content[:limit]
            parts.append(f"# DEPS: {project}\n{truncated}")
            sources.append(f"{project}/deps.yaml")
            total_chars += len(truncated)

        # ── Priority 3: graph meta (cross-module edges) ──
        meta_path = project_dir / "graphs" / "meta.yaml"
        if meta_path.exists() and total_chars < char_budget:
            content = meta_path.read_text(errors="replace")
            parts.append(f"# GRAPH: {project}\n{content[:4000]}")
            sources.append(f"{project}/graphs/meta.yaml")
            total_chars += min(len(content), 4000)

        # ── Priority 4: vector search results (if available) ──
        if ctx.vector_store and ctx.vector_store.is_indexed():
            search_results = ctx.vector_store.search(
                query=ctx.query,
                projects=[project],
                top_k=20,
            )
            for r in search_results:
                if total_chars >= char_budget:
                    break
                path_key = f"{r.project}/{r.file_path}"
                if path_key in sources:
                    continue
                parts.append(f"# FILE: {path_key}\n{r.content}")
                sources.append(path_key)
                total_chars += len(r.content)
                total_files_loaded += 1

        # ── Priority 5: file descriptors sorted by query relevance ──
        scored_files = []
        for yaml_path in project_dir.rglob("*.yaml"):
            if yaml_path.name in ("workspace.yaml", "module.yaml", "meta.yaml", "deps.yaml"):
                continue
            if "graphs" in str(yaml_path.relative_to(project_dir)):
                continue
            total_files_available += 1
            content = yaml_path.read_text(errors="replace")
            type_count = content.count("- name:")
            total_types_available += type_count
            score = _score_file_descriptor(yaml_path, content, hints)
            scored_files.append((score, yaml_path, content, type_count))

        # Sort by relevance score descending
        scored_files.sort(key=lambda x: -x[0])

        for score, yaml_path, content, type_count in scored_files:
            if total_chars >= char_budget:
                break
            rel = f"{project}/{yaml_path.relative_to(project_dir)}"
            if rel in sources:
                continue
            parts.append(f"# FILE: {rel} (relevance: {score:.0f})\n{content}")
            sources.append(rel)
            total_chars += len(content)
            total_files_loaded += 1
            total_types_loaded += type_count

        # ── Priority 6: module.yaml files (fill remaining) ──
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

    coverage = {
        "files_loaded": total_files_loaded,
        "files_available": total_files_available,
        "types_loaded": total_types_loaded,
        "types_available": total_types_available,
        "chars_loaded": total_chars,
        "char_budget": char_budget,
        "coverage_pct": round(total_files_loaded / max(total_files_available, 1) * 100, 1),
    }

    return "\n\n".join(parts), sources, coverage


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

        # 2. Load descriptors with query-aware relevance scoring
        descriptors, sources, coverage = _load_descriptors_for_context(ctx)

        # 3. Build user message with coverage disclaimer
        user_parts = []

        # Inject coverage metadata so LLM knows its limitations
        coverage_note = (
            f"**Coverage**: Showing {coverage['files_loaded']}/{coverage['files_available']} "
            f"file descriptors ({coverage['coverage_pct']}% of codebase). "
            f"Types visible: ~{coverage['types_loaded']}/{coverage['types_available']}. "
            f"Numbers in workspace.yaml are authoritative for totals; "
            f"individual file descriptors provide type/function details. "
            f"Only reference data you can see — do not infer exact line counts "
            f"for modules you haven't seen individual descriptors for."
        )
        user_parts.append(f"## Important\n{coverage_note}")

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
            metadata=coverage,
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
