import { Registers } from './registers.js';

export class Timers {
  private delayTimer: number;
  private soundTimer: number;
  private lastUpdate: number;

  constructor() {
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.lastUpdate = performance.now();
  }

  tick(): void {
    const now = performance.now();
    const elapsed = now - this.lastUpdate;
    const steps = Math.floor(elapsed / (1000 / 60));

    if (steps > 0) {
      if (this.delayTimer > 0) {
        this.delayTimer = Math.max(0, this.delayTimer - steps);
      }
      if (this.soundTimer > 0) {
        this.soundTimer = Math.max(0, this.soundTimer - steps);
      }
      this.lastUpdate = now;
    }
  }

  setDelayTimer(value: number): void {
    this.delayTimer = value & 0xFF;
  }

  getDelayTimer(): number {
    return this.delayTimer;
  }

  setSoundTimer(value: number): void {
    this.soundTimer = value & 0xFF;
  }

  getSoundTimer(): number {
    return this.soundTimer;
  }

  isSoundActive(): boolean {
    return this.soundTimer > 0;
  }

  reset(): void {
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.lastUpdate = performance.now();
  }
}
