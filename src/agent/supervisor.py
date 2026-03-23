"""
Supervisor — central orchestrator for the Moko agent.

Inspired by Cline's Controller: receives user query, classifies it,
routes to specialized agents, and assembles the final response.

v2 improvements:
- Classification: weighted keyword scoring + compound query detection
- Usage reporting: structured report with real tokens from API
- Coverage tracking: how much of the codebase each agent actually saw
"""

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .agents.base import AgentContext, AgentResult, BaseAgent
from .agents import ALL_AGENTS
from .llm.providers import LLMProvider, LLMMessage, LLMUsage
from .vectorstore.search import VectorStore
from .prompts.registry import PromptRegistry
from .session.state import SessionState
from . import OUT_DIR, REGISTRY_PATH


@dataclass
class TaskClassification:
    """Result of analyzing what the user wants."""
    task_type: str
    scope: list[str]
    requires_search: bool = True
    requires_comparison: bool = False
    confidence: float = 0.8


@dataclass
class UsageReport:
    """Comprehensive usage metrics for a single query."""
    query: str
    task_type: str
    agents_used: list[str]
    prompt_ids: list[str]
    # Token metrics
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    is_estimated: bool = True
    # Timing
    elapsed_s: float = 0.0
    tokens_per_sec: float = 0.0
    # Context
    descriptor_chars: int = 0
    sources_count: int = 0
    # Coverage (from agent metadata)
    files_loaded: int = 0
    files_available: int = 0
    coverage_pct: float = 0.0
    # Model
    model: str = ""
    provider: str = ""

    def format(self) -> str:
        """Format as readable report."""
        est_tag = " (est)" if self.is_estimated else ""
        lines = [
            f"{'━' * 60}",
            f"  REPORT",
            f"{'─' * 60}",
            f"  Task type:       {self.task_type}",
            f"  Agents:          {', '.join(self.agents_used)}",
            f"  Model:           {self.model} ({self.provider})",
            f"{'─' * 60}",
            f"  Prompt tokens:   {self.prompt_tokens:,}{est_tag}",
            f"  Output tokens:   {self.completion_tokens:,}{est_tag}",
            f"  Total tokens:    {self.total_tokens:,}{est_tag}",
            f"  Speed:           {self.tokens_per_sec} tok/s",
            f"  Wall time:       {self.elapsed_s:.1f}s",
            f"{'─' * 60}",
            f"  Sources:         {self.sources_count} descriptors loaded",
            f"  Context:         {self.descriptor_chars:,} chars",
        ]
        if self.files_available > 0:
            lines.append(
                f"  Coverage:        {self.files_loaded}/{self.files_available} "
                f"files ({self.coverage_pct:.1f}%)"
            )
        lines.append(f"{'━' * 60}")
        return "\n".join(lines)


# ── Task Classification ───────────────────────────────────────────

# Keywords with weights — higher weight = stronger signal
_TASK_KEYWORDS = {
    "architecture": {
        "architecture": 3, "structure": 2, "module": 2, "overview": 2,
        "how is": 2, "how does": 2, "built": 1, "design": 2, "component": 2,
        "pattern": 2, "organized": 2, "onboard": 2, "handle": 2,
        "getting started": 2, "entry point": 2, "abstraction": 2,
        "layer": 1, "flow": 2, "type": 1, "class": 1, "tool": 1,
        "execution": 2, "pipeline": 2, "process": 1,
    },
    "dependency": {
        "depend": 3, "import": 3, "circular": 3,
        "coupling": 3, "fan-in": 3, "fan-out": 3,
        "graph": 1, "calls": 1, "uses": 1,
    },
    "security": {
        "secur": 3, "vulnerab": 3, "credential": 3, "inject": 3,
        "auth": 2, "password": 3, "token": 1, "secret": 3,
        "permission": 2, "xss": 3, "sql": 2,
    },
    "compare": {
        "compare": 3, "versus": 3, "vs": 3, "differ": 2,
        "similar": 2, "benchmark": 2, "contrast": 2,
    },
    "search": {
        "find": 2, "search": 2, "where": 2, "which file": 3,
        "locate": 3, "look for": 2, "show me": 1,
    },
}


def _classify_by_keywords(query: str, available_projects: list[str]) -> TaskClassification:
    """Weighted heuristic classification."""
    query_lower = query.lower()

    # Detect projects in scope (supports partial matching)
    scope = [p for p in available_projects if p.lower() in query_lower]
    if not scope:
        query_words = query_lower.split()
        scope = [
            p for p in available_projects
            if any(w in p.lower() or p.lower().startswith(w) for w in query_words if len(w) >= 3)
        ]
    if not scope:
        scope = available_projects

    # Weighted scoring
    scores = {}
    for task_type, keywords in _TASK_KEYWORDS.items():
        total = 0
        for kw, weight in keywords.items():
            if kw in query_lower:
                total += weight
        if total > 0:
            scores[task_type] = total

    if not scores:
        task_type = "architecture"
        confidence = 0.3
    else:
        # Check for ties — if architecture and another are close, prefer architecture
        sorted_scores = sorted(scores.items(), key=lambda x: -x[1])
        task_type = sorted_scores[0][0]
        top_score = sorted_scores[0][1]

        # Confidence based on how dominant the top score is
        total_score = sum(scores.values())
        confidence = min(1.0, top_score / max(total_score, 1) * (top_score / 4))

    requires_comparison = task_type == "compare"

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


def _load_registry() -> dict:
    if REGISTRY_PATH.exists():
        return json.loads(REGISTRY_PATH.read_text())
    return {"projects": {}}


def _available_projects() -> list[str]:
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

        self.llm = LLMProvider(
            provider=config.get("provider", "groq"),
            model=config.get("model"),
        )
        self.prompt_registry = PromptRegistry()
        self.session = SessionState()

        self.agents: dict[str, BaseAgent] = {}
        for agent_cls in ALL_AGENTS:
            agent = agent_cls()
            self.agents[agent.name] = agent

        self._vector_store: Optional[VectorStore] = None
        self._db_path = config.get("db_path", str(OUT_DIR / ".vectordb"))
        self._embedding_provider = config.get("embedding", "local")

        # Store last usage report for CLI access
        self.last_report: Optional[UsageReport] = None

    @property
    def vector_store(self) -> Optional[VectorStore]:
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
        t0 = time.time()
        all_projects = projects or _available_projects()

        # 1. Snapshot
        if self.session.turns:
            self.session.snapshot(f"pre:{query[:30]}")

        # 2. Classify
        classification = _classify_by_keywords(query, all_projects)

        if verbose:
            print(f"  [supervisor] task_type={classification.task_type} "
                  f"scope={classification.scope[:3]} "
                  f"confidence={classification.confidence:.2f}")

        # 3. LLM fallback for low-confidence classification
        if classification.confidence < 0.4:
            classification = self._classify_with_llm(
                query, all_projects, classification
            )
            if verbose:
                print(f"  [supervisor] LLM reclassified → {classification.task_type} "
                      f"confidence={classification.confidence:.2f}")

        # 4. Build context
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

        # 5. Pre-search
        results: list[AgentResult] = []
        if classification.requires_search and "search" in self.agents:
            search_result = self.agents["search"].run(ctx)
            results.append(search_result)
            ctx.search_context = search_result.content
            if verbose:
                print(f"  [search] {len(search_result.sources)} sources found")

        # 6. Dispatch
        primary_name = _TASK_AGENT_MAP.get(classification.task_type, "architect")

        if primary_name == "search" and results:
            final = results[0].content
        else:
            if verbose:
                print(f"  [supervisor] dispatching to {primary_name}...")
            primary_agent = self.agents.get(primary_name, self.agents["architect"])
            primary_result = primary_agent.run(ctx)
            results.append(primary_result)
            final = primary_result.content

        # 7. Synthesize if needed
        llm_results = [r for r in results if r.usage is not None]
        if len(llm_results) > 1:
            final = self._synthesize(query, llm_results)

        elapsed = time.time() - t0

        # 8. Build usage report
        self.last_report = self._build_report(
            query, classification, results, elapsed
        )

        # 9. Record turn
        self.session.record_turn(
            query=query,
            response=final,
            task_type=classification.task_type,
            agents_used=[r.agent_name for r in results],
            prompt_ids=[r.prompt_id for r in results if r.prompt_id],
            sources=[s for r in results for s in r.sources],
            token_usage={
                "prompt_tokens": self.last_report.prompt_tokens,
                "completion_tokens": self.last_report.completion_tokens,
                "total_tokens": self.last_report.total_tokens,
                "is_estimated": self.last_report.is_estimated,
            },
        )

        return final

    def _build_report(self, query: str, classification: TaskClassification,
                      results: list[AgentResult], elapsed: float) -> UsageReport:
        """Build structured usage report from all agent results."""
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        any_estimated = False
        tps = 0.0

        for r in results:
            if r.usage:
                prompt_tokens += r.usage.prompt_tokens
                completion_tokens += r.usage.completion_tokens
                total_tokens += r.usage.total_tokens
                if r.usage.is_estimated:
                    any_estimated = True
                if r.usage.tokens_per_sec > tps:
                    tps = r.usage.tokens_per_sec

        # Coverage from agent metadata
        coverage_meta = {}
        for r in results:
            if r.metadata and "files_loaded" in r.metadata:
                coverage_meta = r.metadata
                break

        all_sources = [s for r in results for s in r.sources]
        desc_chars = sum(len(r.content) for r in results)

        return UsageReport(
            query=query,
            task_type=classification.task_type,
            agents_used=[r.agent_name for r in results],
            prompt_ids=[r.prompt_id for r in results if r.prompt_id],
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            is_estimated=any_estimated,
            elapsed_s=round(elapsed, 2),
            tokens_per_sec=tps,
            descriptor_chars=desc_chars,
            sources_count=len(all_sources),
            files_loaded=coverage_meta.get("files_loaded", 0),
            files_available=coverage_meta.get("files_available", 0),
            coverage_pct=coverage_meta.get("coverage_pct", 0.0),
            model=self.llm.model,
            provider=self.llm.provider,
        )

    def _classify_with_llm(self, query: str, projects: list[str],
                           fallback: TaskClassification) -> TaskClassification:
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
