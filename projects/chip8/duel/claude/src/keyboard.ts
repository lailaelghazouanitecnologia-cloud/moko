import { u8 } from "./types";

export class Keyboard {
  private keys: boolean[] = new Array(16).fill(false);
  private waitingFor: { key: number; resolve: (key: u8) => void } | null = null;

  isPressed(key: u8): boolean {
    return this.keys[key] === true;
  }

  press(key: u8): void {
    this.keys[key] = true;
    if (this.waitingFor !== null) {
      this.waitingFor.resolve(key);
      this.waitingFor = null;
    }
  }

  release(key: u8): void {
    this.keys[key] = false;
  }

  releaseAll(): void {
    this.keys.fill(false);
  }

  async waitForKeyPress(): Promise<u8> {
    if (this.waitingFor !== null) {
      throw new Error("Already waiting for a key press");
    }
    return new Promise<u8>((resolve) => {
      this.waitingFor = { key: -1, resolve };
    });
  }

  cancelWait(): void {
    if (this.waitingFor !== null) {
      this.waitingFor.resolve(0xff);
      this.waitingFor = null;
    }
  }
}
