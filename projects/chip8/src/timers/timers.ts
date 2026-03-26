import { ISound } from '../sound';
import { ITimers } from './itimers';

export class Timers implements ITimers {
  private delayTimer: number;
  private soundTimer: number;
  private readonly sound: ISound;

  constructor(sound: ISound) {
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.sound = sound;
  }

  update(): void {
    if (this.delayTimer > 0) {
      this.delayTimer--;
    }

    if (this.soundTimer > 0) {
      this.soundTimer--;
      this.sound.setBuzzer(true);
    } else {
      this.sound.setBuzzer(false);
    }
  }

  setDelayTimer(value: number): void {
    if (value < 0 || value > 0xFF) {
      throw new RangeError('value must be between 0 and 255');
    }
    this.delayTimer = value & 0xFF;
  }

  setSoundTimer(value: number): void {
    if (value < 0 || value > 0xFF) {
      throw new RangeError('value must be between 0 and 255');
    }
    this.soundTimer = value & 0xFF;
  }

  getDelayTimer(): number {
    return this.delayTimer;
  }

  getSoundTimer(): number {
    return this.soundTimer;
  }
}
