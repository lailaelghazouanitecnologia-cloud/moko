/**
 * Manages current game state
 */
export class GameState {
  private current: string;
  private previous: string;
  private data: Record<string, any>;
  private timestamp: number;

  constructor() {
    this.current = 'start';
    this.previous = '';
    this.data = {};
    this.timestamp = Date.now();
  }

  /**
   * Switch game state
   * @param newState - The new state to transition to
   * @param payload - Optional data to merge into state
   * @throws {Error} If newState is not a non-empty string
   */
  transition(newState: string, payload?: any): void {
    if (typeof newState !== 'string' || newState.trim() === '') {
      throw new Error('newState must be a non-empty string');
    }
    this.previous = this.current;
    this.current = newState.trim();
    this.timestamp = Date.now();
    if (payload !== null && payload !== undefined) {
      this.validatePayload(payload);
      Object.assign(this.data, payload);
    }
  }

  /**
   * Retrieve state data
   * @param key - The key to retrieve
   * @returns The value associated with the key
   * @throws {Error} If key is not a non-empty string
   */
  get(key: string): any {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('key must be a non-empty string');
    }
    return this.data[key];
  }

  /**
   * Store state data
   * @param key - The key to set
   * @param value - The value to store
   * @throws {Error} If key is not a non-empty string
   */
  set(key: string, value: any): void {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('key must be a non-empty string');
    }
    this.data[key] = value;
  }

  /**
   * Clear all data
   */
  reset(): void {
    this.data = {};
    this.previous = '';
    this.current = 'start';
    this.timestamp = Date.now();
  }

  /**
   * Check current state
   * @param state - The state to check against
   * @returns True if current state matches
   * @throws {Error} If state is not a string
   */
  is(state: string): boolean {
    if (typeof state !== 'string') {
      throw new Error('state must be a string');
    }
    return this.current === state;
  }

  /**
   * Check previous state
   * @param state - The state to check against
   * @returns True if previous state matches
   * @throws {Error} If state is not a string
   */
  was(state: string): boolean {
    if (typeof state !== 'string') {
      throw new Error('state must be a string');
    }
    return this.previous === state;
  }

  /**
   * Get the current state
   * @returns The current state
   */
  getCurrent(): string {
    return this.current;
  }

  /**
   * Get the previous state
   * @returns The previous state
   */
  getPrevious(): string {
    return this.previous;
  }

  /**
   * Get the timestamp of the last state change
   * @returns The timestamp
   */
  getTimestamp(): number {
    return this.timestamp;
  }

  /**
   * Get all state data
   * @returns A shallow copy of the state data
   */
  getAllData(): Record<string, any> {
    return { ...this.data };
  }

  /**
   * Remove a key from state data
   * @param key - The key to remove
   * @throws {Error} If key is not a non-empty string
   */
  remove(key: string): void {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('key must be a non-empty string');
    }
    delete this.data[key];
  }

  /**
   * Check if a key exists in state data
   * @param key - The key to check
   * @returns True if the key exists
   * @throws {Error} If key is not a non-empty string
   */
  has(key: string): boolean {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('key must be a non-empty string');
    }
    return Object.prototype.hasOwnProperty.call(this.data, key);
  }

  /**
   * Validate payload object
   * @param payload - The payload to validate
   * @throws {Error} If payload is not a plain object
   */
  private validatePayload(payload: any): void {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('payload must be a plain object');
    }
  }
}
