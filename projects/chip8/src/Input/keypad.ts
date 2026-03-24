import { KeyState } from './key-state';

export class Keypad {
  private keyStates: KeyState[];
  private waitKey: number;

  constructor() {
    this.keyStates = new Array(16).fill(KeyState.RELEASED);
    this.waitKey = -1;
  }

  public isKeyPressed(key: number): boolean {
    if (key < 0 || key > 15) {
      return false;
    }
    return this.keyStates[key] === KeyState.PRESSED;
  }

  public setKeyState(key: number, state: KeyState): void {
    if (key < 0 || key > 15) {
      return;
    }
    this.keyStates[key] = state;
    if (state === KeyState.PRESSED && this.waitKey !== -1) {
      this.waitKey = -1;
    }
  }

  public getKeyPressed(): number {
    for (let i = 0; i < 16; i++) {
      if (this.keyStates[i] === KeyState.PRESSED) {
        return i;
      }
    }
    return -1;
  }

  public setWaitKey(key: number): void {
    this.waitKey = key;
  }

  public getWaitKey(): number {
    return this.waitKey;
  }

  public isWaitingForKey(): boolean {
    return this.waitKey !== -1;
  }

  public reset(): void {
    this.keyStates.fill(KeyState.RELEASED);
    this.waitKey = -1;
  }
}
