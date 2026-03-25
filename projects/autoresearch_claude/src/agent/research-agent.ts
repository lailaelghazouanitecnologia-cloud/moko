/**
 * ResearchAgent — the main orchestrator that ties all modules together.
 * Plans research, searches, extracts, builds knowledge graph, generates report.
 */

import { KnowledgeGraph, Node } from '../knowledge';
import { WebSearcher, QueryBuilder, SearchResult } from '../search';
import { ResearchPlanner } from '../reasoning/research-planner';
import { HypothesisEvaluator } from '../reasoning/hypothesis-evaluator';
import { EvidenceRanker } from '../reasoning/evidence-ranker';
import { ContentParser } from '../extraction/content-parser';
import { PaperExtractor } from '../extraction/paper-extractor';
import { CitationResolver, Paper } from '../extraction/citation-resolver';
import { ReportGenerator } from '../reporting/report-generator';
import { TaskScheduler, Task } from './task-scheduler';
import { FeedbackLoop } from './feedback-loop';

export interface ResearchOptions {
  maxSearches?: number;
  maxPapers?: number;
  depth?: 'shallow' | 'medium' | 'deep';
  citationStyle?: 'APA' | 'MLA' | 'Chicago' | 'IEEE';
}

export interface ResearchResult {
  topic: string;
  report: string;
  graph: KnowledgeGraph;
  papers: Paper[];
  stats: {
    searches: number;
    papersExtracted: number;
    nodesCreated: number;
    edgesCreated: number;
    iterations: number;
    elapsed: number;
  };
}

type ProgressCallback = (event: string, detail: string) => void;

export class ResearchAgent {
  private searcher: WebSearcher;
  private parser: ContentParser;
  private extractor: PaperExtractor;
  private citationResolver: CitationResolver;
  private planner: ResearchPlanner;
  private hypothesisEvaluator: HypothesisEvaluator;
  private evidenceRanker: EvidenceRanker;
  private reporter: ReportGenerator;
  private scheduler: TaskScheduler;
  private feedbackLoop: FeedbackLoop;
  private graph: KnowledgeGraph;
  private listeners: ProgressCallback[] = [];

  constructor() {
    this.searcher = new WebSearcher();
    this.parser = new ContentParser();
    this.extractor = new PaperExtractor(this.parser);
    this.citationResolver = new CitationResolver();
    this.planner = new ResearchPlanner();
    this.hypothesisEvaluator = new HypothesisEvaluator();
    this.evidenceRanker = new EvidenceRanker();
    this.reporter = new ReportGenerator();
    this.scheduler = new TaskScheduler(3);
    this.feedbackLoop = new FeedbackLoop(5, 0.05);
    this.graph = new KnowledgeGraph();
  }

  /**
   * Subscribe to progress events.
   */
  onProgress(callback: ProgressCallback): void {
    this.listeners.push(callback);
  }

  private emit(event: string, detail: string): void {
    for (const cb of this.listeners) {
      try { cb(event, detail); } catch { /* ignore */ }
    }
  }

  /**
   * Main entry point: research a topic end-to-end.
   */
  async research(topic: string, options: ResearchOptions = {}): Promise<ResearchResult> {
    const start = Date.now();
    const maxSearches = options.maxSearches ?? 10;
    const maxPapers = options.maxPapers ?? 20;
    const citationStyle = options.citationStyle ?? 'APA';

    this.emit('start', `Researching: ${topic}`);

    // Phase 1: Plan
    this.emit('phase', 'Planning research strategy');
    const plan = this.plan(topic, options.depth ?? 'medium');

    // Phase 2: Search
    this.emit('phase', 'Searching for sources');
    const searchResults = await this.search(plan.queries, maxSearches);

    // Phase 3: Extract
    this.emit('phase', `Extracting from ${searchResults.length} results`);
    const papers = this.extract(searchResults, maxPapers);

    // Phase 4: Synthesize
    this.emit('phase', 'Building knowledge graph');
    this.synthesize(papers);

    // Phase 5: Iterate with feedback
    this.emit('phase', 'Refining analysis');
    const iterations = await this.refine(topic, papers);

    // Phase 6: Report
    this.emit('phase', 'Generating report');
    const report = this.report(topic, papers, citationStyle);

    const elapsed = Date.now() - start;
    this.emit('complete', `Done in ${(elapsed / 1000).toFixed(1)}s`);

    return {
      topic,
      report,
      graph: this.graph,
      papers,
      stats: {
        searches: searchResults.length,
        papersExtracted: papers.length,
        nodesCreated: this.graph.nodeCount,
        edgesCreated: this.graph.edgeCount,
        iterations,
        elapsed,
      },
    };
  }

  /**
   * Phase 1: Create research plan with search queries.
   */
  plan(topic: string, depth: string): { queries: string[]; goals: string[] } {
    const plan = this.planner.createPlan(topic, depth === 'deep' ? 3 : depth === 'medium' ? 2 : 1);
    const queries: string[] = [];

    for (const step of plan) {
      if (step.type === 'search') {
        queries.push(step.description);
      }
    }

    // Ensure we have at least the topic itself as a query
    if (queries.length === 0) {
      queries.push(topic);
    }

    return {
      queries,
      goals: plan.map(s => s.description),
    };
  }

  /**
   * Phase 2: Execute searches.
   */
  async search(queries: string[], maxResults: number): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];

    for (const query of queries.slice(0, maxResults)) {
      this.emit('search', `Searching: ${query}`);
      const qb = new QueryBuilder();
      qb.addTerm(query);
      const results = await this.searcher.search(qb.build());
      allResults.push(...results);
    }

    // Deduplicate
    return this.searcher.deduplicate(allResults);
  }

  /**
   * Phase 3: Extract papers from search results.
   */
  extract(results: SearchResult[], maxPapers: number): Paper[] {
    const papers: Paper[] = [];

    for (const result of results.slice(0, maxPapers)) {
      this.emit('extract', `Extracting: ${result.title}`);
      const paper = this.extractor.extract(result.url, result.snippet);
      if (paper) {
        papers.push(paper);
        this.citationResolver.register(paper);
      }
    }

    return papers;
  }

  /**
   * Phase 4: Build knowledge graph from papers.
   */
  synthesize(papers: Paper[]): void {
    for (const paper of papers) {
      // Add paper as a node
      const paperNode = new Node(
        paper.id,
        paper.title,
        'entity',
        paper.abstract,
        { source: 'paper', year: paper.year, authors: paper.authors.join(', ') },
      );
      this.graph.addNode(paperNode);

      // Add keyword nodes and connect
      for (const keyword of paper.keywords) {
        const kwId = `kw:${keyword.toLowerCase()}`;
        let kwNode = this.graph.getNode(kwId);
        if (!kwNode) {
          kwNode = new Node(kwId, keyword, 'concept', keyword);
          this.graph.addNode(kwNode);
        }
        this.graph.addEdge(paper.id, kwId, 'discusses');
      }

      // Build citation links
      for (const ref of paper.references) {
        const resolved = this.citationResolver.resolve(ref);
        if (resolved) {
          this.graph.addEdge(paper.id, resolved.id, 'cites');
        }
      }
    }
  }

  /**
   * Phase 5: Iterative refinement using feedback loop.
   */
  async refine(topic: string, papers: Paper[]): Promise<number> {
    let iteration = 0;

    const result = await this.feedbackLoop.run(
      { score: 0, gaps: [topic] },
      (state) => {
        // Evaluate: how well do we cover the topic?
        const coverage = this.graph.nodeCount / Math.max(papers.length * 3, 1);
        return Math.min(coverage, 1.0);
      },
      (state) => {
        iteration++;
        this.emit('refine', `Iteration ${iteration}`);
        // Identify gaps and add hypotheses
        for (const paper of papers.slice(0, 5)) {
          this.hypothesisEvaluator.addHypothesis(
            `${paper.title} contributes to ${topic}`,
            0.5,
          );
        }
        return { score: state.score, gaps: [] };
      },
    );

    return iteration;
  }

  /**
   * Phase 6: Generate final report.
   */
  report(topic: string, papers: Paper[], style: 'APA' | 'MLA' | 'Chicago' | 'IEEE'): string {
    const findings = papers.map(p => ({
      title: p.title,
      summary: p.abstract,
      evidence: p.keywords,
    }));

    return this.reporter.generate(topic, findings, papers, style);
  }
}
