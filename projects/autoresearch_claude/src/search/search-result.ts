export type SearchSource = "google" | "arxiv" | "semantic-scholar";

export interface SearchResultMetadata {
  authors?: string[];
  publishedDate?: string;
  citationCount?: number;
  doi?: string;
  arxivId?: string;
  journal?: string;
  abstract?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface SearchResultJSON {
  url: string;
  title: string;
  snippet: string;
  source: SearchSource;
  relevanceScore: number;
  timestamp: string;
  metadata: SearchResultMetadata;
}

export class SearchResult {
  public readonly url: string;
  public readonly title: string;
  public readonly snippet: string;
  public readonly source: SearchSource;
  public readonly relevanceScore: number;
  public readonly timestamp: Date;
  public readonly metadata: SearchResultMetadata;

  constructor(params: {
    url: string;
    title: string;
    snippet: string;
    source: SearchSource;
    relevanceScore: number;
    timestamp?: Date;
    metadata?: SearchResultMetadata;
  }) {
    this.url = params.url;
    this.title = params.title;
    this.snippet = params.snippet;
    this.source = params.source;
    this.relevanceScore = Math.max(0, Math.min(1, params.relevanceScore));
    this.timestamp = params.timestamp ?? new Date();
    this.metadata = params.metadata ?? {};
  }

  /**
   * Checks whether this result matches any of the given keywords.
   * Matching is case-insensitive and searches across the title, snippet,
   * and metadata abstract. Returns true if every keyword appears in at
   * least one of those fields.
   */
  matches(keywords: string[]): boolean {
    if (keywords.length === 0) return true;

    const searchableText = [
      this.title,
      this.snippet,
      this.metadata.abstract ?? "",
      ...(this.metadata.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return keywords.every((kw) => searchableText.includes(kw.toLowerCase()));
  }

  /**
   * Serializes this result to a plain JSON-compatible object.
   */
  toJSON(): SearchResultJSON {
    return {
      url: this.url,
      title: this.title,
      snippet: this.snippet,
      source: this.source,
      relevanceScore: this.relevanceScore,
      timestamp: this.timestamp.toISOString(),
      metadata: { ...this.metadata },
    };
  }

  /**
   * Reconstructs a SearchResult from its JSON representation.
   */
  static fromJSON(json: SearchResultJSON): SearchResult {
    return new SearchResult({
      url: json.url,
      title: json.title,
      snippet: json.snippet,
      source: json.source,
      relevanceScore: json.relevanceScore,
      timestamp: new Date(json.timestamp),
      metadata: json.metadata,
    });
  }

  /**
   * Returns a unique fingerprint for deduplication purposes,
   * based on the URL normalized to lowercase without trailing slashes.
   */
  fingerprint(): string {
    return this.url.toLowerCase().replace(/\/+$/, "");
  }
}
