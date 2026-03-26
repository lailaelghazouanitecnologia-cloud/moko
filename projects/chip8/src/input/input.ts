import { IInput } from './iinput';

/**
 * CHIP-8 16-key input handler.
 * Manages the state of 16 hexadecimal keys (0–F).
 */
export class Input implements IInput {
  private readonly keyStates: Uint8Array;

  constructor() {
    this.keyStates = new Uint8Array(16);
  }

  isKeyPressed(key: number): boolean {
    if (!Number.isInteger(key) || key < 0 || key > 15) {
      throw new RangeError('Key must be an integer between 0 and 15');
    }
    return this.keyStates[key] === 1;
  }

  waitForKeyPress(): number {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      for (let i = 0; i < 16; i++) {
        if (this.keyStates[i] === 1) {
          return i;
        }
      }
    }
  }

  keyPressed(key: number): void {
    if (!Number.isInteger(key) || key < 0 || key > 15) {
      throw new RangeError('Key must be an integer between 0 and 15');
    }
    this.keyStates[key] = 1;
  }

  keyReleased(key: number): void {
    if (!Number.isInteger(key) || key < 0 || key > 15) {
      throw new RangeError('Key must be an integer between 0 and 15');
    }
    this.keyStates[key] = 0;
  }

  reset(): void {
    this.keyStates.fill(0);
  }
}
