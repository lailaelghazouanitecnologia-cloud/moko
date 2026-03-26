import { IInput } from './iinput';

export class Input implements IInput {
  private readonly keyStates: boolean[];

  constructor() {
    this.keyStates = new Array(16).fill(false);
  }

  isKeyPressed(key: number): boolean {
    if (key < 0 || key > 15) {
      throw new RangeError('Key must be between 0 and 15');
    }
    return this.keyStates[key];
  }

  waitForKey(): number {
    while (true) {
      for (let i = 0; i < 16; i++) {
        if (this.keyStates[i]) {
          return i;
        }
      }
    }
  }

  keyDown(key: number): void {
    if (key < 0 || key > 15) {
      throw new RangeError('Key must be between 0 and 15');
    }
    this.keyStates[key] = true;
  }

  keyUp(key: number): void {
    if (key < 0 || key > 15) {
      throw new RangeError('Key must be between 0 and 15');
    }
    this.keyStates[key] = false;
  }

  reset(): void {
    this.keyStates.fill(false);
  }
}
