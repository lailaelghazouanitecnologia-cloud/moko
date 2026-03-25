export interface AssetLoader {
    load(url: string): Promise<any>;
    canLoad(url: string): boolean;
}

export class AssetRegistry {
    private cache: Map<string, any>;
    private loaders: Map<string, AssetLoader>;
    private pending: Map<string, Promise<any>>;

    constructor() {
        this.cache = new Map<string, any>();
        this.loaders = new Map<string, AssetLoader>();
        this.pending = new Map<string, Promise<any>>();
    }

    /**
     * Register a loader for a specific asset type.
     * @param type - The asset type identifier (e.g., 'image', 'json').
     * @param loader - The loader instance capable of loading this type.
     * @throws {TypeError} If type is not a non-empty string or loader is invalid.
     */
    registerLoader(type: string, loader: AssetLoader): void {
        if (typeof type !== 'string' || type.trim().length === 0) {
            throw new TypeError('Type must be a non-empty string');
        }
        if (!loader || typeof loader.load !== 'function' || typeof loader.canLoad !== 'function') {
            throw new TypeError('Loader must implement AssetLoader interface');
        }
        this.loaders.set(type, loader);
    }

    /**
     * Load an asset from the given URL.
     * @param url - The URL of the asset to load.
     * @param type - Optional type hint to select a specific loader.
     * @returns A promise that resolves to the loaded asset.
     * @throws {Error} If no suitable loader is found or loading fails.
     */
    async load(url: string, type?: string): Promise<any> {
        if (typeof url !== 'string' || url.trim().length === 0) {
            throw new TypeError('URL must be a non-empty string');
        }

        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        if (this.pending.has(url)) {
            return this.pending.get(url);
        }

        const loader = type ? this.loaders.get(type) : Array.from(this.loaders.values()).find(l => l.canLoad(url));
        if (!loader) {
            throw new Error(`No loader found for ${url}`);
        }

        const promise = loader.load(url).then(asset => {
            this.cache.set(url, asset);
            this.pending.delete(url);
            return asset;
        }).catch(err => {
            this.pending.delete(url);
            throw err;
        });

        this.pending.set(url, promise);
        return promise;
    }

    /**
     * Retrieve a cached asset by URL.
     * @param url - The URL of the cached asset.
     * @returns The cached asset, or undefined if not found.
     * @throws {TypeError} If url is not a non-empty string.
     */
    get(url: string): any {
        if (typeof url !== 'string' || url.trim().length === 0) {
            throw new TypeError('URL must be a non-empty string');
        }
        return this.cache.get(url);
    }

    /**
     * Preload multiple assets in parallel.
     * @param urls - Array of URLs to preload.
     * @returns A promise that resolves when all assets are loaded.
     * @throws {TypeError} If urls is not an array or contains invalid entries.
     */
    async preload(urls: string[]): Promise<void> {
        if (!Array.isArray(urls)) {
            throw new TypeError('URLs must be an array');
        }
        if (urls.some(url => typeof url !== 'string' || url.trim().length === 0)) {
            throw new TypeError('All URLs must be non-empty strings');
        }
        const promises = urls.map(url => this.load(url));
        await Promise.all(promises);
    }

    /**
     * Remove an asset from the cache.
     * @param url - The URL of the asset to unload.
     * @throws {TypeError} If url is not a non-empty string.
     */
    unload(url: string): void {
        if (typeof url !== 'string' || url.trim().length === 0) {
            throw new TypeError('URL must be a non-empty string');
        }
        this.cache.delete(url);
    }

    /**
     * Clear all caches and pending loads.
     */
    clear(): void {
        this.cache.clear();
        this.pending.clear();
    }
}
