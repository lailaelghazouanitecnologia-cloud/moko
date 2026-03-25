import { ITimers } from './itimers';

export class Timers implements ITimers {
  delayTimer: number;
  soundTimer: number;

  constructor() {
    this.delayTimer = 0;
    this.soundTimer = 0;
  }

  /**
   * Decrement both timers at 60 Hz.
   * Timers are clamped to zero and will not underflow.
   */
  tick60Hz(): void {
    if (this.delayTimer > 0) this.delayTimer--;
    if (this.soundTimer > 0) this.soundTimer--;
  }

  setDelay(value: number): void {
    if (!Number.isFinite(value)) {
      throw new TypeError('Delay value must be a finite number');
    }
    this.delayTimer = Math.max(0, Math.floor(value)) & 0xFF;
  }

  getDelay(): number {
    return this.delayTimer;
  }

  setSound(value: number): void {
    if (!Number.isFinite(value)) {
      throw new TypeError('Sound value must be a finite number');
    }
    this.soundTimer = Math.max(0, Math.floor(value)) & 0xFF;
  }

  getSound(): number {
    return this.soundTimer;
  }

  isBuzzing(): boolean {
    return this.soundTimer > 0;
  }
}
