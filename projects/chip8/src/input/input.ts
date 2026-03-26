import { IInput } from './iinput';

/**
 * 16-key keypad state manager.
 * Provides synchronous access to key states and blocking wait for key press.
 */
export class Input implements IInput {
  private readonly _keyStates: boolean[];

  constructor() {
    this._keyStates = new Array(16).fill(false);
  }

  get keyStates(): ReadonlyArray<boolean> {
    return this._keyStates;
  }

  isPressed(key: number): boolean {
    if (!Number.isInteger(key)) {
      throw new TypeError(`Key index must be an integer, got ${typeof key}`);
    }
    if (key < 0 || key > 15) {
      throw new RangeError(`Key index must be between 0 and 15, got ${key}`);
    }
    return this._keyStates[key];
  }

  waitForPress(): number {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      for (let i = 0; i < 16; i++) {
        if (this._keyStates[i]) {
          return i;
        }
      }
    }
  }

  setKeyState(key: number, pressed: boolean): void {
    if (!Number.isInteger(key)) {
      throw new TypeError(`Key index must be an integer, got ${typeof key}`);
    }
    if (key < 0 || key > 15) {
      throw new RangeError(`Key index must be between 0 and 15, got ${key}`);
    }
    this._keyStates[key] = pressed;
  }

  reset(): void {
    for (let i = 0; i < 16; i++) {
      this._keyStates[i] = false;
    }
  }
}
