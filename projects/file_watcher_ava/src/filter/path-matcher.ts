/**
 * Matches file paths against patterns with configurable case sensitivity.
 * Supports exact match, prefix, suffix, and substring matching.
 */
export class PathMatcher {
  private patterns: string[];
  private readonly caseSensitive: boolean;

  constructor(patterns: string[] = [], caseSensitive: boolean = true) {
    if (!Array.isArray(patterns)) {
      throw new TypeError('patterns must be an array');
    }
    this.patterns = [...patterns];
    this.caseSensitive = caseSensitive;
  }

  addPattern(pattern: string): void {
    this.patterns.push(pattern);
  }

  removePattern(pattern: string): boolean {
    const index = this.caseSensitive
      ? this.patterns.indexOf(pattern)
      : this.patterns.findIndex(p => p.toLowerCase() === pattern.toLowerCase());
    if (index === -1) return false;
    this.patterns.splice(index, 1);
    return true;
  }

  matches(path: string): boolean {
    return this.patterns.some(pattern => this.match(path, pattern));
  }

  matchesAny(path: string): boolean {
    return this.matches(path);
  }

  getPatterns(): string[] {
    return [...this.patterns];
  }

  clear(): void {
    this.patterns = [];
  }

  private match(path: string, pattern: string): boolean {
    const p = this.caseSensitive ? pattern : pattern.toLowerCase();
    const normalizedPath = this.caseSensitive ? path : path.toLowerCase();
    return p === normalizedPath || 
           normalizedPath.startsWith(p) || 
           normalizedPath.endsWith(p) || 
           normalizedPath.includes(p);
  }
}
