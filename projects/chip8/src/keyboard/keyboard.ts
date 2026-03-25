import { IKeyboard } from './ikeyboard';

/**
 * 16-key hex keypad state manager
 * Provides state tracking for a hexadecimal keypad with 16 keys (0-F)
 */
export class Keyboard implements IKeyboard {
  private readonly keyMap: Map<number, string>;
  private isShift: boolean;
  private lastKey: string;
  readonly keys: ReadonlyArray<boolean>;

  constructor() {
    this.keyMap = new Map<number, string>([
      [0x0, '0'], [0x1, '1'], [0x2, '2'], [0x3, '3'],
      [0x4, '4'], [0x5, '5'], [0x6, '6'], [0x7, '7'],
      [0x8, '8'], [0x9, '9'], [0xA, 'A'], [0xB, 'B'],
      [0xC, 'C'], [0xD, 'D'], [0xE, 'E'], [0xF, 'F']
    ]);
    this.isShift = false;
    this.lastKey = '';
    this.keys = Array(16).fill(false);
  }

  pressKey(keyCode: number): void {
    if (!Number.isInteger(keyCode)) {
      throw new TypeError('keyCode must be an integer');
    }
    if (keyCode < 0 || keyCode > 15) {
      throw new RangeError('keyCode must be between 0 and 15');
    }
    (this.keys as boolean[])[keyCode] = true;
    this.lastKey = this.keyMap.get(keyCode) ?? '';
  }

  releaseKey(keyCode: number): void {
    if (!Number.isInteger(keyCode)) {
      throw new TypeError('keyCode must be an integer');
    }
    if (keyCode < 0 || keyCode > 15) {
      throw new RangeError('keyCode must be between 0 and 15');
    }
    (this.keys as boolean[])[keyCode] = false;
  }

  getKeyChar(keyCode: number): string {
    if (!Number.isInteger(keyCode)) {
      throw new TypeError('keyCode must be an integer');
    }
    if (keyCode < 0 || keyCode > 15) {
      throw new RangeError('keyCode must be between 0 and 15');
    }
    return this.keyMap.get(keyCode) ?? '';
  }

  toggleShift(): void {
    this.isShift = !this.isShift;
  }

  clear(): void {
    (this.keys as boolean[]).fill(false);
    this.lastKey = '';
  }

  isPressed(keyCode: number): boolean {
    if (!Number.isInteger(keyCode)) {
      throw new TypeError('keyCode must be an integer');
    }
    if (keyCode < 0 || keyCode > 15) {
      throw new RangeError('keyCode must be between 0 and 15');
    }
    return this.keys[keyCode];
  }

  getLastKey(): string {
    return this.lastKey;
  }

  getPressedIndices(): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.keys.length; i++) {
      if (this.keys[i]) indices.push(i);
    }
    return indices;
  }

  reset(): void {
    this.clear();
    this.isShift = false;
  }

  getShiftState(): boolean {
    return this.isShift;
  }

  setShift(state: boolean): void {
    this.isShift = state;
  }

  getKeyCount(): number {
    return this.keys.length;
  }

  hasPressedKey(): boolean {
    return this.keys.some(key => key);
  }

  getKeyStates(): boolean[] {
    return [...this.keys];
  }
}
