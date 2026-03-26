import { IInput } from './iinput';

/**
 * 16-key hex keypad state manager for CHIP-8 emulation.
 * Tracks pressed/released states and supports blocking until a key is pressed.
 */
export class Input implements IInput {
  public readonly keypad: Uint8Array;
  private resolveKey: ((key: number) => void) | null = null;

  constructor() {
    this.keypad = new Uint8Array(16);
  }

  public key_down(chip8_key: number): void {
    if (!Number.isInteger(chip8_key)) {
      throw new TypeError('chip8_key must be an integer');
    }
    if (chip8_key < 0 || chip8_key > 15) {
      throw new RangeError('chip8_key must be 0-15');
    }
    this.keypad[chip8_key] = 1;
    if (this.resolveKey) {
      this.resolveKey(chip8_key);
      this.resolveKey = null;
    }
  }

  public key_up(chip8_key: number): void {
    if (!Number.isInteger(chip8_key)) {
      throw new TypeError('chip8_key must be an integer');
    }
    if (chip8_key < 0 || chip8_key > 15) {
      throw new RangeError('chip8_key must be 0-15');
    }
    this.keypad[chip8_key] = 0;
  }

  public is_pressed(chip8_key: number): boolean {
    if (!Number.isInteger(chip8_key)) {
      throw new TypeError('chip8_key must be an integer');
    }
    if (chip8_key < 0 || chip8_key > 15) {
      throw new RangeError('chip8_key must be 0-15');
    }
    return this.keypad[chip8_key] === 1;
  }

  public wait_key(): Promise<number> {
    return new Promise<number>((resolve) => {
      for (let i = 0; i < 16; i++) {
        if (this.keypad[i] === 1) {
          resolve(i);
          return;
        }
      }
      this.resolveKey = resolve;
    });
  }

  public reset(): void {
    this.keypad.fill(0);
    if (this.resolveKey) {
      this.resolveKey = null;
    }
  }
}
