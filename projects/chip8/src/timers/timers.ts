import { ITimers } from './itimers';

export class Timers implements ITimers {
  private delay_timer: number;
  private sound_timer: number;

  constructor() {
    this.delay_timer = 0;
    this.sound_timer = 0;
  }

  tick(): void {
    if (this.delay_timer > 0) {
      this.delay_timer--;
    }
    if (this.sound_timer > 0) {
      this.sound_timer--;
    }
  }

  setDelay(value: number): void {
    this.delay_timer = value & 0xFF;
  }

  getDelay(): number {
    return this.delay_timer;
  }

  setSound(value: number): void {
    this.sound_timer = value & 0xFF;
  }

  getSound(): number {
    return this.sound_timer;
  }

  isBeeping(): boolean {
    return this.sound_timer > 0;
  }
}
