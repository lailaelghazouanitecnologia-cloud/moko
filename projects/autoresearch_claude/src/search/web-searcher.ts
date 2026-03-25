import { SearchResult, SearchSource, SearchResultMetadata } from "./search-result";
import { QueryBuilder } from "./query-builder";

// ---- Rate limiter ----

interface RateLimiterConfig {
  maxRequests: number;   // max requests allowed in the window
  windowMs: number;      // window duration in milliseconds
}

class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
  }

  /**
   * Waits until the rate limit window has capacity, then records the request.
   */
  async acquire(): Promise<void> {
    const now = Date.now();
    // Prune timestamps outside the current window
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldest) + 10; // small buffer
      await this.sleep(waitMs);
      // Re-prune after sleeping
      const after = Date.now();
      this.timestamps = this.timestamps.filter((t) => after - t < this.windowMs);
    }

    this.timestamps.push(Date.now());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---- Cache entry ----

interface CacheEntry {
  results: SearchResult[];
  cachedAt: number;
}

// ---- Simulated corpus used to generate realistic results ----

interface CorpusEntry {
  title: string;
  snippet: string;
  url: string;
  source: SearchSource;
  metadata: SearchResultMetadata;
}

const SIMULATED_CORPUS: CorpusEntry[] = [
  {
    title: "Attention Is All You Need",
    snippet:
      "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
    url: "https://arxiv.org/abs/1706.03762",
    source: "arxiv",
    metadata: {
      authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar"],
      publishedDate: "2017-06-12",
      citationCount: 95000,
      arxivId: "1706.03762",
      tags: ["transformer", "attention", "neural network", "deep learning"],
    },
  },
  {
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    snippet:
      "We introduce BERT, a new language representation model designed to pre-train deep bidirectional representations from unlabeled text.",
    url: "https://arxiv.org/abs/1810.04805",
    source: "arxiv",
    metadata: {
      authors: ["Jacob Devlin", "Ming-Wei Chang"],
      publishedDate: "2018-10-11",
      citationCount: 72000,
      arxivId: "1810.04805",
      tags: ["bert", "nlp", "language model", "transformer", "pre-training"],
    },
  },
  {
    title: "Language Models are Few-Shot Learners",
    snippet:
      "We demonstrate that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes reaching competitiveness with state-of-the-art fine-tuned systems.",
    url: "https://arxiv.org/abs/2005.14165",
    source: "arxiv",
    metadata: {
      authors: ["Tom Brown", "Benjamin Mann", "Nick Ryder"],
      publishedDate: "2020-05-28",
      citationCount: 28000,
      arxivId: "2005.14165",
      tags: ["gpt-3", "language model", "few-shot", "scaling", "deep learning"],
    },
  },
  {
    title: "Deep Residual Learning for Image Recognition",
    snippet:
      "We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.",
    url: "https://arxiv.org/abs/1512.03385",
    source: "arxiv",
    metadata: {
      authors: ["Kaiming He", "Xiangyu Zhang"],
      publishedDate: "2015-12-10",
      citationCount: 150000,
      arxivId: "1512.03385",
      tags: ["resnet", "image recognition", "deep learning", "computer vision"],
    },
  },
  {
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    snippet:
      "We combine pre-trained parametric and non-parametric memory for language generation. RAG models retrieve documents and use them to generate answers.",
    url: "https://arxiv.org/abs/2005.11401",
    source: "arxiv",
    metadata: {
      authors: ["Patrick Lewis", "Ethan Perez"],
      publishedDate: "2020-05-22",
      citationCount: 4500,
      arxivId: "2005.11401",
      tags: ["rag", "retrieval", "generation", "nlp", "knowledge"],
    },
  },
  {
    title: "A Survey of Large Language Models",
    snippet:
      "This survey provides a comprehensive review of the recent advances of large language models (LLMs), covering pre-training, adaptation tuning, utilization, and evaluation.",
    url: "https://semanticscholar.org/paper/a-survey-of-llms",
    source: "semantic-scholar",
    metadata: {
      authors: ["Wayne Xin Zhao", "Kun Zhou"],
      publishedDate: "2023-03-31",
      citationCount: 3200,
      tags: ["survey", "large language model", "llm", "deep learning"],
    },
  },
  {
    title: "Reinforcement Learning from Human Feedback: A Survey",
    snippet:
      "We survey recent methods for aligning language models with human preferences through reinforcement learning from human feedback (RLHF).",
    url: "https://semanticscholar.org/paper/rlhf-survey",
    source: "semantic-scholar",
    metadata: {
      authors: ["Tian Lan", "Lei Wang"],
      publishedDate: "2023-08-15",
      citationCount: 850,
      tags: ["rlhf", "reinforcement learning", "alignment", "human feedback"],
    },
  },
  {
    title: "Google Research Blog: Advances in Neural Information Retrieval",
    snippet:
      "An overview of recent developments in neural information retrieval, including dense passage retrieval and learned sparse representations.",
    url: "https://research.google/blog/advances-in-neural-ir",
    source: "google",
    metadata: {
      publishedDate: "2024-01-10",
      tags: ["information retrieval", "neural", "search", "google"],
    },
  },
  {
    title: "Introduction to Vector Databases for AI Applications",
    snippet:
      "Vector databases enable efficient similarity search over high-dimensional embeddings, powering modern AI applications from recommendation to RAG pipelines.",
    url: "https://example.com/vector-databases-ai",
    source: "google",
    metadata: {
      publishedDate: "2024-03-05",
      tags: ["vector database", "embeddings", "similarity search", "ai"],
    },
  },
  {
    title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
    snippet:
      "We show that generating a chain of thought — a series of intermediate reasoning steps — significantly improves the ability of large language models to perform complex reasoning.",
    url: "https://arxiv.org/abs/2201.11903",
    source: "arxiv",
    metadata: {
      authors: ["Jason Wei", "Xuezhi Wang"],
      publishedDate: "2022-01-28",
      citationCount: 6000,
      arxivId: "2201.11903",
      tags: ["chain of thought", "reasoning", "prompting", "language model"],
    },
  },
];

// ---- WebSearcher ----

export interface WebSearcherOptions {
  /** Max requests per rate-limit window. Default: 5 */
  rateLimitMax?: number;
  /** Rate-limit window in ms. Default: 10_000 (10 s) */
  rateLimitWindowMs?: number;
  /** Cache TTL in ms. Default: 300_000 (5 min) */
  cacheTtlMs?: number;
}

export class WebSearcher {
  private rateLimiter: RateLimiter;
  private cache: Map<string, CacheEntry> = new Map();
  private results: SearchResult[] = [];
  private cacheTtlMs: number;

  constructor(options: WebSearcherOptions = {}) {
    this.rateLimiter = new RateLimiter({
      maxRequests: options.rateLimitMax ?? 5,
      windowMs: options.rateLimitWindowMs ?? 10_000,
    });
    this.cacheTtlMs = options.cacheTtlMs ?? 300_000;
  }

  /**
   * Searches across all sources using the provided query (string or QueryBuilder).
   * Results are scored, cached, and returned sorted by relevance.
   */
  async search(query: string | QueryBuilder): Promise<SearchResult[]> {
    const queryStr = typeof query === "string" ? query : query.build();
    const cacheKey = `all:${queryStr}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    const results = this.simulateSearch(queryStr, undefined);
    this.storeInCache(cacheKey, results);
    this.results.push(...results);
    return results;
  }

  /**
   * Searches specifically on arXiv. If a QueryBuilder is passed its arXiv
   * query format is used.
   */
  async searchArxiv(query: string | QueryBuilder): Promise<SearchResult[]> {
    const queryStr =
      typeof query === "string" ? query : query.toArxivQuery();
    const cacheKey = `arxiv:${queryStr}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    const results = this.simulateSearch(queryStr, "arxiv");
    this.storeInCache(cacheKey, results);
    this.results.push(...results);
    return results;
  }

  /**
   * Searches Semantic Scholar.
   */
  async searchScholar(query: string | QueryBuilder): Promise<SearchResult[]> {
    const queryStr = typeof query === "string" ? query : query.build();
    const cacheKey = `scholar:${queryStr}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    const results = this.simulateSearch(queryStr, "semantic-scholar");
    this.storeInCache(cacheKey, results);
    this.results.push(...results);
    return results;
  }

  /**
   * Runs multiple queries concurrently (respecting rate limits) and returns
   * the combined, deduplicated results sorted by relevance.
   */
  async batchSearch(queries: (string | QueryBuilder)[]): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];

    // Run sequentially to respect rate limiting
    for (const q of queries) {
      const results = await this.search(q);
      allResults.push(...results);
    }

    return this.deduplicate(allResults);
  }

  /**
   * Removes duplicate results based on URL fingerprinting.
   * When duplicates are found, the one with the higher relevance score is kept.
   */
  deduplicate(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>();

    for (const result of results) {
      const fp = result.fingerprint();
      const existing = seen.get(fp);
      if (!existing || result.relevanceScore > existing.relevanceScore) {
        seen.set(fp, result);
      }
    }

    return Array.from(seen.values()).sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );
  }

  /**
   * Returns all results accumulated across searches in this session.
   */
  getAllResults(): SearchResult[] {
    return [...this.results];
  }

  /**
   * Clears the result cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Returns current cache size.
   */
  get cacheSize(): number {
    return this.cache.size;
  }

  // ---- Private helpers ----

  private getFromCache(key: string): SearchResult[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.cachedAt > this.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.results;
  }

  private storeInCache(key: string, results: SearchResult[]): void {
    this.cache.set(key, { results, cachedAt: Date.now() });
  }

  /**
   * Simulated search implementation. Matches query terms against the
   * built-in corpus and scores results based on term frequency and
   * metadata quality signals.
   */
  private simulateSearch(
    query: string,
    sourceFilter?: SearchSource
  ): SearchResult[] {
    // Extract meaningful terms from the query, ignoring operators and field prefixes
    const terms = this.extractTerms(query);

    if (terms.length === 0) return [];

    const scored: { entry: CorpusEntry; score: number }[] = [];

    for (const entry of SIMULATED_CORPUS) {
      // Apply source filter
      if (sourceFilter && entry.source !== sourceFilter) continue;

      const score = this.scoreEntry(entry, terms);
      if (score > 0) {
        scored.push({ entry, score });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map(
      ({ entry, score }) =>
        new SearchResult({
          url: entry.url,
          title: entry.title,
          snippet: entry.snippet,
          source: entry.source,
          relevanceScore: Math.min(1, score),
          timestamp: new Date(),
          metadata: entry.metadata,
        })
    );
  }

  /**
   * Extracts plain search terms from a query string, stripping boolean
   * operators, field prefixes, and special syntax.
   */
  private extractTerms(query: string): string[] {
    return query
      .replace(/\b(AND|OR|NOT|ANDNOT)\b/gi, " ")
      .replace(/\b(all|ti|abs|au|cat|site|lang|lr|after|before|daterange):/gi, " ")
      .replace(/["\[\](){}]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .split(" ")
      .filter((t) => t.length > 1 && !t.startsWith("-"));
  }

  /**
   * Scores a corpus entry against the search terms. Takes into account:
   * - Term matches in title (weighted higher)
   * - Term matches in snippet
   * - Term matches in tags
   * - Citation count as a quality signal
   */
  private scoreEntry(entry: CorpusEntry, terms: string[]): number {
    const titleLower = entry.title.toLowerCase();
    const snippetLower = entry.snippet.toLowerCase();
    const tagsLower = (entry.metadata.tags ?? []).join(" ").toLowerCase();

    let score = 0;
    let matchedTerms = 0;

    for (const term of terms) {
      let termScore = 0;

      if (titleLower.includes(term)) {
        termScore += 0.35;
      }
      if (snippetLower.includes(term)) {
        termScore += 0.2;
      }
      if (tagsLower.includes(term)) {
        termScore += 0.25;
      }

      if (termScore > 0) {
        matchedTerms++;
        score += termScore;
      }
    }

    // No matches at all: score stays 0
    if (matchedTerms === 0) return 0;

    // Coverage bonus: reward matching more of the query terms
    const coverage = matchedTerms / terms.length;
    score *= 0.5 + 0.5 * coverage;

    // Citation quality signal (logarithmic scale)
    const citations = entry.metadata.citationCount ?? 0;
    if (citations > 0) {
      score += Math.log10(citations) / 50;
    }

    // Normalize to 0-1 range
    return Math.min(1, score);
  }
}
