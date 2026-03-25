import { PathMatcher } from './path-matcher';

/**
 * Filters file paths using glob-style include and exclude patterns.
 * If no patterns are provided, all paths are accepted.
 * If includes are specified, only matching paths are accepted.
 * If excludes are specified, matching paths are rejected.
 */
export class GlobFilter {
  private readonly includeMatcher: PathMatcher;
  private readonly excludeMatcher: PathMatcher;

  constructor(includes: readonly string[] = [], excludes: readonly string[] = []) {
    if (!Array.isArray(includes)) {
      throw new TypeError('includes must be an array');
    }
    if (!Array.isArray(excludes)) {
      throw new TypeError('excludes must be an array');
    }

    this.includeMatcher = new PathMatcher([...includes]);
    this.excludeMatcher = new PathMatcher([...excludes]);
  }

  addIncludePattern(pattern: string): void {
    this.includeMatcher.addPattern(pattern);
  }

  addExcludePattern(pattern: string): void {
    this.excludeMatcher.addPattern(pattern);
  }

  removeIncludePattern(pattern: string): boolean {
    return this.includeMatcher.removePattern(pattern);
  }

  removeExcludePattern(pattern: string): boolean {
    return this.excludeMatcher.removePattern(pattern);
  }

  matches(path: string): boolean {

    const hasIncludes = this.includeMatcher.getPatterns().length > 0;
    const hasExcludes = this.excludeMatcher.getPatterns().length > 0;

    if (!hasIncludes && !hasExcludes) return true;

    if (hasExcludes && this.excludeMatcher.matches(path)) return false;

    if (hasIncludes) return this.includeMatcher.matches(path);

    return true;
  }

  getIncludePatterns(): ReadonlyArray<string> {
    return this.includeMatcher.getPatterns();
  }

  getExcludePatterns(): ReadonlyArray<string> {
    return this.excludeMatcher.getPatterns();
  }

  clearIncludes(): void {
    this.includeMatcher.clear();
  }

  clearExcludes(): void {
    this.excludeMatcher.clear();
  }

  clear(): void {
    this.includeMatcher.clear();
    this.excludeMatcher.clear();
  }
}
