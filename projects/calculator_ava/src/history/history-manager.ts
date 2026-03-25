import { HistoryEntry } from './history-entry';

/**
 * Stores and retrieves past calculations with configurable size limits.
 * Implements a circular buffer pattern when the maximum size is reached.
 */
export class HistoryManager {
  private entries: HistoryEntry[] = [];
  private maxSize: number;

  /**
   * Creates a new HistoryManager instance.
   * @param maxSize - Maximum number of entries to store (default: 100)
   * @throws {RangeError} If maxSize is not a positive integer
   */
  constructor(maxSize: number = 100) {
    if (!Number.isInteger(maxSize) || maxSize <= 0) {
      throw new RangeError('maxSize must be a positive integer');
    }
    this.maxSize = maxSize;
  }

  /**
   * Appends a new entry to the history.
   * @param entry - The history entry to add
   * @throws {TypeError} If entry is not a valid HistoryEntry
   */
  add(entry: HistoryEntry): void {
    if (!entry || typeof entry !== 'object') {
      throw new TypeError('entry must be a valid HistoryEntry object');
    }
    if (typeof entry.id !== 'string') {
      throw new TypeError('entry.id must be a string');
    }

    this.entries.push(entry);
    if (this.entries.length > this.maxSize) {
      this.entries.shift();
    }
  }

  /**
   * Returns all entries in the history.
   * @returns A shallow copy of all history entries
   */
  getAll(): HistoryEntry[] {
    return [...this.entries];
  }

  /**
   * Finds a history entry by its ID.
   * @param id - The ID of the entry to find
   * @returns The found entry or undefined if not found
   * @throws {TypeError} If id is not a string
   */
  getById(id: string): HistoryEntry | undefined {
    if (typeof id !== 'string') {
      throw new TypeError('id must be a string');
    }
    return this.entries.find(entry => entry.id === id);
  }

  /**
   * Removes all entries from the history.
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Deletes a specific entry by its ID.
   * @param id - The ID of the entry to delete
   * @returns true if an entry was deleted, false otherwise
   * @throws {TypeError} If id is not a string
   */
  deleteById(id: string): boolean {
    if (typeof id !== 'string') {
      throw new TypeError('id must be a string');
    }
    const index = this.entries.findIndex(entry => entry.id === id);
    if (index !== -1) {
      this.entries.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Updates the maximum number of entries to store.
   * @param size - The new maximum size
   * @throws {RangeError} If size is not a positive integer
   */
  setMaxSize(size: number): void {
    if (!Number.isInteger(size) || size <= 0) {
      throw new RangeError('size must be a positive integer');
    }
    this.maxSize = size;
    if (this.entries.length > this.maxSize) {
      this.entries = this.entries.slice(-this.maxSize);
    }
  }

  /**
   * Gets the current maximum size limit.
   * @returns The maximum number of entries that can be stored
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Gets the current number of stored entries.
   * @returns The number of entries in the history
   */
  getCurrentSize(): number {
    return this.entries.length;
  }

  /**
   * Checks if the history is empty.
   * @returns true if no entries are stored, false otherwise
   */
  isEmpty(): boolean {
    return this.entries.length === 0;
  }

  /**
   * Gets the most recent entry.
   * @returns The last added entry or undefined if history is empty
   */
  getLatest(): HistoryEntry | undefined {
    return this.entries[this.entries.length - 1];
  }

  /**
   * Gets entries within a specific time range.
   * @param startTime - Start timestamp (inclusive)
   * @param endTime - End timestamp (inclusive)
   * @returns Array of entries within the time range
   * @throws {TypeError} If timestamps are not numbers
   */
  getByTimeRange(startTime: number, endTime: number): HistoryEntry[] {
    if (typeof startTime !== 'number' || typeof endTime !== 'number') {
      throw new TypeError('startTime and endTime must be numbers');
    }
    if (startTime > endTime) {
      throw new RangeError('startTime must be less than or equal to endTime');
    }
    return this.entries.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    );
  }
}
