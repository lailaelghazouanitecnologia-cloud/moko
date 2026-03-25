/**
 * Persists top scores in local storage with automatic pruning to maintain
 * only the highest `maxEntries` scores.
 */
export class HighScoreStore {
  private scores: Map<string, number>;
  private maxEntries: number;

  /**
   * Creates a new store.
   * @param maxEntries Maximum number of scores to keep (default 10).
   * @throws {RangeError} if maxEntries is not a positive integer.
   */
  constructor(maxEntries: number = 10) {
    if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
      throw new RangeError('maxEntries must be a positive integer');
    }
    this.scores = new Map<string, number>();
    this.maxEntries = maxEntries;
  }

  /**
   * Loads scores from localStorage under the given key.
   * If the stored data is malformed or missing, the store is cleared.
   * @param key localStorage key
   */
  load(key: string): void {
    if (typeof key !== 'string' || key.length === 0) {
      throw new TypeError('key must be a non-empty string');
    }
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data) as Array<[string, number]>;
        if (!Array.isArray(parsed)) throw new Error('Invalid format');
        const temp = new Map<string, number>();
        for (const entry of parsed) {
          if (!Array.isArray(entry) || entry.length !== 2) {
            throw new Error('Invalid entry format');
          }
          const [player, score] = entry;
          if (typeof player !== 'string' || typeof score !== 'number' || Number.isNaN(score)) {
            throw new Error('Invalid types in entry');
          }
          temp.set(player, score);
        }
        this.scores = temp;
      }
    } catch (e) {
      this.scores.clear();
    }
  }

  /**
   * Saves the current scores to localStorage under the given key.
   * @param key localStorage key
   */
  save(key: string): void {
    if (typeof key !== 'string' || key.length === 0) {
      throw new TypeError('key must be a non-empty string');
    }
    try {
      const entries = Array.from(this.scores.entries());
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (e) {
      throw new Error('Failed to save to localStorage');
    }
  }

  /**
   * Adds a new score for a player.
   * If the score is not higher than the existing one for that player,
   * it is ignored.
   * @param player Player name
   * @param score Score value
   * @returns true if the score was added or updated, false otherwise
   * @throws {TypeError} if player is not a non-empty string or score is not a finite number
   */
  add(player: string, score: number): boolean {
    if (typeof player !== 'string' || player.length === 0) {
      throw new TypeError('player must be a non-empty string');
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new TypeError('score must be a finite number');
    }

    const currentScore = this.scores.get(player) ?? 0;
    if (score <= currentScore) return false;

    this.scores.set(player, score);
    this.prune();
    return true;
  }

  /**
   * Returns the scores sorted descending.
   */
  list(): Array<{ player: string; score: number }> {
    return Array.from(this.scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([player, score]) => ({ player, score }));
  }

  /**
   * Removes all scores from the store.
   */
  clear(): void {
    this.scores.clear();
  }

  /**
   * Checks whether a score would qualify as a high score.
   * @param score Score to test
   * @returns true if the score would be kept
   * @throws {TypeError} if score is not a finite number
   */
  isHighScore(score: number): boolean {
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new TypeError('score must be a finite number');
    }
    if (this.scores.size < this.maxEntries) return true;
    const lowest = Math.min(...Array.from(this.scores.values()));
    return score > lowest;
  }

  /**
   * Internal helper to prune excess entries while preserving the top scores.
   */
  private prune(): void {
    if (this.scores.size <= this.maxEntries) return;
    const sorted = Array.from(this.scores.entries())
      .sort((a, b) => b[1] - a[1]);
    const toRemove = sorted.slice(this.maxEntries);
    for (const [name] of toRemove) {
      this.scores.delete(name);
    }
  }
}
