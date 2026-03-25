/**
 * ResourceLoader.ts
 *
 * Loads and caches remote resources (JSON, text, ArrayBuffer, Blob).
 * Singleton-safe: multiple concurrent requests for the same URL
 * are coalesced into a single network operation.
 *
 * @module core/resource-loader
 */

export class ResourceLoader {
  private cache: Map<string, any> = new Map();
  private pending: Map<string, Promise<any>> = new Map();
  private baseUrl: string = '';

  constructor(baseUrl?: string) {
    if (baseUrl !== undefined) {
      this.setBaseUrl(baseUrl);
    }
  }

  /**
   * Fetch a resource.  The result is cached indefinitely.
   *
   * @param url  Relative or absolute URL.
   * @param type  Expected response type: 'json' | 'text' | 'arrayBuffer' | 'blob'.
   *                Defaults to 'arrayBuffer'.
   * @returns Promise that resolves to the decoded resource.
   * @throws {TypeError} If url is not a non-empty string.
   * @throws {Error} If the network request fails or the server returns an error.
   */
  public load(url: string, type?: string): Promise<any> {
    if (typeof url !== 'string' || url.trim().length === 0) {
      return Promise.reject(new TypeError('url must be a non-empty string'));
    }

    const fullUrl = this.buildFullUrl(url);
    if (this.cache.has(fullUrl)) {
      return Promise.resolve(this.cache.get(fullUrl));
    }
    if (this.pending.has(fullUrl)) {
      return this.pending.get(fullUrl)!;
    }

    const promise = this.fetchResource(fullUrl, type);
    this.pending.set(fullUrl, promise);
    return promise
      .then(data => {
        this.cache.set(fullUrl, data);
        this.pending.delete(fullUrl);
        return data;
      })
      .catch(err => {
        this.pending.delete(fullUrl);
        throw err;
      });
  }

  /**
   * Pre-load multiple resources in parallel.
   *
   * @param urls  Array of URLs to load.
   * @param type  Response type (same as `load`).
   * @returns Promise that resolves to an array of decoded resources, in the same order.
   * @throws {TypeError} If urls is not an array or contains invalid entries.
   */
  public preload(urls: string[], type?: string): Promise<any[]> {
    if (!Array.isArray(urls)) {
      return Promise.reject(new TypeError('urls must be an array'));
    }
    if (urls.some(u => typeof u !== 'string' || u.trim().length === 0)) {
      return Promise.reject(new TypeError('each url must be a non-empty string'));
    }
    return Promise.all(urls.map(url => this.load(url, type)));
  }

  /**
   * Synchronously retrieve a cached resource.
   *
   * @param url  Relative or absolute URL.
   * @returns The cached value, or `undefined` if not yet loaded.
   * @throws {TypeError} If url is not a non-empty string.
   */
  public get(url: string): any {
    if (typeof url !== 'string' || url.trim().length === 0) {
      throw new TypeError('url must be a non-empty string');
    }
    const fullUrl = this.buildFullUrl(url);
    return this.cache.get(fullUrl);
  }

  /**
   * Clear all cached and pending resources.
   */
  public clear(): void {
    this.cache.clear();
    this.pending.clear();
  }

  /**
   * Update the base URL used for relative paths.
   *
   * @param url  New base URL.  Must be a valid absolute URL or empty string.
   * @throws {TypeError} If url is not a string.
   */
  public setBaseUrl(url: string): void {
    if (typeof url !== 'string') {
      throw new TypeError('baseUrl must be a string');
    }
    this.baseUrl = url.endsWith('/') ? url : url + '/';
  }

  /**
   * Build an absolute URL from a possibly-relative input.
   *
   * @param url  Input URL.
   * @returns Absolute URL.
   */
  private buildFullUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return url;
    }
    const separator = this.baseUrl.endsWith('/') || url.startsWith('/') ? '' : '/';
    return this.baseUrl + separator + url;
  }

  /**
   * Perform the actual network fetch and decode the response.
   *
   * @param url  Absolute URL.
   * @param type  Response type.
   * @returns Promise that resolves to the decoded data.
   * @throws {Error} If the network request fails or the server returns an error.
   */
  private fetchResource(url: string, type?: string): Promise<any> {
    return fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load resource: ${url} (${response.status})`);
        }
        switch (type) {
          case 'json':
            return response.json();
          case 'text':
            return response.text();
          case 'arrayBuffer':
            return response.arrayBuffer();
          case 'blob':
            return response.blob();
          default:
            return response.arrayBuffer();
        }
      });
  }
}
