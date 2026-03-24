/**
 * Generates unique identifiers with an optional prefix and sequential counter.
 */
export class IdGenerator {
  private prefix: string;
  private counter: number;

  /**
   * Creates an instance of IdGenerator.
   * @param prefix - Optional prefix for generated IDs. Defaults to 'id'.
   */
  constructor(prefix?: string) {
    this.prefix = this.validatePrefix(prefix ?? 'id');
    this.counter = 0;
  }

  /**
   * Generates the next unique ID in sequence.
   * @returns A unique ID string in the format `{prefix}-{counter}`.
   * @throws {Error} If the counter exceeds the safe integer limit.
   */
  public next(): string {
    if (this.counter >= Number.MAX_SAFE_INTEGER) {
      throw new Error('Counter overflow: cannot generate more IDs safely.');
    }
    this.counter++;
    return `${this.prefix}-${this.counter}`;
  }

  /**
   * Resets the internal counter to zero.
   */
  public reset(): void {
    this.counter = 0;
  }

  /**
   * Factory method to create a new IdGenerator instance.
   * @param prefix - Optional prefix for generated IDs.
   * @returns A new IdGenerator instance.
   */
  public static create(prefix?: string): IdGenerator {
    return new IdGenerator(prefix);
  }

  /**
   * Generates a UUID v4 compliant string.
   * @returns A UUID v4 string.
   */
  public static uuid(): string {
    const segments: string[] = [];
    for (let i = 0; i < 16; i++) {
      segments.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0'));
    }
    return [
      segments.slice(0, 4).join(''),
      segments.slice(4, 6).join(''),
      segments.slice(6, 8).join(''),
      segments.slice(8, 10).join(''),
      segments.slice(10, 16).join('')
    ].join('-');
  }

  /**
   * Validates the provided prefix to ensure it is a non-empty string.
   * @param prefix - The prefix to validate.
   * @returns The validated prefix.
   * @throws {TypeError} If the prefix is not a string or is empty.
   */
  private validatePrefix(prefix: unknown): string {
    if (typeof prefix !== 'string') {
      throw new TypeError('Prefix must be a string.');
    }
    if (prefix.trim().length === 0) {
      throw new TypeError('Prefix cannot be an empty string.');
    }
    return prefix.trim();
  }
}
