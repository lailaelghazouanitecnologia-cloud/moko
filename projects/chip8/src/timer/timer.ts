import { ICpu } from '../cpu';
import { ISound } from '../sound';
import { ITimer } from './itimer';

export class Timer implements ITimer {
  private isRunning: boolean;
  private intervalId: number | null;
  private delayTimer: number;
  private soundTimer: number;

  constructor(
    private readonly cpu: ICpu,
    private readonly sound: ISound
  ) {
    this.isRunning = false;
    this.intervalId = null;
    this.delayTimer = 0;
    this.soundTimer = 0;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalId = window.setInterval(() => this.update(), 1000 / 60);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  update(): void {
    if (this.delayTimer > 0) {
      this.delayTimer--;
    }
    if (this.soundTimer > 0) {
      this.soundTimer--;
      if (this.soundTimer === 0) {
        this.sound.stop();
      }
    }
  }

  getDelayTimer(): number {
    return this.delayTimer;
  }

  setDelayTimer(value: number): void {
    if (value < 0 || value > 0xFF) {
      throw new RangeError('value must be between 0 and 255');
    }
    this.delayTimer = value & 0xFF;
  }

  getSoundTimer(): number {
    return this.soundTimer;
  }

  setSoundTimer(value: number): void {
    if (value < 0 || value > 0xFF) {
      throw new RangeError('value must be between 0 and 255');
    }
    this.soundTimer = value & 0xFF;
    if (this.soundTimer > 0) {
      this.sound.play();
    }
  }
}
