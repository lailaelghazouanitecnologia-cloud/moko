export type BooleanOperator = "AND" | "OR" | "NOT";

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface QueryFilters {
  dateRange?: DateRange;
  source?: string;
  language?: string;
  maxResults?: number;
  sortBy?: "relevance" | "date" | "citations";
}

interface QueryTerm {
  value: string;
  operator: BooleanOperator;
  field?: string; // optional field restriction, e.g. "title", "abstract"
}

export class QueryBuilder {
  private terms: QueryTerm[] = [];
  private filters: QueryFilters = {};
  private excludedTerms: string[] = [];

  /**
   * Adds a search term joined to previous terms with the given operator.
   * The first term's operator is ignored when building the query string.
   */
  addTerm(term: string, operator: BooleanOperator = "AND", field?: string): this {
    if (term.trim().length === 0) return this;
    this.terms.push({ value: term.trim(), operator, field });
    return this;
  }

  /**
   * Convenience: adds a term with OR semantics.
   */
  or(term: string, field?: string): this {
    return this.addTerm(term, "OR", field);
  }

  /**
   * Adds a filter constraint (date range, source, language, etc.).
   */
  addFilter<K extends keyof QueryFilters>(key: K, value: QueryFilters[K]): this {
    this.filters[key] = value;
    return this;
  }

  /**
   * Excludes a term from search results (NOT operator).
   */
  exclude(term: string): this {
    if (term.trim().length > 0) {
      this.excludedTerms.push(term.trim());
    }
    return this;
  }

  /**
   * Resets the builder to its initial state.
   */
  reset(): this {
    this.terms = [];
    this.filters = {};
    this.excludedTerms = [];
    return this;
  }

  /**
   * Returns the current filters for external inspection.
   */
  getFilters(): Readonly<QueryFilters> {
    return { ...this.filters };
  }

  // ---- private helpers ----

  private quoteIfNeeded(term: string): string {
    return term.includes(" ") ? `"${term}"` : term;
  }

  private buildCoreParts(): { positives: string; negatives: string } {
    const parts: string[] = [];
    for (let i = 0; i < this.terms.length; i++) {
      const t = this.terms[i];
      const quoted = this.quoteIfNeeded(t.value);
      if (i === 0) {
        parts.push(quoted);
      } else {
        parts.push(`${t.operator} ${quoted}`);
      }
    }
    const positives = parts.join(" ");

    const negatives = this.excludedTerms
      .map((t) => `-${this.quoteIfNeeded(t)}`)
      .join(" ");

    return { positives, negatives };
  }

  // ---- public build methods ----

  /**
   * Builds a generic query string suitable for most search engines.
   */
  build(): string {
    const { positives, negatives } = this.buildCoreParts();
    const segments: string[] = [];

    if (positives) segments.push(positives);
    if (negatives) segments.push(negatives);

    if (this.filters.language) {
      segments.push(`lang:${this.filters.language}`);
    }
    if (this.filters.dateRange?.from) {
      segments.push(`after:${this.formatDate(this.filters.dateRange.from)}`);
    }
    if (this.filters.dateRange?.to) {
      segments.push(`before:${this.formatDate(this.filters.dateRange.to)}`);
    }

    return segments.join(" ");
  }

  /**
   * Builds a query string formatted for the arXiv search API.
   * Uses arXiv field prefixes: ti (title), abs (abstract), au (author), all.
   */
  toArxivQuery(): string {
    const parts: string[] = [];

    for (let i = 0; i < this.terms.length; i++) {
      const t = this.terms[i];
      const fieldPrefix = this.mapArxivField(t.field);
      const termStr = `${fieldPrefix}${this.quoteIfNeeded(t.value)}`;

      if (i === 0) {
        parts.push(termStr);
      } else {
        const op = t.operator === "NOT" ? "ANDNOT" : t.operator;
        parts.push(`${op} ${termStr}`);
      }
    }

    for (const excl of this.excludedTerms) {
      parts.push(`ANDNOT all:${this.quoteIfNeeded(excl)}`);
    }

    let query = parts.join(" ");

    // arXiv date filtering uses submittedDate range
    if (this.filters.dateRange?.from || this.filters.dateRange?.to) {
      const from = this.filters.dateRange.from
        ? this.formatDateCompact(this.filters.dateRange.from)
        : "000001010000";
      const to = this.filters.dateRange.to
        ? this.formatDateCompact(this.filters.dateRange.to)
        : "999912312359";
      query += ` AND submittedDate:[${from} TO ${to}]`;
    }

    return query;
  }

  /**
   * Builds a query string formatted for Google Search / Google Scholar.
   * Applies Google-specific operators like site:, filetype:, daterange.
   */
  toGoogleQuery(): string {
    const { positives, negatives } = this.buildCoreParts();
    const segments: string[] = [];

    if (positives) segments.push(positives);
    if (negatives) segments.push(negatives);

    if (this.filters.source) {
      segments.push(`site:${this.filters.source}`);
    }
    if (this.filters.language) {
      segments.push(`lr=lang_${this.filters.language}`);
    }
    if (this.filters.dateRange?.from || this.filters.dateRange?.to) {
      const from = this.filters.dateRange.from
        ? this.formatDate(this.filters.dateRange.from)
        : "";
      const to = this.filters.dateRange.to
        ? this.formatDate(this.filters.dateRange.to)
        : "";
      segments.push(`daterange:${from}..${to}`);
    }

    return segments.join(" ");
  }

  // ---- date helpers ----

  private formatDate(d: Date): string {
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  private formatDateCompact(d: Date): string {
    const iso = d.toISOString();
    return iso.replace(/[-T:]/g, "").slice(0, 12); // YYYYMMDDHHmm
  }

  private mapArxivField(field?: string): string {
    if (!field) return "all:";
    const mapping: Record<string, string> = {
      title: "ti:",
      abstract: "abs:",
      author: "au:",
      all: "all:",
      category: "cat:",
    };
    return mapping[field] ?? "all:";
  }
}
