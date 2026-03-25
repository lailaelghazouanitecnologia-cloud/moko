import { ITimers } from './itimers';

/**
 * 60 Hz countdown and sound timer registers.
 * Provides two 8-bit down-counters that decrement at 60 Hz.
 */
export class Timers implements ITimers {
  delayCounter: number;
  soundCounter: number;

  constructor() {
    this.delayCounter = 0;
    this.soundCounter = 0;
  }

  /**
   * Decrement both counters by one tick (60 Hz).
   * Counters stop at zero.
   */
  tick(): void {
    if (this.delayCounter > 0) this.delayCounter--;
    if (this.soundCounter > 0) this.soundCounter--;
  }

  setDelay(value: number): void {
    if (!Number.isFinite(value)) {
      throw new TypeError('Delay value must be a finite number');
    }
    this.delayCounter = value & 0xFF;
  }

  getDelay(): number {
    return this.delayCounter;
  }

  setSound(value: number): void {
    if (!Number.isFinite(value)) {
      throw new TypeError('Sound value must be a finite number');
    }
    this.soundCounter = value & 0xFF;
  }

  getSound(): number {
    return this.soundCounter;
  }

  isSoundActive(): boolean {
    return this.soundCounter > 0;
  }
}
