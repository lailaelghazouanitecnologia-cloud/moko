import { u8 } from './types';

export class Keyboard {
  private keys: boolean[] = new Array(16).fill(false);
  private waitForKey: { resolve: (key: u8) => void; timeout?: number } | null = null;

  isPressed(key: u8): boolean {
    return !!this.keys[key & 0xF];
  }

  setPressed(key: u8, pressed: boolean): void {
    this.keys[key & 0xF] = pressed;
    if (pressed && this.waitForKey) {
      this.waitForKey.resolve(key & 0xF);
      this.waitForKey = null;
    }
  }

  async waitForAnyKey(): Promise<u8> {
    if (this.waitForKey) {
      clearTimeout(this.waitForKey.timeout);
    }
    return new Promise<u8>((resolve) => {
      const timeout = setTimeout(() => {
        this.waitForKey = null;
        resolve(0x10);
      }, 5000);
      this.waitForKey = { resolve, timeout };
    });
  }

  reset(): void {
    this.keys.fill(false);
    if (this.waitForKey) {
      clearTimeout(this.waitForKey.timeout);
      this.waitForKey.resolve(0x10);
      this.waitForKey = null;
    }
  }
}
