/**
 * Resolves and links citations across papers.
 * Fuzzy matches references to known papers and builds citation graphs.
 */

export interface Reference {
  raw: string;
  title?: string;
  authors?: string[];
  year?: number;
  doi?: string;
  resolved?: boolean;
  resolvedId?: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  abstract: string;
  doi?: string;
  sections: { title: string; content: string }[];
  references: Reference[];
  keywords: string[];
}

export interface CitationLink {
  from: string;  // paper id
  to: string;    // paper id
  context: string; // surrounding text
}

type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'IEEE';

export class CitationResolver {
  private cache: Map<string, Paper> = new Map();
  private resolved: Map<string, string> = new Map(); // raw ref → paper id

  /**
   * Register a known paper for resolution.
   */
  register(paper: Paper): void {
    this.cache.set(paper.id, paper);
  }

  /**
   * Try to resolve a citation reference to a known paper.
   */
  resolve(ref: Reference): Paper | null {
    // Check cache first
    const cached = this.resolved.get(ref.raw);
    if (cached) {
      return this.cache.get(cached) ?? null;
    }

    // Try DOI match (exact)
    if (ref.doi) {
      for (const paper of this.cache.values()) {
        if (paper.doi && paper.doi.toLowerCase() === ref.doi.toLowerCase()) {
          this.resolved.set(ref.raw, paper.id);
          return paper;
        }
      }
    }

    // Try title match (fuzzy)
    if (ref.title) {
      const best = this.findBestTitleMatch(ref.title);
      if (best) {
        this.resolved.set(ref.raw, best.id);
        return best;
      }
    }

    // Try author + year match
    if (ref.authors?.length && ref.year) {
      for (const paper of this.cache.values()) {
        if (paper.year === ref.year && this.authorsOverlap(ref.authors, paper.authors)) {
          this.resolved.set(ref.raw, paper.id);
          return paper;
        }
      }
    }

    return null;
  }

  /**
   * Match a citation to the best matching paper using fuzzy title matching.
   */
  matchCitation(ref: Reference, papers: Paper[]): Paper | null {
    if (!ref.title) return null;

    let bestScore = 0;
    let bestPaper: Paper | null = null;

    for (const paper of papers) {
      const score = this.titleSimilarity(ref.title, paper.title);
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestPaper = paper;
      }
    }

    return bestPaper;
  }

  /**
   * Build a citation graph showing who cites whom.
   */
  buildCitationGraph(papers: Paper[]): CitationLink[] {
    const links: CitationLink[] = [];

    for (const paper of papers) {
      this.register(paper);
    }

    for (const paper of papers) {
      for (const ref of paper.references) {
        const resolved = this.resolve(ref);
        if (resolved && resolved.id !== paper.id) {
          links.push({
            from: paper.id,
            to: resolved.id,
            context: ref.raw,
          });
        }
      }
    }

    return links;
  }

  /**
   * Find references that couldn't be resolved to any known paper.
   */
  findMissingCitations(papers: Paper[]): { paper: Paper; unresolved: Reference[] }[] {
    const results: { paper: Paper; unresolved: Reference[] }[] = [];

    for (const paper of papers) {
      const unresolved = paper.references.filter(ref => !this.resolve(ref));
      if (unresolved.length > 0) {
        results.push({ paper, unresolved });
      }
    }

    return results;
  }

  /**
   * Format a paper citation in the specified style.
   */
  formatCitation(paper: Paper, style: CitationStyle): string {
    const authors = paper.authors;
    const year = paper.year;
    const title = paper.title;

    switch (style) {
      case 'APA':
        return this.formatAPA(authors, year, title);
      case 'MLA':
        return this.formatMLA(authors, year, title);
      case 'Chicago':
        return this.formatChicago(authors, year, title);
      case 'IEEE':
        return this.formatIEEE(authors, year, title);
      default:
        return `${authors.join(', ')} (${year}). ${title}.`;
    }
  }

  /**
   * Get resolution statistics.
   */
  stats(): { total: number; resolved: number; rate: number } {
    const total = this.resolved.size;
    const resolved = [...this.resolved.values()].filter(id => this.cache.has(id)).length;
    return { total, resolved, rate: total > 0 ? resolved / total : 0 };
  }

  // ── Private ──────────────────────────────────────────

  private findBestTitleMatch(title: string): Paper | null {
    let best = 0;
    let result: Paper | null = null;

    for (const paper of this.cache.values()) {
      const sim = this.titleSimilarity(title, paper.title);
      if (sim > best && sim > 0.7) {
        best = sim;
        result = paper;
      }
    }

    return result;
  }

  private titleSimilarity(a: string, b: string): number {
    const wordsA = this.tokenize(a);
    const wordsB = this.tokenize(b);
    if (wordsA.length === 0 || wordsB.length === 0) return 0;

    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    const intersection = [...setA].filter(w => setB.has(w)).length;
    const union = new Set([...setA, ...setB]).size;

    return union > 0 ? intersection / union : 0;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  private authorsOverlap(a: string[], b: string[]): boolean {
    const normalizeAuthor = (name: string) => name.toLowerCase().split(/\s+/).pop() ?? '';
    const lastNamesA = new Set(a.map(normalizeAuthor));
    const lastNamesB = new Set(b.map(normalizeAuthor));
    return [...lastNamesA].some(n => lastNamesB.has(n));
  }

  private formatAPA(authors: string[], year: number, title: string): string {
    const authStr = authors.length <= 2
      ? authors.join(' & ')
      : `${authors[0]} et al.`;
    return `${authStr} (${year}). ${title}.`;
  }

  private formatMLA(authors: string[], year: number, title: string): string {
    const first = authors[0] ?? 'Unknown';
    const parts = first.split(/\s+/);
    const lastName = parts.pop() ?? '';
    const rest = parts.join(' ');
    const authStr = authors.length === 1
      ? `${lastName}, ${rest}`
      : `${lastName}, ${rest}, et al.`;
    return `${authStr} "${title}." ${year}.`;
  }

  private formatChicago(authors: string[], year: number, title: string): string {
    const authStr = authors.join(', ');
    return `${authStr}. "${title}." ${year}.`;
  }

  private formatIEEE(authors: string[], year: number, title: string): string {
    const initials = authors.map(a => {
      const parts = a.split(/\s+/);
      const last = parts.pop() ?? '';
      const inits = parts.map(p => p[0] + '.').join(' ');
      return `${inits} ${last}`;
    });
    return `${initials.join(', ')}, "${title}," ${year}.`;
  }
}
