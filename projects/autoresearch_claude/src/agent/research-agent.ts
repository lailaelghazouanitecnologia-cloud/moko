/**
 * ResearchAgent — the main orchestrator that ties together search, extraction,
 * knowledge graph construction, planning, and reporting into a single
 * autonomous research pipeline.
 *
 * Uses the TaskScheduler for concurrent task execution with dependency
 * resolution, and FeedbackLoop for iterative refinement of the knowledge
 * graph before final report generation.
 */

import { WebSearcher } from "../search/web-searcher";
import { QueryBuilder } from "../search/query-builder";
import { SearchResult } from "../search/search-result";
import { PaperExtractor, Paper } from "../extraction/paper-extractor";
import { ContentParser } from "../extraction/content-parser";
import { KnowledgeGraph } from "../knowledge/knowledge-graph";
import { KnowledgeNode } from "../knowledge/node";
import { KnowledgeEdge } from "../knowledge/edge";
import { ResearchPlanner } from "../reasoning/research-planner";
import { HypothesisEvaluator } from "../reasoning/hypothesis-evaluator";
import { EvidenceRanker } from "../reasoning/evidence-ranker";
import { ReportGenerator, Finding } from "../reporting/report-generator";
import { Paper as CitationPaper } from "../reporting/citation-formatter";
import { TaskScheduler, Task } from "./task-scheduler";
import { FeedbackLoop } from "./feedback-loop";

// ── Event emitter (simple callback pattern, no external deps) ────────

export type AgentEventType =
  | "plan:start"
  | "plan:complete"
  | "search:start"
  | "search:complete"
  | "extract:start"
  | "extract:complete"
  | "synthesize:start"
  | "synthesize:complete"
  | "refine:iteration"
  | "refine:converged"
  | "report:start"
  | "report:complete"
  | "task:complete"
  | "error";

export interface AgentEvent {
  type: AgentEventType;
  message: string;
  data?: unknown;
  timestamp: number;
}

export type AgentEventListener = (event: AgentEvent) => void;

// ── Research options ─────────────────────────────────────────────────

export interface ResearchOptions {
  /** Max concurrent tasks for the scheduler. Default: 3. */
  maxConcurrent?: number;
  /** Max feedback loop iterations for refinement. Default: 5. */
  maxRefinementIterations?: number;
  /** Convergence threshold for refinement score. Default: 0.02. */
  convergenceThreshold?: number;
  /** Maximum number of search queries to issue. Default: 6. */
  maxQueries?: number;
  /** Minimum evidence relevance to include. Default: 0.3. */
  relevanceThreshold?: number;
  /** Depth for the research planner decomposition. Default: 1. */
  planDepth?: number;
  /** Citation style for the report. Default: "APA". */
  citationStyle?: "APA" | "MLA" | "Chicago" | "IEEE";
}

// ── Research result ──────────────────────────────────────────────────

export interface ResearchResult {
  topic: string;
  report: string;
  graph: KnowledgeGraph;
  findings: Finding[];
  citations: CitationPaper[];
  searchResults: SearchResult[];
  papers: Paper[];
  stats: {
    searches: number;
    papersExtracted: number;
    nodesCreated: number;
    edgesCreated: number;
    iterations: number;
    converged: boolean;
    elapsed: number;
  };
}

// ── Refinement state (used inside FeedbackLoop) ─────────────────────

interface RefinementState {
  graph: KnowledgeGraph;
  findings: Finding[];
  papers: Paper[];
  searchResults: SearchResult[];
  queriesUsed: string[];
  topic: string;
}

// ── ResearchAgent ────────────────────────────────────────────────────

export class ResearchAgent {
  public readonly searcher: WebSearcher;
  public readonly extractor: PaperExtractor;
  public readonly graph: KnowledgeGraph;
  public readonly planner: ResearchPlanner;
  public readonly reporter: ReportGenerator;
  public readonly scheduler: TaskScheduler;
  public readonly feedbackLoop: FeedbackLoop<RefinementState>;
  public readonly hypothesisEvaluator: HypothesisEvaluator;
  public readonly evidenceRanker: EvidenceRanker;

  private listeners: Map<AgentEventType, AgentEventListener[]> = new Map();
  private wildcardListeners: AgentEventListener[] = [];

  constructor(options: ResearchOptions = {}) {
    this.searcher = new WebSearcher();
    this.extractor = new PaperExtractor(new ContentParser());
    this.graph = new KnowledgeGraph();
    this.planner = new ResearchPlanner();
    this.reporter = new ReportGenerator();
    this.hypothesisEvaluator = new HypothesisEvaluator();
    this.evidenceRanker = new EvidenceRanker();

    this.scheduler = new TaskScheduler(options.maxConcurrent ?? 3);
    this.feedbackLoop = new FeedbackLoop<RefinementState>(
      options.maxRefinementIterations ?? 5,
      options.convergenceThreshold ?? 0.02,
      2 // stagnation window
    );
  }

  // ── Event emitter ────────────────────────────────────────────────

  /**
   * Register a listener for a specific event type, or use "*" to
   * listen to all events.
   */
  on(eventType: AgentEventType | "*", listener: AgentEventListener): void {
    if (eventType === "*") {
      this.wildcardListeners.push(listener);
      return;
    }
    const list = this.listeners.get(eventType) ?? [];
    list.push(listener);
    this.listeners.set(eventType, list);
  }

  /**
   * Remove a previously registered listener.
   */
  off(eventType: AgentEventType | "*", listener: AgentEventListener): void {
    if (eventType === "*") {
      this.wildcardListeners = this.wildcardListeners.filter(
        (l) => l !== listener
      );
      return;
    }
    const list = this.listeners.get(eventType);
    if (list) {
      this.listeners.set(
        eventType,
        list.filter((l) => l !== listener)
      );
    }
  }

  private emit(type: AgentEventType, message: string, data?: unknown): void {
    const event: AgentEvent = { type, message, data, timestamp: Date.now() };
    const typeListeners = this.listeners.get(type) ?? [];
    for (const listener of typeListeners) {
      try {
        listener(event);
      } catch {
        // Listener errors must not break the pipeline
      }
    }
    for (const listener of this.wildcardListeners) {
      try {
        listener(event);
      } catch {
        // Listener errors must not break the pipeline
      }
    }
  }

  // ── Main entry point ─────────────────────────────────────────────

  /**
   * Conduct autonomous research on a topic. This is the main entry
   * point that orchestrates the full pipeline:
   *
   * 1. Plan   — decompose the topic into research sub-tasks
   * 2. Search — execute queries across multiple sources
   * 3. Extract — parse papers and extract structured data
   * 4. Synthesize — build the knowledge graph, evaluate hypotheses
   * 5. Refine — iteratively improve via feedback loop
   * 6. Report — generate the final research report
   */
  async research(
    topic: string,
    options: ResearchOptions = {}
  ): Promise<ResearchResult> {
    const start = Date.now();
    const maxQueries = options.maxQueries ?? 6;
    const relevanceThreshold = options.relevanceThreshold ?? 0.3;
    const planDepth = options.planDepth ?? 1;
    const citationStyle = options.citationStyle ?? "APA";

    // 1. Plan
    const queries = await this.plan(topic, planDepth);
    const limitedQueries = queries.slice(0, maxQueries);

    // 2. Search
    const searchResults = await this.search(limitedQueries);

    // 3. Extract
    const papers = await this.extract(searchResults);

    // 4. Synthesize — build initial knowledge graph
    const initialFindings = await this.synthesize(papers, topic);

    // 5. Refine via feedback loop
    const initialState: RefinementState = {
      graph: this.graph,
      findings: initialFindings,
      papers,
      searchResults,
      queriesUsed: limitedQueries,
      topic,
    };

    this.emit("refine:iteration", "Starting iterative refinement", {
      iteration: 0,
    });

    const finalState = await this.feedbackLoop.run(
      initialState,
      (state: RefinementState): number => {
        return this.evaluateState(state, relevanceThreshold);
      },
      async (
        state: RefinementState,
        score: number
      ): Promise<RefinementState> => {
        return this.refineState(state, score);
      }
    );

    const progress = this.feedbackLoop.getProgress();
    if (progress.converged) {
      this.emit("refine:converged", "Refinement converged", {
        iterations: progress.iteration + 1,
        score: progress.score,
      });
    }

    // 6. Report
    const citations = this.papersToCitations(finalState.papers);
    const reportText = await this.report(
      topic,
      finalState.findings,
      citations,
      citationStyle
    );

    const elapsed = Date.now() - start;

    return {
      topic,
      report: reportText,
      graph: finalState.graph,
      findings: finalState.findings,
      citations,
      searchResults: finalState.searchResults,
      papers: finalState.papers,
      stats: {
        searches: limitedQueries.length,
        papersExtracted: finalState.papers.length,
        nodesCreated: finalState.graph.nodeCount,
        edgesCreated: finalState.graph.edgeCount,
        iterations: progress.iteration + 1,
        converged: progress.converged,
        elapsed,
      },
    };
  }

  // ── Step-by-step methods ─────────────────────────────────────────

  /**
   * Plan: decompose the research topic into search queries.
   * Uses the ResearchPlanner to build a plan tree, then extracts
   * search-type steps as queries.
   */
  async plan(topic: string, depth: number = 1): Promise<string[]> {
    this.emit("plan:start", `Planning research on: ${topic}`);

    this.planner.createPlan(topic, depth);
    const allSteps = this.planner.allSteps();

    // Extract search queries from search-type steps
    const queries: string[] = [];
    for (const step of allSteps) {
      if (step.type === "search") {
        // Convert step description into a search query by stripping
        // the "Search for..." prefix
        const query = step.description
          .replace(/^Search\s+for\s+/i, "")
          .replace(/\s+on:\s+/i, " ")
          .trim();
        queries.push(query);
      }
    }

    // If no search steps were generated, create queries from the topic directly
    if (queries.length === 0) {
      queries.push(topic);
      queries.push(`${topic} recent advances`);
      queries.push(`${topic} survey overview`);
    }

    this.emit("plan:complete", `Generated ${queries.length} search queries`, {
      queries,
    });

    return queries;
  }

  /**
   * Search: execute an array of queries using the task scheduler
   * for concurrent execution with rate limiting.
   */
  async search(queries: string[]): Promise<SearchResult[]> {
    this.emit("search:start", `Searching with ${queries.length} queries`);

    this.scheduler.reset();

    // Create a task for each query
    const tasks: Task[] = queries.map((query, i) => ({
      id: `search_${i}`,
      type: "search",
      priority: queries.length - i, // earlier queries get higher priority
      dependencies: [],
      status: "pending" as const,
    }));

    // Set up the executor — each task runs a web search
    this.scheduler.setExecutor(async (task: Task) => {
      const idx = parseInt(task.id.split("_")[1], 10);
      const query = queries[idx];

      const qb = new QueryBuilder();
      // Split multi-word query into terms for better matching
      const terms = query.split(/\s+/).filter((t) => t.length > 2);
      for (let j = 0; j < terms.length; j++) {
        if (j === 0) {
          qb.addTerm(terms[j]);
        } else {
          qb.addTerm(terms[j], "AND");
        }
      }

      const results = await this.searcher.search(qb);
      return results as unknown;
    });

    this.scheduler.onComplete((task) => {
      this.emit("task:complete", `Task ${task.id} finished: ${task.status}`, {
        taskId: task.id,
        status: task.status,
      });
    });

    // Enqueue and run all tasks
    for (const task of tasks) {
      this.scheduler.enqueue(task);
    }

    const completedTasks = await this.scheduler.runAll();

    // Collect and deduplicate results
    const allResults: SearchResult[] = [];
    for (const task of completedTasks) {
      if (task.status === "completed" && Array.isArray(task.result)) {
        allResults.push(...(task.result as SearchResult[]));
      }
    }

    const deduplicated = this.searcher.deduplicate(allResults);

    this.emit(
      "search:complete",
      `Found ${deduplicated.length} unique results`,
      { count: deduplicated.length }
    );

    return deduplicated;
  }

  /**
   * Extract: parse search results into structured Paper objects.
   * Uses the PaperExtractor to pull out titles, authors, abstracts, etc.
   */
  async extract(results: SearchResult[]): Promise<Paper[]> {
    this.emit(
      "extract:start",
      `Extracting data from ${results.length} results`
    );

    const papers: Paper[] = [];

    for (const result of results) {
      try {
        // Build a synthetic content block from the search result metadata
        // since we don't actually fetch URLs in this simulated environment
        const contentParts: string[] = [];
        contentParts.push(result.title);

        if (result.metadata.authors?.length) {
          contentParts.push(
            `Authors: ${result.metadata.authors.join(", ")}`
          );
        }
        if (result.metadata.publishedDate) {
          contentParts.push(`Date: ${result.metadata.publishedDate}`);
        }
        contentParts.push("");
        contentParts.push("Abstract");
        contentParts.push(result.snippet);

        const rawContent = contentParts.join("\n");
        const paper = this.extractor.extract(result.url, rawContent);

        // Supplement with search result metadata when extraction misses data
        if (
          paper.authors.length === 0 &&
          result.metadata.authors?.length
        ) {
          paper.authors.push(...result.metadata.authors);
        }
        if (!paper.year && result.metadata.publishedDate) {
          const yearMatch =
            result.metadata.publishedDate.match(/\b(20\d{2}|19\d{2})\b/);
          if (yearMatch) {
            (paper as { year: number | null }).year = parseInt(
              yearMatch[1],
              10
            );
          }
        }

        papers.push(paper);
      } catch {
        // Skip results that fail extraction
        this.emit("error", `Extraction failed for ${result.url}`, {
          url: result.url,
        });
      }
    }

    this.emit("extract:complete", `Extracted ${papers.length} papers`, {
      count: papers.length,
    });

    return papers;
  }

  /**
   * Synthesize: build the knowledge graph from extracted papers.
   * Creates nodes for each paper/concept and edges for relationships.
   * Also generates hypotheses and evaluates evidence.
   */
  async synthesize(papers: Paper[], topic: string): Promise<Finding[]> {
    this.emit(
      "synthesize:start",
      `Synthesizing ${papers.length} papers into knowledge graph`
    );

    // Create a topic node as the central anchor
    const topicNode = new KnowledgeNode({
      id: `topic_${this.sanitizeId(topic)}`,
      label: topic,
      type: "concept",
      content: `Research topic: ${topic}`,
      metadata: { source: "user", confidence: 1.0, timestamp: Date.now() },
      tags: [topic.toLowerCase()],
    });
    this.graph.addNode(topicNode);

    // Create a node for each paper and connect to the topic
    for (const paper of papers) {
      const paperId = `paper_${this.sanitizeId(paper.title)}`;

      const paperNode = new KnowledgeNode({
        id: paperId,
        label: paper.title,
        type: "fact",
        content: paper.abstract || paper.title,
        metadata: {
          source: paper.url || paper.source || "unknown",
          confidence: 0.8,
          timestamp: Date.now(),
          authors: paper.authors,
          year: paper.year,
        },
        tags: paper.keywords.slice(0, 10),
      });
      this.graph.addNode(paperNode);

      // Edge: paper relates_to topic
      try {
        this.graph.addEdge(
          new KnowledgeEdge({
            id: `edge_${paperId}_to_topic`,
            source: paperId,
            target: topicNode.id,
            relation: "relates_to",
            weight: 0.7,
            metadata: {},
          })
        );
      } catch {
        // Edge may fail if nodes overlap; skip silently
      }

      // Cross-reference papers that share keywords
      for (const [existingId, existingNode] of this.graph.nodes) {
        if (
          existingId === paperId ||
          existingId === topicNode.id ||
          existingNode.type !== "fact"
        ) {
          continue;
        }

        const sharedTags = paperNode.tags.filter((t) =>
          existingNode.tags.includes(t)
        );

        if (sharedTags.length >= 2) {
          const edgeId = `edge_${paperId}_${existingId}`;
          if (!this.graph.edges.has(edgeId)) {
            try {
              this.graph.addEdge(
                new KnowledgeEdge({
                  id: edgeId,
                  source: paperId,
                  target: existingId,
                  relation: "relates_to",
                  weight: Math.min(1, sharedTags.length * 0.2),
                  metadata: { sharedTags },
                })
              );
            } catch {
              // Skip invalid edges
            }
          }
        }
      }

      // Create a hypothesis from the paper's abstract
      if (paper.abstract) {
        const hyp = this.hypothesisEvaluator.addHypothesis(
          paper.abstract.slice(0, 200),
          0.5
        );

        // Add the paper itself as supporting evidence
        this.hypothesisEvaluator.addEvidence(
          paper.title,
          "supports",
          hyp.id,
          1.5,
          0.7
        );
      }
    }

    // Generate findings from the assembled graph
    const findings = this.generateFindings(papers, topic);

    this.emit(
      "synthesize:complete",
      `Built graph with ${this.graph.nodeCount} nodes and ${this.graph.edgeCount} edges`,
      {
        nodes: this.graph.nodeCount,
        edges: this.graph.edgeCount,
        findings: findings.length,
      }
    );

    return findings;
  }

  /**
   * Report: generate a formatted research report from findings and citations.
   */
  async report(
    topic: string,
    findings: Finding[],
    citations: CitationPaper[],
    style: "APA" | "MLA" | "Chicago" | "IEEE" = "APA"
  ): Promise<string> {
    this.emit("report:start", `Generating report for: ${topic}`);

    const reportText = this.reporter.generate(topic, findings, citations, style);

    this.emit("report:complete", "Report generation complete", {
      length: reportText.length,
    });

    return reportText;
  }

  // ── Internal helpers ─────────────────────────────────────────────

  /**
   * Evaluate the current refinement state. Returns a score in [0, 1]
   * based on graph coverage, evidence quality, and finding completeness.
   */
  private evaluateState(
    state: RefinementState,
    relevanceThreshold: number
  ): number {
    const { graph, findings, papers, searchResults } = state;

    // Factor 1: Graph density — ratio of edges to a reasonable target
    const nodeCount = graph.nodeCount;
    const edgeCount = graph.edgeCount;
    const maxEdges = nodeCount * (nodeCount - 1);
    const density =
      maxEdges > 0 ? Math.min(1, edgeCount / (maxEdges * 0.1)) : 0;

    // Factor 2: Finding coverage — how many papers contributed to findings
    const findingsCoverage =
      papers.length > 0 ? Math.min(1, findings.length / papers.length) : 0;

    // Factor 3: Evidence quality — average relevance of search results
    const avgRelevance =
      searchResults.length > 0
        ? searchResults.reduce((sum, r) => sum + r.relevanceScore, 0) /
          searchResults.length
        : 0;
    const qualityScore =
      avgRelevance > relevanceThreshold
        ? Math.min(1, avgRelevance)
        : avgRelevance * 0.5;

    // Factor 4: Hypothesis confidence — average confidence across hypotheses
    const hypotheses = this.hypothesisEvaluator.rank();
    const avgConfidence =
      hypotheses.length > 0
        ? hypotheses.reduce((sum, h) => sum + h.confidence, 0) /
          hypotheses.length
        : 0.5;

    // Weighted combination
    return (
      density * 0.2 +
      findingsCoverage * 0.3 +
      qualityScore * 0.3 +
      avgConfidence * 0.2
    );
  }

  /**
   * Refine the current state by strengthening weak nodes,
   * discovering implicit edges, and re-evaluating hypotheses.
   */
  private async refineState(
    state: RefinementState,
    currentScore: number
  ): Promise<RefinementState> {
    const iterationNum = this.feedbackLoop.history.length;
    this.emit("refine:iteration", `Refinement iteration ${iterationNum}`, {
      iteration: iterationNum,
      score: currentScore,
    });

    // Strategy 1: boost confidence for well-connected but weak nodes
    for (const node of state.graph.nodes.values()) {
      if (node.type === "fact" && node.metadata.confidence < 0.6) {
        const neighbors = state.graph.getNeighbors(node.id);
        if (neighbors.length > 0) {
          const boost = Math.min(0.3, neighbors.length * 0.05);
          node.metadata.confidence = Math.min(
            1.0,
            node.metadata.confidence + boost
          );
        }
      }
    }

    // Strategy 2: discover implicit relationships between fact nodes
    const nodeIds = Array.from(state.graph.nodes.keys());
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const nodeA = state.graph.nodes.get(nodeIds[i])!;
        const nodeB = state.graph.nodes.get(nodeIds[j])!;

        if (nodeA.type !== "fact" || nodeB.type !== "fact") continue;

        const edgeId = `edge_${nodeIds[i]}_${nodeIds[j]}`;
        const reverseEdgeId = `edge_${nodeIds[j]}_${nodeIds[i]}`;
        if (
          state.graph.edges.has(edgeId) ||
          state.graph.edges.has(reverseEdgeId)
        ) {
          continue;
        }

        // Check for tag and content overlap
        const tagsA = new Set(nodeA.tags.map((t) => t.toLowerCase()));
        const sharedTags = nodeB.tags.filter((t) =>
          tagsA.has(t.toLowerCase())
        );

        const wordsA = new Set(
          nodeA.content
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 4)
        );
        const sharedWords = nodeB.content
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 4 && wordsA.has(w));

        if (sharedTags.length >= 1 || sharedWords.length >= 3) {
          try {
            state.graph.addEdge(
              new KnowledgeEdge({
                id: edgeId,
                source: nodeIds[i],
                target: nodeIds[j],
                relation: "relates_to",
                weight: Math.min(
                  1,
                  (sharedTags.length + sharedWords.length) * 0.1
                ),
                metadata: {
                  discoveredAt: iterationNum,
                  sharedTags,
                  sharedWordCount: sharedWords.length,
                },
              })
            );
          } catch {
            // Skip invalid edges
          }
        }
      }
    }

    // Strategy 3: re-evaluate all hypotheses with accumulated evidence
    for (const hyp of this.hypothesisEvaluator.hypotheses) {
      this.hypothesisEvaluator.evaluate(hyp.id);
    }

    // Regenerate findings with the improved graph
    const updatedFindings = this.generateFindings(state.papers, state.topic);

    return {
      ...state,
      findings: updatedFindings,
    };
  }

  /**
   * Generate Finding objects from papers and the current knowledge graph.
   * Groups papers by shared keywords to create thematic findings.
   */
  private generateFindings(papers: Paper[], topic: string): Finding[] {
    const findings: Finding[] = [];

    // Group papers by shared keywords
    const keywordGroups = new Map<string, Paper[]>();
    for (const paper of papers) {
      for (const keyword of paper.keywords.slice(0, 5)) {
        const key = keyword.toLowerCase();
        const group = keywordGroups.get(key) ?? [];
        group.push(paper);
        keywordGroups.set(key, group);
      }
    }

    // Create a finding for each significant keyword cluster
    const processedPapers = new Set<string>();
    const sortedGroups = Array.from(keywordGroups.entries()).sort(
      (a, b) => b[1].length - a[1].length
    );

    for (const [keyword, groupPapers] of sortedGroups) {
      if (groupPapers.length < 1) continue;

      // Skip if all papers in this group have already been covered
      const newPapers = groupPapers.filter(
        (p) => !processedPapers.has(p.title)
      );
      if (newPapers.length === 0) continue;

      const summaries = newPapers
        .slice(0, 3)
        .map((p) => p.abstract || p.title)
        .join(" ");

      const significance: "high" | "medium" | "low" =
        newPapers.length >= 3
          ? "high"
          : newPapers.length >= 2
            ? "medium"
            : "low";

      findings.push({
        title: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} in ${topic}`,
        summary: this.truncate(summaries, 300),
        details: newPapers
          .map(
            (p) =>
              `- **${p.title}** (${p.year ?? "n.d."}): ${this.truncate(p.abstract || "No abstract.", 150)}`
          )
          .join("\n"),
        keywords: [
          keyword,
          ...new Set(newPapers.flatMap((p) => p.keywords.slice(0, 3))),
        ].slice(0, 6),
        significance,
      });

      for (const p of newPapers) {
        processedPapers.add(p.title);
      }

      // Cap findings to avoid report bloat
      if (findings.length >= 8) break;
    }

    // Ensure at least one finding exists
    if (findings.length === 0 && papers.length > 0) {
      findings.push({
        title: `Overview of ${topic}`,
        summary: papers
          .slice(0, 3)
          .map((p) => p.title)
          .join("; "),
        keywords: [topic.toLowerCase()],
        significance: "medium",
      });
    }

    return findings;
  }

  /**
   * Convert extracted Paper objects to the citation-formatter Paper type.
   */
  private papersToCitations(papers: Paper[]): CitationPaper[] {
    return papers
      .filter((p) => p.title && p.authors.length > 0)
      .map((p) => ({
        title: p.title,
        authors: p.authors,
        year: p.year ?? 0,
        doi: p.doi,
        url: p.url,
      }));
  }

  /**
   * Create a filesystem-safe ID from arbitrary text.
   */
  private sanitizeId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 60);
  }

  /**
   * Truncate a string to a maximum length, appending "..." if needed.
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
  }
}
