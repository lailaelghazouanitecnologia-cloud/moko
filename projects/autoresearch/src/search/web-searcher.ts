import { SearchResult } from './search-result';

/**
 * Discovers and fvers papers and web sources.
 */
export class WebSearcher {
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;

  /**
   * Creates an instance of WebSearcher.
   * @param baseUrl - Base URL for search (default: 'https://www.google.com/search')
   * @param timeout - Request timeout in milliseconds (default: 5000)
   */
  constructor(baseUrl: string = 'https://www.google.com/search', timeout: number = 5000) {
    this.validateConstructorParams(baseUrl, timeout);
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0. 4472.124 Safari/537.36'
    };
  }

  /**
   * Execute a web search for the given query.
   * @param query - Search query string
   * @returns Promise resolving to an array of SearchResult objects
   * @throws {Error} If query is invalid or network request fails
   */
  async search(query: string): Promise<SearchResult[]> {
    this.validateQuery(query);
    const url = this.buildQuery(query);
    const html = await this.fetchPage(url);
    return this.parseResults(html);
  }

  /**
   * Fetch raw HTML content from the specified URL.
   * @param url - URL to fetch
   * @returns Promise resolving to HTML string
   * @throws {Error} If request fails or timeout occurs
   */
  async fetchPage(url: string): Promise<string> {
    this.validateUrl(url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Extract search results from HTML content.
   * @param html - HTML string to parse
   * @returns Array of SearchResult objects
   */
  parseResults(html: string): SearchResult[] {
    if (typeof html !== 'string' || html.trim().length === 0) {
      return [];
    }

    const results: SearchResult[] = [];
    const regex = /<div class="[^"]*g[^"]*">.*?<h3[^>]*>(.*?)<\/h3>.*?<a href="([^"]*)"[^>]*>.*?<span[^>]*>(.*?)<\/span>/gs;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const title = this.sanitizeText(match[1]);
      const url = this.sanitizeUrl(match[2]);
      const snippet = this.sanitizeText(match[3]);

      if (title && url) {
        const result = new SearchResult();
        result.setTitle(title);
        result.setUrl(url);
        result.setSnippet(snippet);
        result.setSource(this.baseUrl);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Add or update an HTTP header.
   * @param key - Header name
   * @param value - Header value
   */
  setHeader(key: string, value: string): void {
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new Error('Header key must be a non-empty string');
    }
    if (typeof value !== 'string') {
      throw new Error('Header value must be a string');
    }
    this.headers[key] = value;
  }

  /**
   * Set request timeout in milliseconds.
   * @param ms - Timeout duration in milliseconds
   */
  setTimeout(ms: number): void {
    if (typeof ms !== 'number' || ms <= 0 || !Number.isFinite(ms)) {
      throw new Error('Timeout must be a positive finite number');
    }
    this.timeout = ms;
  }

  /**
   * Build a search URL with query parameters.
   * @param query - Search query string
   * @param options - Additional query parameters
   * @returns Complete search URL
   */
  buildQuery(query: string, options?: Record<string, any>): string {
    this.validateQuery(query);
    const params = new URLSearchParams();
    params.set('q', query);

    if (options && typeof options === 'object') {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      });
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Validate constructor parameters.
   * @param baseUrl - Base URL to validate
   * @param timeout - Timeout value to validate
   */
  private validateConstructorParams(baseUrl: string, timeout: number): void {
    if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
      throw new Error('baseUrl must be a non-empty string');
    }
    if (typeof timeout !== 'number' || timeout <= 0 || !Number.isFinite(timeout)) {
      throw new Error('timeout must be a positive finite number');
    }
  }

  /**
   * Validate search query.
   * @param query - Query to validate
   */
  private validateQuery(query: string): void {
    if (typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }
  }

  /**
   * Validate URL.
   * @param url - URL to validate
   */
  private validateUrl(url: string): void {
    if (typeof url !== 'string' || url.trim().length === 0) {
      throw new Error('URL must be a non-empty string');
    }
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Remove HTML tags and trim text.
   * @param text - Text to sanitize
   * @returns Sanitized text
   */
  private sanitizeText(text: string): string {
    if (typeof text !== 'string') {
      return '';
    }
    return text.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Sanitize and validate URL.
   * @param url - URL to sanitize
   * @returns Sanitized URL or empty string if invalid
   */
  private sanitizeUrl(url: string): string {
    if (typeof url !== 'string') {
      return '';
    }
    const trimmed = url.trim();
    if (trimmed.length === 0) {
      return '';
    }
    return trimmed;
  }
}
