import { IInput } from './iinput';

/**
 * CHIP-8 16-key keypad state manager.
 * Provides synchronous key-state queries and asynchronous key-waiting.
 */
export class Input implements IInput {
  private readonly keyStates: boolean[];
  private waitingKey: boolean;
  private keyPromise: Promise<number> | null;
  private keyResolve: ((key: number) => void) | null;

  constructor() {
    this.keyStates = new Array(16).fill(false);
    this.waitingKey = false;
    this.keyPromise = null;
    this.keyResolve = null;
  }

  isKeyPressed(key: number): boolean {
    if (!Number.isInteger(key) || key < 0 || key > 15) {
      throw new RangeError('Key must be an integer between 0 and 15');
    }
    return this.keyStates[key];
  }

  /**
   * Wait until any key is pressed.
   * If a wait is already pending, the same promise is returned.
   * @returns A promise that resolves with the index of the key that was pressed
   */
  waitKey(): Promise<number> {
    if (this.waitingKey) {
      return this.keyPromise!;
    }

    this.waitingKey = true;
    this.keyPromise = new Promise<number>((resolve) => {
      this.keyResolve = resolve;
    });

    return this.keyPromise;
  }

  /**
   * Mark a key as pressed.
   * If a key is being waited for, the wait is resolved with this key.
   * @param key - Key index (0–15)
   * @throws {RangeError} if key is out of range
   */
  pressKey(key: number): void {
    if (!Number.isInteger(key) || key < 0 || key > 15) {
      throw new RangeError('Key must be an integer between 0 and 15');
    }

    this.keyStates[key] = true;

    if (this.waitingKey && this.keyResolve) {
      this.keyResolve(key);
      this.waitingKey = false;
      this.keyPromise = null;
      this.keyResolve = null;
    }
  }

  releaseKey(key: number): void {
    if (!Number.isInteger(key) || key < 0 || key > 15) {
      throw new RangeError('Key must be an integer between 0 and 15');
    }
    this.keyStates[key] = false;
  }

  /**
   * Clear all key states and cancel any pending key wait.
   * If a key is being waited for, the promise is resolved with `-1`.
   */
  reset(): void {
    this.keyStates.fill(false);
    this.waitingKey = false;
    if (this.keyResolve) {
      this.keyResolve(-1);
    }
    this.keyPromise = null;
    this.keyResolve = null;
  }
}
