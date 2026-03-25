/**
 * Constructs and refines search queries.
 */
export class QueryBuilder {
    private query: string = '';
    private filters: Map<string, string> = new Map();
    private maxResults: number = 10;
    private sortOrder: string = 'relevance';

    /**
     * Sets the base query string.
     * @param q The query string to search for.
     * @returns This QueryBuilder instance for chaining.
     * @throws {TypeError} If q is not a string.
     */
    setQuery(q: string): QueryBuilder {
        if (typeof q !== 'string') {
            throw new TypeError('Query must be a string');
        }
        this.query = q.trim();
        return this;
    }

    /**
     * Adds a filter to the query.
     * @param key The filter key.
     * @param value The filter value.
     * @returns This QueryBuilder instance for chaining.
     * @throws {TypeError} If key or value is not a string.
     * @throws {Error} If key or value is empty after trimming.
     */
    addFilter(key: string, value: string): QueryBuilder {
        if (typeof key !== 'string' || typeof value !== 'string') {
            throw new TypeError('Filter key and value must be strings');
        }
        const trimmedKey = key.trim();
        const trimmedValue = value.trim();
        if (!trimmedKey || !trimmedValue) {
            throw new Error('Filter key and value cannot be empty');
        }
        this.filters.set(trimmedKey, trimmedValue);
        return this;
    }

    /**
     * Sets the maximum number of results to return.
     * @param limit The maximum number of results.
     * @returns This QueryBuilder instance for chaining.
     * @throws {TypeError} If limit is not a number.
     * @throws {RangeError} If limit is not a positive integer.
     */
    setMaxResults(limit: number): QueryBuilder {
        if (typeof limit !== 'number' || !Number.isInteger(limit)) {
            throw new TypeError('maxResults must be an integer');
        }
        if (limit <= 0) {
            throw new RangeError('maxResults must be a positive integer');
        }
        this.maxResults = limit;
        return this;
    }

    /**
     * Sets the sort order for the results.
     * @param order The sort order (e.g., 'relevance', 'date', 'title').
     * @returns This QueryBuilder instance for chaining.
     * @throws {TypeError} If order is not a string.
     * @throws {Error} If order is empty after trimming.
     */
    setSortOrder(order: string): QueryBuilder {
        if (typeof order !== 'string') {
            throw new TypeError('Sort order must be a string');
        }
        const trimmedOrder = order.trim();
        if (!trimmedOrder) {
            throw new Error('Sort order cannot be empty');
        }
        this.sortOrder = trimmedOrder;
        return this;
    }

    /**
     * Compiles the final query string.
     * @returns The compiled query string.
     */
    build(): string {
        let result = this.query;
        
        if (this.filters.size > 0) {
            const filterParts: string[] = [];
            for (const [key, value] of this.filters) {
                filterParts.push(`${key}:${value}`);
            }
            result += ' ' + filterParts.join(' ');
        }
        
        result += ` maxResults:${this.maxResults}`;
        result += ` sort:${this.sortOrder}`;
        
        return result.trim();
    }

    /**
     * Clears all query parts and resets to default state.
     * @returns This QueryBuilder instance for chaining.
     */
    reset(): QueryBuilder {
        this.query = '';
        this.filters.clear();
        this.maxResults = 10;
        this.sortOrder = 'relevance';
        return this;
    }

    /**
     * Creates a deep clone of this QueryBuilder instance.
     * @returns A new QueryBuilder instance with the same state.
     */
    clone(): QueryBuilder {
        const cloned = new QueryBuilder();
        cloned.query = this.query;
        cloned.filters = new Map(this.filters);
        cloned.maxResults = this.maxResults;
        cloned.sortOrder = this.sortOrder;
        return cloned;
    }

    /**
     * Serializes the current state to a JSON-compatible object.
     * @returns An object representing the state of this QueryBuilder.
     */
    toJSON(): object {
        return {
            query: this.query,
            filters: Object.fromEntries(this.filters),
            maxResults: this.maxResults,
            sortOrder: this.sortOrder
        };
    }

    /**
     * Creates a QueryBuilder from a JSON object.
     * @param json The JSON object to deserialize.
     * @returns A new QueryBuilder instance.
     * @throws {TypeError} If json is not a valid object.
     */
    static fromJSON(json: any): QueryBuilder {
        if (typeof json !== 'object' || json === null) {
            throw new TypeError('Invalid JSON object');
        }
        const builder = new QueryBuilder();
        if (typeof json.query === 'string') {
            builder.query = json.query;
        }
        if (typeof json.filters === 'object' && json.filters !== null) {
            builder.filters = new Map(Object.entries(json.filters));
        }
        if (typeof json.maxResults === 'number') {
            builder.maxResults = json.maxResults;
        }
        if (typeof json.sortOrder === 'string') {
            builder.sortOrder = json.sortOrder;
        }
        return builder;
    }

    /**
     * Gets the current query string.
     * @returns The current query string.
     */
    getQuery(): string {
        return this.query;
    }

    /**
     * Gets the current filters.
     * @returns A read-only map of filters.
     */
    getFilters(): ReadonlyMap<string, string> {
        return new Map(this.filters);
    }

    /**
     * Gets the maximum number of results.
     * @returns The maxResults value.
     */
    getMaxResults(): number {
        return this.maxResults;
    }

    /**
     * Gets the current sort order.
     * @returns The sortOrder value.
     */
    getSortOrder(): string {
        return this.sortOrder;
    }

    /**
     * Removes a filter by key.
     * @param key The filter key to remove.
     * @returns This QueryBuilder instance for chaining.
     * @throws {TypeError} If key is not a string.
     */
    removeFilter(key: string): QueryBuilder {
        if (typeof key !== 'string') {
            throw new TypeError('Filter key must be a string');
        }
        this.filters.delete(key.trim());
        return this;
    }

    /**
     * Clears all filters.
     * @returns This QueryBuilder instance for chaining.
     */
    clearFilters(): QueryBuilder {
        this.filters.clear();
        return this;
    }

    /**
     * Checks if this QueryBuilder is empty.
     * @returns True if no query and no filters are set.
     */
    isEmpty(): boolean {
        return !this.query && this.filters.size === 0;
    }

    /**
     * Validates the current state of the QueryBuilder.
     * @returns True if the state is valid.
     */
    isValid(): boolean {
        return (
            typeof this.query === 'string' &&
            typeof this.maxResults === 'number' &&
            Number.isInteger(this.maxResults) &&
            this.maxResults > 0 &&
            typeof this.sortOrder === 'string' &&
            this.sortOrder.trim().length > 0
        );
    }
}
