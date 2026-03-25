import { IKeyboard } from './ikeyboard';

/**
 * 16-key hex keypad state manager.
 * Supports keys 0-9 and A-F (case-insensitive).
 */
export class Keyboard implements IKeyboard {
  keys: boolean[] = new Array(16).fill(false);
  lastPressed: string = '';
  lastReleased: string = '';

  press(key: string): void {
    const index = this.keyToIndex(key);
    if (index === undefined) {
      throw new RangeError('Key must be a single hex digit (0-9, A-F)');
    }
    this.keys[index] = true;
    this.lastPressed = key.toUpperCase();
  }

  release(key: string): void {
    const index = this.keyToIndex(key);
    if (index === undefined) {
      throw new RangeError('Key must be a single hex digit (0-9, A-F)');
    }
    this.keys[index] = false;
    this.lastReleased = key.toUpperCase();
  }

  isPressed(key: string): boolean {
    const index = this.keyToIndex(key);
    return index !== undefined ? this.keys[index] : false;
  }

  getPressedKeys(): string[] {
    const pressed: string[] = [];
    for (let i = 0; i < this.keys.length; i++) {
      if (this.keys[i]) {
        pressed.push(this.indexToKey(i));
      }
    }
    return pressed;
  }

  clear(): void {
    this.keys.fill(false);
    this.lastPressed = '';
    this.lastReleased = '';
  }

  /**
   * Export the current key state as a 4-digit hexadecimal string.
   * Each bit represents a key (bit 0 = key 0, bit 15 = key F).
   * @returns 4-digit hex string (e.g., '8001')
   */
  toHex(): string {
    let hex = 0;
    for (let i = 0; i < this.keys.length; i++) {
      if (this.keys[i]) {
        hex |= 1 << i;
      }
    }
    return hex.toString(16).padStart(4, '0').toUpperCase();
  }

  private keyToIndex(key: string): number | undefined {
    const hex = key.toLowerCase();
    if (/^[0-9a-f]$/.test(hex)) {
      return parseInt(hex, 16);
    }
    return undefined;
  }

  private indexToKey(index: number): string {
    return index.toString(16).toUpperCase();
  }
}
