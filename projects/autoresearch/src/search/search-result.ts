/**
 * Represents a single search result item
 */
export class SearchResult {
    private title: string;
    private url: string;
    private snippet: string;
    private source: string;
    private relevanceScore: number;
    private metadata: Record<string, unknown>;

    constructor(
        title: string = '',
        url: string = '',
        snippet: string = '',
        source: string = '',
        relevanceScore: number = 0,
        metadata: Record<string, unknown> = {}
    ) {
        this.title = title;
        this.url = url;
        this.snippet = snippet;
        this.source = source;
        this.relevanceScore = relevanceScore;
        this.metadata = metadata;
    }

    /**
     * Get result title
     * @returns The title of the search result
     */
    getTitle(): string {
        return this.title;
    }

    /**
     * Get result url
     * @returns The URL of the search result
     */
    getUrl(): string {
        return this.url;
    }

    /**
     * Get result snippet
     * * @returns The snippet of the search result
     */
    getSnippet(): string {
        return this.snippet;
    }

    /**
     * Get result source
     * @returns The source of the search result
     */
    getSource(): string {
        return this.source;
    }

    /**
     * Get relevance score
     * @returns The relevance score of the search result
     */
    getRelevanceScore(): number {
        return this.relevanceScore;
    }

    /**
     * Get metadata object
     * @returns The metadata associated with the search result
     */
    getMetadata(): Record<string, unknown> {
        return this.metadata;
    }

    /**
     * Set result title
     * @param title - The new title for the search result
     * @throws {TypeError} If title is not a string
     */
    setTitle(title: string): void {
        if (typeof title !== 'string') {
            throw new TypeError('Title must be a string');
        }
        this.title = title;
    }

    /**
     * Set result url
     * @param url - The new URL for the search result
     * @throws {TypeError} If url is not a string
     */
    setUrl(url: string): void {
        if (typeof url !== 'string') {
            throw new TypeError('URL must be a string');
        }
        this.url = url;
    }

    /**
     * Set result snippet
     * @param snippet - The new snippet for the search result
     * @throws {TypeError} If snippet is not a string
     */
    setSnippet(snippet: string): void {
        if (typeof snippet !== 'string') {
            throw new TypeError('Snippet must be a string');
        }
        this.snippet = snippet;
    }

    /**
     * Set result source
     * @param source - The new source for the search result
     * @throws {TypeError} If source is not a string
     */
    setSource(source: string): void {
        if (typeof source !== 'string') {
            throw new TypeError('Source must be a string');
        }
        this.source = source;
    }

    /**
     * Set the relevance score
     * @param score - The new relevance score
     * @throws {TypeError} If score is not a number
     * @throws {RangeError} If score is not finite or is negative
     */
    setRelevanceScore(score: number): void {
        if (typeof score !== 'number') {
            throw new TypeError('Relevance score must be a number');
        }
        if (!isFinite(score) || score < 0) {
            throw new RangeError('Relevance score must be a non-negative finite number');
        }
        this.relevanceScore = score;
    }

    /**
     * Set or merge metadata
     * @param metadata - The new metadata object or partial object to merge
     * @param merge - Whether to merge with existing metadata (default: true)
     * @throws {TypeError} If metadata is not an object
     */
    setMetadata(metadata: Record<string, unknown>, merge: boolean = true): void {
        if (typeof metadata !== 'object' || metadata === null) {
            throw new TypeError('Metadata must be an object');
        }
        this.metadata = merge ? { ...this.metadata, ...metadata } : { ...metadata };
    }

    /**
     * Get a copy of this SearchResult instance
     * @returns A new SearchResult with identical data
     */
    clone(): SearchResult {
        return new SearchResult(
            this.title,
            this.url,
            this.snippet,
            this.source,
            this.relevanceScore,
            JSON.parse(JSON.stringify(this.metadata))
        );
    }

    /**
     * Convert the search result to a plain object
     * @returns Plain object representation
     */
    toJSON(): Record<string, unknown> {
        return {
            title: this.title,
            url: this.url,
            snippet: this.snippet,
            source: this.source,
            relevanceScore: this.relevanceScore,
            metadata: this.metadata
        };
    }

    /**
     * Create a SearchResult from a plain object
     * @param obj - The plain object to convert
     * @returns A new SearchResult instance
     * @throws {TypeError} If required fields are missing or invalid
     */
    static fromJSON(obj: Record<string, unknown>): SearchResult {
        if (typeof obj.title !== 'string') {
            throw new TypeError('title is required and must be a string');
        }
        if (typeof obj.url !== 'string') {
            throw new TypeError('url is required and must be a string');
        }
        if (typeof obj.snippet !== 'string') {
            throw new TypeError('snippet is required and must be a string');
        }
        if (typeof obj.source !== 'string') {
            throw new TypeError('source is required and must be a string');
        }
        if (typeof obj.relevanceScore !== 'number') {
            throw new TypeError('relevanceScore is required and must be a number');
        }
        if (typeof obj.metadata !== 'object' || obj.metadata === null) {
            throw new TypeError('metadata is required and must be an object');
        }
        return new SearchResult(
            obj.title,
            obj.url,
            obj.snippet,
            obj.source,
            obj.relevanceScore,
            obj.metadata as Record<string, unknown>
        );
    }
}
