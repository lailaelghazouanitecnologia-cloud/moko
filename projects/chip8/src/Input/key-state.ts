import { Keypad } from './keypad';

export class KeyState {
  private keys: boolean[];

  constructor() {
    this.keys = new Array(16).fill(false);
  }

  isPressed(key: number): boolean {
    if (key < 0 || key > 15) {
      throw new Error(`Invalid key index: ${key}`);
    }
    return this.keys[key];
  }

  setPressed(key: number, pressed: boolean): void {
    if (key < 0 || key > 15) {
      throw new Error(`Invalid key index: ${key}`);
    }
    this.keys[key] = pressed;
  }

  getPressedKey(): number {
    for (let i = 0; i < this.keys.length; i++) {
      if (this.keys[i]) {
        return i;
      }
    }
    return -1;
  }

  reset(): void {
    this.keys.fill(false);
  }

  getState(): boolean[] {
    return [...this.keys];
  }

  setState(state: boolean[]): void {
    if (state.length !== 16) {
      throw new Error('Key state array must have exactly 16 elements');
    }
    this.keys = [...state];
  }
}
