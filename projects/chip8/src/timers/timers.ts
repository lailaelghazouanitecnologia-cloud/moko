import { ISound, Sound } from '../sound';
import { ITimers } from './itimers';

/**
 * 60Hz countdown timers for CHIP-8.
 * Provides delay and sound timers that count down at 60Hz.
 */
export class Timers implements ITimers {
  private delayTimer: number;
  private soundTimer: number;
  private readonly speed: number;
  private readonly sound: ISound;

  constructor(sound: ISound) {
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.speed = 60;
    this.sound = sound;
  }

  update(deltaTime: number): void {
    if (!Number.isFinite(deltaTime)) {
      throw new TypeError('deltaTime must be a finite number');
    }
    if (deltaTime < 0) {
      throw new RangeError('deltaTime must be non-negative');
    }

    const decrement = deltaTime * this.speed;
    
    if (this.delayTimer > 0) {
      this.delayTimer = Math.max(0, this.delayTimer - decrement);
    }
    
    if (this.soundTimer > 0) {
      this.soundTimer = Math.max(0, this.soundTimer - decrement);
      
      if (this.soundTimer > 0) {
        this.sound.start();
      } else if (this.soundTimer === 0) {
        this.sound.stop();
      }
    }
  }

  getSpeed(): number {
    return this.speed;
  }

  isSounding(): boolean {
    return this.soundTimer > 0;
  }

  getDelayTimer(): number {
    return this.delayTimer;
  }

  setDelayTimer(value: number): void {
    if (!Number.isFinite(value)) {
      throw new TypeError('value must be a finite number');
    }
    this.delayTimer = Math.max(0, Math.min(255, Math.floor(value)));
  }

  getSoundTimer(): number {
    return this.soundTimer;
  }

  /**
   * Set the sound timer value.
   * Value is clamped to 0-255 range and floored to integer.
   * Automatically starts/stops sound based on value.
   * @param value - Timer value to set
   * @throws {TypeError} If value is not a finite number
   */
  setSoundTimer(value: number): void {
    if (!Number.isFinite(value)) {
      throw new TypeError('value must be a finite number');
    }
    const newValue = Math.max(0, Math.min(255, Math.floor(value)));
    this.soundTimer = newValue;
    
    if (newValue > 0) {
      this.sound.start();
    } else if (newValue === 0) {
      this.sound.stop();
    }
  }
}
