import { IInput } from './iinput';
import { Uint8 } from '../display/idisplay';

/**
 * Tracks the state of 16 hexadecimal keys (0–F).
 * Provides synchronous polling (`isPressed`), asynchronous blocking (`waitKey`),
 * and explicit press/release events (`keyDown`/`keyUp`).
 */
export class Input implements IInput {
  private readonly keys: boolean[];

  constructor() {
    this.keys = new Array<boolean>(16).fill(false);
  }

  isPressed(key: Uint8): boolean {
    if (!Number.isInteger(key) || key < 0 || key > 15) {
      throw new RangeError('Key index must be an integer between 0 and 15');
    }
    return this.keys[key];
  }

  waitKey(): Promise<Uint8> {
    return new Promise<Uint8>((resolve) => {
      const checkKey = (): void => {
        for (let i = 0; i < 16; i++) {
          if (this.keys[i]) {
            resolve(i as Uint8);
            return;
          }
        }
        requestAnimationFrame(checkKey);
      };
      checkKey();
    });
  }

  keyDown(key: Uint8): void {
    if (!Number.isInteger(key) || key < 0 || key > 15) {
      throw new RangeError('Key index must be an integer between 0 and 15');
    }
    this.keys[key] = true;
  }

  keyUp(key: Uint8): void {
    if (!Number.isInteger(key) || key < 0 || key > 15) {
      throw new RangeError('Key index must be an integer between 0 and 15');
    }
    this.keys[key] = false;
  }

  reset(): void {
    this.keys.fill(false);
  }
}
