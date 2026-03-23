"""
Supervisor — central orchestrator for the Moko agent.

Inspired by Cline's Controller: receives user query, classifies it,
routes to specialized agents, and assembles the final response.

Flow:
1. Snapshot session state (pre-query)
2. Classify task (heuristic → LLM fallback)
3. Build AgentContext
4. Pre-search via SearchAgent (no LLM)
5. Dispatch to primary agent
6. Synthesize if multiple results
7. Record turn in session
"""

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .agents.base import AgentContext, AgentResult, BaseAgent
from .agents import ALL_AGENTS
from .llm.providers import LLMProvider, LLMMessage
from .vectorstore.search import VectorStore
from .prompts.registry import PromptRegistry
from .session.state import SessionState
from . import OUT_DIR, REGISTRY_PATH


@dataclass
class TaskClassification:
    """Result of analyzing what the user wants."""
    task_type: str
    scope: list[str]            # project names in scope
    requires_search: bool = True
    requires_comparison: bool = False
    confidence: float = 0.8


# ── Task Classification Heuristics ────────────────────────────────

_TASK_KEYWORDS = {
    "architecture": [
        "architecture", "structure", "module", "overview", "how is",
        "built", "design", "component", "pattern", "organized",
        "onboard", "getting started", "entry point",
    ],
    "dependency": [
        "depend", "import", "calls", "uses", "circular",
        "coupling", "fan-in", "fan-out", "graph",
    ],
    "security": [
        "secur", "vulnerab", "credential", "inject", "auth",
        "password", "token", "secret", "permission",
    ],
    "compare": [
        "compare", "versus", "vs", "differ", "similar",
        "benchmark", "contrast",
    ],
    "search": [
        "find", "search", "where", "which file", "locate",
        "look for", "show me",
    ],
}


def _classify_by_keywords(query: str, available_projects: list[str]) -> TaskClassification:
    """Fast heuristic classification using keywords."""
    query_lower = query.lower()

    # Detect projects in scope (supports partial matching: "cline" → "cline-core")
    scope = [p for p in available_projects if p.lower() in query_lower]
    if not scope:
        # Try partial match: check if any query word is a prefix/substring of project name
        query_words = query_lower.split()
        scope = [
            p for p in available_projects
            if any(w in p.lower() or p.lower().startswith(w) for w in query_words if len(w) >= 3)
        ]
    if not scope:
        scope = available_projects

    # Score each task type
    scores = {}
    for task_type, keywords in _TASK_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in query_lower)
        if score > 0:
            scores[task_type] = score

    if not scores:
        task_type = "architecture"  # fallback
        confidence = 0.3
    else:
        task_type = max(scores, key=scores.get)
        confidence = min(1.0, scores[task_type] / 3)

    requires_comparison = task_type == "compare" or len(scope) > 1
    if requires_comparison and task_type != "compare":
        # If multiple projects mentioned but not explicitly comparing
        requires_comparison = False

    return TaskClassification(
        task_type=task_type,
        scope=scope,
        requires_search=task_type != "compare",
        requires_comparison=requires_comparison,
        confidence=confidence,
    )


# ── Agent Selection ───────────────────────────────────────────────

_TASK_AGENT_MAP = {
    "architecture": "architect",
    "dependency": "dependency",
    "security": "security",
    "compare": "compare",
    "search": "search",
    "quality": "architect",
    "general": "architect",
}


# ── Registry Loader ──────────────────────────────────────────────

def _load_registry() -> dict:
    """Load projects.json."""
    if REGISTRY_PATH.exists():
        return json.loads(REGISTRY_PATH.read_text())
    return {"projects": {}}


def _available_projects() -> list[str]:
    """List all projects with descriptors in out/."""
    projects = []
    if OUT_DIR.is_dir():
        for d in sorted(OUT_DIR.iterdir()):
            if d.is_dir() and not d.name.startswith("."):
                projects.append(d.name)
    return projects


# ── Supervisor ────────────────────────────────────────────────────

class Supervisor:
    """Central orchestrator — classifies queries, dispatches to agents, synthesizes."""

    def __init__(self, config: dict = None):
        config = config or {}

        # LLM provider
        self.llm = LLMProvider(
            provider=config.get("provider", "groq"),
            model=config.get("model"),
        )

        # Prompt registry
        self.prompt_registry = PromptRegistry()

        # Session state
        self.session = SessionState()

        # Agents
        self.agents: dict[str, BaseAgent] = {}
        for agent_cls in ALL_AGENTS:
            agent = agent_cls()
            self.agents[agent.name] = agent

        # Vector store (lazy init)
        self._vector_store: Optional[VectorStore] = None
        self._db_path = config.get("db_path", str(OUT_DIR / ".vectordb"))
        self._embedding_provider = config.get("embedding", "local")

    @property
    def vector_store(self) -> Optional[VectorStore]:
        """Lazy-init vector store."""
        if self._vector_store is None:
            try:
                from .vectorstore.embeddings import EmbeddingProvider
                embedder = EmbeddingProvider(self._embedding_provider)
                self._vector_store = VectorStore(self._db_path, embedder)
            except Exception:
                self._vector_store = None
        return self._vector_store

    def run(self, query: str, projects: list[str] = None,
            verbose: bool = False) -> str:
        """Main orchestration loop."""
        all_projects = projects or _available_projects()

        # 1. Snapshot session state
        if self.session.turns:
            self.session.snapshot(f"pre:{query[:30]}")

        # 2. Classify the task
        classification = _classify_by_keywords(query, all_projects)

        if verbose:
            print(f"  [supervisor] task_type={classification.task_type} "
                  f"scope={classification.scope[:3]} "
                  f"confidence={classification.confidence:.1f}")

        # 3. If low confidence, use LLM classification
        if classification.confidence < 0.5:
            classification = self._classify_with_llm(
                query, all_projects, classification
            )

        # 4. Build agent context
        ctx = AgentContext(
            query=query,
            projects=classification.scope,
            descriptors_dir=OUT_DIR,
            registry=_load_registry(),
            vector_store=self.vector_store,
            llm=self.llm,
            prompt_registry=self.prompt_registry,
            session=self.session,
        )

        # 5. Pre-search via SearchAgent (no LLM cost)
        results: list[AgentResult] = []
        if classification.requires_search and "search" in self.agents:
            search_result = self.agents["search"].run(ctx)
            results.append(search_result)
            ctx.search_context = search_result.content

            if verbose:
                print(f"  [search] {len(search_result.sources)} sources found")

        # 6. Dispatch to primary agent
        primary_name = _TASK_AGENT_MAP.get(
            classification.task_type, "architect"
        )

        # If task is pure search, we already have the result
        if primary_name == "search" and results:
            final = results[0].content
        else:
            if verbose:
                print(f"  [supervisor] dispatching to {primary_name}...")

            primary_agent = self.agents.get(primary_name, self.agents["architect"])
            primary_result = primary_agent.run(ctx)
            results.append(primary_result)
            final = primary_result.content

        # 7. Synthesize if multiple LLM results
        llm_results = [r for r in results if r.usage is not None]
        if len(llm_results) > 1:
            final = self._synthesize(query, llm_results)

        # 8. Record turn
        self.session.record_turn(
            query=query,
            response=final,
            task_type=classification.task_type,
            agents_used=[r.agent_name for r in results],
            prompt_ids=[r.prompt_id for r in results if r.prompt_id],
            sources=[s for r in results for s in r.sources],
            token_usage={
                "total": sum(
                    r.usage.total_tokens for r in results if r.usage
                ),
            },
        )

        return final

    def _classify_with_llm(self, query: str, projects: list[str],
                           fallback: TaskClassification) -> TaskClassification:
        """Use LLM to classify ambiguous queries."""
        prompt = self.prompt_registry.get("classify_task")
        if not prompt:
            return fallback

        project_list = ", ".join(projects[:30])
        system = prompt.render(project_list=project_list)

        try:
            response = self.llm.complete_with_usage(
                [
                    LLMMessage("system", system),
                    LLMMessage("user", query),
                ],
                temperature=0.1,
                max_tokens=200,
            )
            data = json.loads(response.content)
            return TaskClassification(
                task_type=data.get("task_type", fallback.task_type),
                scope=data.get("projects", fallback.scope) or fallback.scope,
                requires_search=fallback.requires_search,
                requires_comparison=data.get("task_type") == "compare",
                confidence=data.get("confidence", 0.7),
            )
        except (json.JSONDecodeError, Exception):
            return fallback

    def _synthesize(self, query: str, results: list[AgentResult]) -> str:
        """Combine multiple agent results into a coherent response."""
        prompt = self.prompt_registry.get("synthesis")
        if not prompt:
            return "\n\n---\n\n".join(r.content for r in results)

        parts = []
        for r in results:
            parts.append(f"## {r.agent_name} analysis\n{r.content}")
        combined = "\n\n".join(parts)

        response = self.llm.complete(
            [
                LLMMessage("system", prompt.system_template),
                LLMMessage("user", f"Original question: {query}\n\n{combined}"),
            ],
            max_tokens=4096,
        )
        return response.content
