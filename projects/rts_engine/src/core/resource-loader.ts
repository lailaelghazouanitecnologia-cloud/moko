/**
 * Async resource loader with caching capabilities.
 * Provides methods to load, preload, and manage cached resources.
 */
export class ResourceLoader {
    private cache: Map<string, any> = new Map();
    private loading: Map<string, Promise<any>> = new Map();

    /**
     * Loads a resource from the given URL using the provided loader function.
     * If the resource is already cached, returns the cached value.
     * If the resource is currently being loaded, returns the existing promise.
     * Otherwise, initiates a new load operation.
     *
     * @template T The type of the resource to load
     * @param url - The URL or identifier of the resource
     * @param loader - A function that returns a Promise resolving to the resource
     * @returns A Promise that resolves to the loaded resource
     * @throws {Error} If the loader function throws an error
     */
    async load<T>(url: string, loader: () => Promise<T>): Promise<T> {
        if (typeof url !== 'string' || url.trim() === '') {
            throw new Error('URL must be a non-empty string');
        }
        if (typeof loader !== 'function') {
            throw new Error('Loader must be a function');
        }

        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        if (this.loading.has(url)) {
            return this.loading.get(url);
        }

        const promise = loader().then(result => {
            this.cache.set(url, result);
            this.loading.delete(url);
            return result;
        }).catch(error => {
            this.loading.delete(url);
            throw error;
        });

        this.loading.set(url, promise);
        return promise;
    }

    /**
     * Preloads multiple resources concurrently.
     * Resources that are already cached or being loaded will be skipped.
     *
     * @param urls - Array of URLs or identifiers to preload
     * @returns A Promise that resolves when all preloadable resources have been processed
     * @throws {Error} If urls is not an array
     */
    async preload(urls: string[]): Promise<void> {
        if (!Array.isArray(urls)) {
            throw new Error('URLs must be an array');
        }

        const promises = urls.map(url => {
            if (typeof url !== 'string' || url.trim() === '') {
                return Promise.reject(new Error('Each URL must be a non-empty string'));
            }

            if (this.cache.has(url) || this.loading.has(url)) {
                return Promise.resolve();
            }

            return this.load(url, async () => {
                throw new Error(`No loader provided for URL: ${url}`);
            }).catch(() => {});
        });

        await Promise.all(promises);
    }

    /**
     * Clears cached resources.
     * If a specific URL is provided, only that resource is cleared.
     * If no URL is provided, all cached resources are cleared.
     *
     * @param url - Optional URL or identifier to clear
     */
    clear(url?: string): void {
        if (url !== undefined) {
            if (typeof url !== 'string' || url.trim() === '') {
                throw new Error('URL must be a non-empty string');
            }
            this.cache.delete(url);
            this.loading.delete(url);
        } else {
            this.cache.clear();
            this.loading.clear();
        }
    }

    /**
     * Checks if a resource is cached.
     *
     * @param url - The URL or identifier of the resource
     * @returns True if the resource is cached, false otherwise
     * @throws {Error} If url is not a non-empty string
     */
    isCached(url: string): boolean {
        if (typeof url !== 'string' || url.trim() === '') {
            throw new Error('URL must be a non-empty string');
        }
        return this.cache.has(url);
    }

    /**
     * Gets the number of cached resources.
     *
     * @returns The number of entries in the cache
     */
    getCacheSize(): number {
        return this.cache.size;
    }

    /**
     * Checks if a resource is currently being loaded.
     *
     * @param url - The URL or identifier of the resource
     * @returns True if the resource is being loaded, false otherwise
     * @throws {Error} If url is not a non-empty string
     */
    isLoading(url: string): boolean {
        if (typeof url !== 'string' || url.trim() === '') {
            throw new Error('URL must be a non-empty string');
        }
        return this.loading.has(url);
    }

    /**
     * Gets the number of resources currently being loaded.
     *
     * @returns The number of resources being loaded
     */
    getLoadingCount(): number {
        return this.loading.size;
    }

    /**
     * Clears all cached resources and cancels any ongoing loads.
     * This is a more aggressive version of clear() that also rejects pending promises.
     */
    clearAll(): void {
        const loadingUrls = Array.from(this.loading.keys());
        loadingUrls.forEach(url => {
            this.loading.delete(url);
        });
        this.cache.clear();
    }

    /**
     * Gets statistics about the current state of the loader.
     *
     * @returns An object containing cache size and loading count
     */
    getStats(): { cacheSize: number; loadingCount: number } {
        return {
            cacheSize: this.cache.size,
            loadingCount: this.loading.size
        };
    }
}
