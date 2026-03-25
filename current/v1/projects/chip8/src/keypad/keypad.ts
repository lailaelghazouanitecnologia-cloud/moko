import { IKeypad } from './ikeypad';

/**
 * 16-key input matrix with blocking wait.
 * Keys are numbered 0-15 and can be pressed simultaneously.
 */
export class Keypad implements IKeypad {
  private readonly state: Uint16Array;
  private resolveKey?: (key: number) => void;

  constructor() {
    this.state = new Uint16Array(1);
  }

  keydown(key: number): void {
    if (!Number.isInteger(key)) throw new TypeError('Key must be an integer');
    if (key < 0 || key > 15) throw new RangeError('Key must be 0-15');
    this.state[0] |= 1 << key;
    if (this.resolveKey) {
      this.resolveKey(key);
      this.resolveKey = undefined;
    }
  }

  keyup(key: number): void {
    if (!Number.isInteger(key)) throw new TypeError('Key must be an integer');
    if (key < 0 || key > 15) throw new RangeError('Key must be 0-15');
    this.state[0] &= ~(1 << key);
  }

  isPressed(key: number): boolean {
    if (!Number.isInteger(key)) throw new TypeError('Key must be an integer');
    if (key < 0 || key > 15) throw new RangeError('Key must be 0-15');
    return Boolean(this.state[0] & (1 << key));
  }

  waitKey(): Promise<number> {
    return new Promise<number>(resolve => {
      this.resolveKey = resolve;
    });
  }

  reset(): void {
    this.state[0] = 0;
    this.resolveKey = undefined;
  }
}
