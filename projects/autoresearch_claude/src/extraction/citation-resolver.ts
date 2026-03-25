/**
 * CitationResolver - Resolves and links citations across papers.
 * Provides fuzzy matching, citation graph construction, gap detection,
 * and multi-style citation formatting (APA, MLA, Chicago).
 */

import { Paper, Reference } from "./paper-extractor";

export interface ResolvedCitation {
  reference: Reference;
  resolvedPaper: Paper | null;
  confidence: number;
  matchMethod: "exact-doi" | "title" | "author-year" | "fuzzy" | "unresolved";
}

export interface CitationEdge {
  from: string;
  to: string;
  reference: Reference;
}

export interface CitationGraph {
  nodes: string[];
  edges: CitationEdge[];
  adjacency: Map<string, string[]>;
}

export type CitationStyle = "apa" | "mla" | "chicago";

export class CitationResolver {
  /** Cache of raw reference string -> resolved result */
  readonly cache: Map<string, ResolvedCitation>;

  /** Map of normalized paper title -> Paper for lookup */
  readonly resolved: Map<string, Paper>;

  constructor() {
    this.cache = new Map();
    this.resolved = new Map();
  }

  /**
   * Register known papers so they can be resolved against.
   */
  addPapers(papers: Paper[]): void {
    for (const paper of papers) {
      const key = this.normalizeTitle(paper.title);
      if (key) {
        this.resolved.set(key, paper);
      }
    }
  }

  /**
   * Attempt to resolve a single reference to a known paper.
   * Tries DOI match first, then title, then author+year, then fuzzy.
   */
  resolve(ref: Reference): ResolvedCitation {
    const cacheKey = ref.raw || `${ref.title}|${ref.authors.join(",")}|${ref.year}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    let result: ResolvedCitation;

    // 1. Exact DOI match
    if (ref.doi) {
      for (const paper of this.resolved.values()) {
        if (paper.doi && paper.doi.toLowerCase() === ref.doi.toLowerCase()) {
          result = {
            reference: ref,
            resolvedPaper: paper,
            confidence: 1.0,
            matchMethod: "exact-doi",
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }
    }

    // 2. Exact title match
    const normalizedRefTitle = this.normalizeTitle(ref.title);
    if (normalizedRefTitle) {
      const directMatch = this.resolved.get(normalizedRefTitle);
      if (directMatch) {
        result = {
          reference: ref,
          resolvedPaper: directMatch,
          confidence: 0.95,
          matchMethod: "title",
        };
        this.cache.set(cacheKey, result);
        return result;
      }
    }

    // 3. Author + year match
    if (ref.authors.length > 0 && ref.year) {
      for (const paper of this.resolved.values()) {
        if (paper.year === ref.year && this.authorsOverlap(ref.authors, paper.authors)) {
          result = {
            reference: ref,
            resolvedPaper: paper,
            confidence: 0.85,
            matchMethod: "author-year",
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }
    }

    // 4. Fuzzy title match using bigram similarity (Dice coefficient)
    if (normalizedRefTitle) {
      let bestMatch: Paper | null = null;
      let bestScore = 0;

      for (const [key, paper] of this.resolved) {
        const score = this.bigramSimilarity(normalizedRefTitle, key);
        if (score > bestScore && score >= 0.6) {
          bestScore = score;
          bestMatch = paper;
        }
      }

      if (bestMatch) {
        result = {
          reference: ref,
          resolvedPaper: bestMatch,
          confidence: bestScore * 0.8,
          matchMethod: "fuzzy",
        };
        this.cache.set(cacheKey, result);
        return result;
      }
    }

    // Unresolved
    result = {
      reference: ref,
      resolvedPaper: null,
      confidence: 0,
      matchMethod: "unresolved",
    };
    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Match a reference against a list of papers using combined fuzzy scoring
   * on title, authors, and year. Returns the best match above threshold.
   */
  matchCitation(
    ref: Reference,
    papers: Paper[]
  ): { paper: Paper; confidence: number } | null {
    let bestPaper: Paper | null = null;
    let bestConfidence = 0;

    for (const paper of papers) {
      let confidence = 0;

      // DOI match is definitive
      if (ref.doi && paper.doi && ref.doi.toLowerCase() === paper.doi.toLowerCase()) {
        return { paper, confidence: 1.0 };
      }

      // Title similarity via bigram Dice coefficient
      const titleSim = this.bigramSimilarity(
        this.normalizeTitle(ref.title),
        this.normalizeTitle(paper.title)
      );
      confidence = titleSim * 0.9;

      // Author overlap boost
      if (ref.authors.length > 0 && paper.authors.length > 0) {
        const authorSim = this.authorOverlapRatio(ref.authors, paper.authors);
        if (authorSim > 0.3) {
          confidence += authorSim * 0.2;
        }
      }

      // Year match boost
      if (ref.year && paper.year && ref.year === paper.year) {
        confidence += 0.1;
      }

      confidence = Math.min(confidence, 1.0);

      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestPaper = paper;
      }
    }

    if (bestPaper && bestConfidence >= 0.5) {
      return { paper: bestPaper, confidence: bestConfidence };
    }

    return null;
  }

  /**
   * Build a citation graph from a collection of papers.
   * Returns nodes (paper titles), edges (who-cites-whom), and an adjacency map.
   */
  buildCitationGraph(papers: Paper[]): CitationGraph {
    this.addPapers(papers);

    const nodeSet = new Set<string>();
    const edges: CitationEdge[] = [];
    const adjacency = new Map<string, string[]>();

    for (const paper of papers) {
      const fromTitle = paper.title;
      nodeSet.add(fromTitle);

      if (!adjacency.has(fromTitle)) {
        adjacency.set(fromTitle, []);
      }

      for (const ref of paper.references) {
        const resolved = this.resolve(ref);
        if (resolved.resolvedPaper) {
          const toTitle = resolved.resolvedPaper.title;
          nodeSet.add(toTitle);

          edges.push({
            from: fromTitle,
            to: toTitle,
            reference: ref,
          });

          adjacency.get(fromTitle)!.push(toTitle);

          if (!adjacency.has(toTitle)) {
            adjacency.set(toTitle, []);
          }
        }
      }
    }

    return {
      nodes: Array.from(nodeSet),
      edges,
      adjacency,
    };
  }

  /**
   * Find all references across the paper collection that could not be
   * resolved to any known paper.
   */
  findMissingCitations(papers: Paper[]): Reference[] {
    this.addPapers(papers);

    const missing: Reference[] = [];

    for (const paper of papers) {
      for (const ref of paper.references) {
        const resolved = this.resolve(ref);
        if (resolved.matchMethod === "unresolved") {
          missing.push(ref);
        }
      }
    }

    return missing;
  }

  /**
   * Format a paper as a citation string in the specified style.
   * Supports APA (7th), MLA (9th), and Chicago styles.
   */
  formatCitation(paper: Paper, style: CitationStyle): string {
    switch (style) {
      case "apa":
        return this.formatAPA(paper);
      case "mla":
        return this.formatMLA(paper);
      case "chicago":
        return this.formatChicago(paper);
      default:
        return this.formatAPA(paper);
    }
  }

  /**
   * Get resolution statistics.
   */
  stats(): { total: number; resolved: number; rate: number } {
    let total = 0;
    let resolvedCount = 0;
    for (const entry of this.cache.values()) {
      total++;
      if (entry.matchMethod !== "unresolved") resolvedCount++;
    }
    return { total, resolved: resolvedCount, rate: total > 0 ? resolvedCount / total : 0 };
  }

  // ── Formatting ──────────────────────────────────────────

  private formatAPA(paper: Paper): string {
    const authors = this.formatAPAAuthors(paper.authors);
    const year = paper.year ? ` (${paper.year})` : " (n.d.)";
    const doi = paper.doi ? ` https://doi.org/${paper.doi}` : "";
    return `${authors}${year}. ${paper.title}.${doi}`;
  }

  private formatAPAAuthors(authors: string[]): string {
    if (authors.length === 0) return "Unknown";
    if (authors.length === 1) return this.lastNameFirst(authors[0]);
    if (authors.length === 2) {
      return `${this.lastNameFirst(authors[0])} & ${this.lastNameFirst(authors[1])}`;
    }
    const formatted = authors
      .slice(0, -1)
      .map((a) => this.lastNameFirst(a))
      .join(", ");
    return `${formatted}, & ${this.lastNameFirst(authors[authors.length - 1])}`;
  }

  private formatMLA(paper: Paper): string {
    const authors = this.formatMLAAuthors(paper.authors);
    const year = paper.year ? ` ${paper.year}.` : "";
    return `${authors} "${paper.title}."${year}`;
  }

  private formatMLAAuthors(authors: string[]): string {
    if (authors.length === 0) return "Unknown.";
    if (authors.length === 1) return `${this.lastNameFirst(authors[0])}.`;
    if (authors.length === 2) {
      return `${this.lastNameFirst(authors[0])}, and ${authors[1]}.`;
    }
    return `${this.lastNameFirst(authors[0])}, et al.`;
  }

  private formatChicago(paper: Paper): string {
    const authors = this.formatChicagoAuthors(paper.authors);
    const year = paper.year ? ` ${paper.year}.` : "";
    const doi = paper.doi ? ` https://doi.org/${paper.doi}.` : "";
    return `${authors} "${paper.title}."${year}${doi}`;
  }

  private formatChicagoAuthors(authors: string[]): string {
    if (authors.length === 0) return "Unknown.";
    if (authors.length === 1) return `${this.lastNameFirst(authors[0])}.`;
    if (authors.length <= 3) {
      const parts = authors.map((a, i) =>
        i === 0 ? this.lastNameFirst(a) : a
      );
      const last = parts.pop();
      return `${parts.join(", ")}, and ${last}.`;
    }
    return `${this.lastNameFirst(authors[0])}, et al.`;
  }

  private lastNameFirst(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name;
    const lastName = parts[parts.length - 1];
    const rest = parts.slice(0, -1).map((p) => {
      if (p.length > 2 && !p.endsWith(".")) {
        return `${p[0]}.`;
      }
      return p;
    });
    return `${lastName}, ${rest.join(" ")}`;
  }

  // ── Fuzzy matching helpers ──────────────────────────────

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Compute similarity between two strings using bigram overlap (Dice coefficient).
   */
  private bigramSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a === b) return 1.0;

    const bigramsA = this.bigrams(a);
    const bigramsB = this.bigrams(b);

    if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

    let intersection = 0;
    for (const bg of bigramsA) {
      if (bigramsB.has(bg)) intersection++;
    }

    return (2 * intersection) / (bigramsA.size + bigramsB.size);
  }

  private bigrams(str: string): Set<string> {
    const result = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      result.add(str.substring(i, i + 2));
    }
    return result;
  }

  private authorsOverlap(refAuthors: string[], paperAuthors: string[]): boolean {
    const refLastNames = new Set(
      refAuthors.map((a) => this.getLastName(a).toLowerCase())
    );
    for (const author of paperAuthors) {
      if (refLastNames.has(this.getLastName(author).toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private authorOverlapRatio(authorsA: string[], authorsB: string[]): number {
    const setA = new Set(authorsA.map((a) => this.getLastName(a).toLowerCase()));
    const setB = new Set(authorsB.map((a) => this.getLastName(a).toLowerCase()));

    let overlap = 0;
    for (const name of setA) {
      if (setB.has(name)) overlap++;
    }

    const maxSize = Math.max(setA.size, setB.size);
    return maxSize > 0 ? overlap / maxSize : 0;
  }

  private getLastName(name: string): string {
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1] || name;
  }
}
