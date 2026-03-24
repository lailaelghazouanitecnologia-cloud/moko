import { Loader } from './loader';

export interface AssetStats {
  cacheSize: number;
  hits: number;
  misses: number;
}

/**
 * Manages registration, caching and loading of assets through pluggable loaders.
 * Provides hit/miss statistics and supports concurrent request deduplication.
 */
export class AssetRegistry {
  private loaders: Map<string, Loader> = new Map();
  private cache: Map<string, any> = new Map();
  private inFlight: Map<string, Promise<any>> = new Map();
  private hits: number = 0;
  private misses: number =  0;

  /**
   * Register a loader for a given asset type.
   * @param type - Unique identifier for the asset type (e.g. 'texture', 'json').
   * @param loader - Loader instance capable of loading this asset type.
   * @throws {TypeError} If type is not a non-empty string or loader is not an object with a `load` method.
   */
  register(type: string, loader: Loader): void {
    if (typeof type !== 'string' || type.trim().length === 0) {
      throw new TypeError('type must be a non-empty string');
  }
    if (!loader || typeof loader.load !== 'function') {
      throw new TypeError('loader must be an object with a load method');
    }
    this.loaders.set(type, loader);
  }

  /**
   * Load an asset from the given URL, optionally hinting the expected type.
   * If the asset is already cached or currently being loaded, the existing
   * promise or value is returned (deduplication).
   * @param url - URL of the asset to load.
   * @param type - Optional type hint to select the appropriate loader.
   * @returns A promise that resolves to the loaded asset.
   * @throws {Error} If no loader can be determined for the requested asset.
   * @throws {TypeError} If url is not a non-empty string.
   */
  async load(url: string, type?: string): Promise<any> {
    if (typeof url !== 'string' || url.trim().length === 0) {
      throw new TypeError('url must be a non-empty string');
    }

    if (this.cache.has(url)) {
      this.hits++;
      return this.cache.get(url);
    }

    if (this.inFlight.has(url)) {
      this.hits++;
      return this.inFlight.get(url);
    }

    this.misses++;

    const loader = this.resolveLoader(type);
    if (!loader) {
      throw new Error(`No loader found for type: ${type ?? '<auto>'}`);
    }

    const promise = loader
      .load(url)
      .then((asset: any) => {
        this.cache.set(url, asset);
        this.inFlight.delete(url);
        return asset;
      })
      .catch((error: any) => {
        this.inFlight.delete(url);
        throw error;
      });

    this.inFlight.set(url, promise);
    return promise;
  }

  /**
   * Preload multiple assets in parallel.
   * @param urls - Array of URLs to load.
   * @returns A promise that resolves when all assets have been loaded.
   * @throws {TypeError} If urls is not an array or contains invalid entries.
   */
  async preload(urls: string[]): Promise<void> {
    if (!Array.isArray(urls)) {
      throw new TypeType('urls must be an array');
    }
    if (urls.some(u => typeof u !== 'string' || u.trim().length === 0)) {
      throw new TypeError('each url must be a non-empty string');
    }
    const promises = urls.map(url => this.load(url));
    await Promise.all(promises);
  }

  /**
   * Retrieve a cached asset, if present.
   * @param url - URL of the asset to retrieve.
   * @returns The cached asset, or `undefined` if not cached.
   * @throws {TypeError} If url is not a non-empty string.
   */
  get(url: string): any {
    if (typeof url !== 'string' || url.trim().length === 0) {
      throw new TypeError('url must be a non-empty string');
    }
    return this.cache.get(url);
  }

  /**
   * Check whether an asset is currently cached.
   * @param url - URL of the asset to check.
   * @returns `true` if the asset is in the cache, `false` otherwise.
   * @throws {TypeError} If url is not a non-empty string.
   */
  has(url: string): boolean {
    if (typeof url !== 'string' || url.trim().length === 0) {
      throw new TypeError('url must be a non-empty string');
    }
    return this.cache.has(url);
  }

  /**
   * Remove an asset from the cache (but not from in-flight loading).
   * @param url - URL of the asset to unload.
   * `true` if the asset was in the cache and removed, `false` otherwise.
   * @throws {TypeError} If url is not a non-empty string.
   */
  unload(url: string): boolean {
    if (typeof url !== 'string' || url.trim().length === 0) {
      throw new TypeError('url must be a non-empty string');
    }
    return this.cache.delete(url);
  }

  /**
   * Clear the cache and cancel any in-flight loading promises.
   * Statistics (hits/misses) are not reset.
   */
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  /**
   * Obtain statistics about cache usage.
   * @returns Object containing cache size, hit count and miss count.
   */
  getStats(): AssetStats {
    return {
      cacheSize: this.cache.size,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * Resolve the loader to use for a given optional type.
   * @private
   * @param type - Optional type hint.
   * @returns The loader instance, or `undefined` if none found.
   */
  private resolveLoader(type?: string): Loader | undefined {
    if (type !== undefined) {
      return this.loaders.get(type);
    }
    // Fallback to first registered loader if no type specified
    const entries = this.loaders.entries();
    const first = entries.next();
    return first.value ? first.value[1] : undefined;
  }
}
