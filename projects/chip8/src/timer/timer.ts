import { ITimer } from './itimer';

export class Timer implements ITimer {
  private delayTimer: number;
  private soundTimer: number;

  constructor() {
    this.delayTimer = 0;
    this.soundTimer = 0;
  }

  setDelay(value: number): void {
    this.delayTimer = value & 0xFF;
  }

  getDelay(): number {
    return this.delayTimer;
  }

  setSound(value: number): void {
    this.soundTimer = value & 0xFF;
  }

  getSound(): number {
    return this.soundTimer;
  }

  /**
   * Decrement both timers at 60Hz.
   * Timers stop at 0.
   */
  tick(): void {
    if (this.delayTimer > 0) {
      this.delayTimer--;
    }
    if (this.soundTimer > 0) {
      this.soundTimer--;
    }
  }
}
