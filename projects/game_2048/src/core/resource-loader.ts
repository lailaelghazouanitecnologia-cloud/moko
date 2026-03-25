/**
 * ResourceLoader
 * Loads and caches external assets with support for JSON, text, and binary data.
 */
export class ResourceLoader {
    private cache: Map<string, any> = new Map();
    private pending: Map<string, Promise<any>> = new Map();
    private baseUrl: string = '';

    /**
     * Fetches and caches a resource.
     * @param url Resource path (relative to baseUrl).
     * @returns Promise resolving to the resource data.
     * @throws {TypeError} If url is not a non-empty string.
     * @throws {Error} If fetch fails or network returns non-ok status.
     */
    public load(url: string): Promise<any> {
        if (!this.validateUrl(url)) {
            return Promise.reject(new TypeError('url must be a non-empty string'));
        }

        const fullUrl = this.buildFullUrl(url);

        if (this.cache.has(fullUrl)) {
            return Promise.resolve(this.cache.get(fullUrl));
        }

        if (this.pending.has(fullUrl)) {
            return this.pending.get(fullUrl)!;
        }

        const promise = this.fetchResource(fullUrl);

        this.pending.set(fullUrl, promise);
        return promise;
    }

    /**
     * Pre-loads multiple resources in parallel.
     * @param urls Array of resource paths (relative to baseUrl).
     * @returns Promise that resolves when all resources are loaded.
     * @throws {TypeError} If urls is not an array or contains invalid entries.
     */
    public preload(urls: string[]): Promise<void> {
        if (!Array.isArray(urls)) {
            return Promise.reject(new TypeError('urls must be an array'));
        }

        if (urls.some(u => !this.validateUrl(u))) {
            return Promise.reject(new TypeError('all urls must be non-empty strings'));
        }

        const promises = urls.map(url => this.load(url));
        return Promise.all(promises).then(() => {});
    }

    /**
     * Retrieves a cached resource (synchronous).
     * @param url Resource path (relative to baseUrl).
     * @returns The cached resource, or undefined if not cached.
     * @throws {TypeError} If url is not a non-empty string.
     */
    public get(url: string): any {
        if (!this.validateUrl(url)) {
            throw new TypeError('url must be a non-empty string');
        }

        const fullUrl = this.buildFullUrl(url);
        return this.cache.get(fullUrl);
    }

    /**
     * Removes a resource from the cache.
     * @param url Resource path (relative to baseUrl).
     * @returns true if the resource existed and was removed, false otherwise.
     * @throws {TypeError} If url is not a non-empty string.
     */
    public evict(url: string): boolean {
        if (!this.validateUrl(url)) {
            throw new TypeError('url must be a non-string');
        }

        const fullUrl = this.buildFullUrl(url);
        return this.cache.delete(fullUrl);
    }

    /**
     * Clears all cached and pending resources.
     */
    public clear(): void {
        this.cache.clear();
        this.pending.clear();
    }

    /**
     * Sets the base URL prepended to all subsequent requests.
     * @param base Base URL string.
     * @throws {TypeError} If base is not a string.
     */
    public setBaseUrl(base: string): void {
        if (typeof base !== 'string') {
            throw new TypeError('base must be a string');
        }
        this.baseUrl = base;
    }

    /* ------------------------------------------------------------------ */
    /* Private helpers                                                    */
    /* ------------------------------------------------------------------ */

    /**
     * Validates that a url is a non-empty string.
     */
    private validateUrl(url: any): boolean {
        return typeof url === 'string' && url.length > 0;
    }

    /**
     * Builds the full URL by combining baseUrl and the provided path.
     */
    private buildFullUrl(url: string): string {
        const base = this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/';
        const path = url.startsWith('/') ? url.slice(1) : url;
        return base + path;
    }

    /**
     * Performs the actual fetch, handles content-type parsing and caching.
     */
    private fetchResource(fullUrl: string): Promise<any> {
        return fetch(fullUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load resource: ${fullUrl} (${response.status})`);
                }
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    return response.json();
                }
                if (contentType.includes('text/')) {
                    return response.text();
                }
                return response.blob();
            })
            .then(data => {
                this.cache.set(fullUrl, data);
                this.pending.delete(fullUrl);
                return data;
            })
            .catch(error => {
                this.pending.delete(fullUrl);
                throw error;
            });
    }
}
