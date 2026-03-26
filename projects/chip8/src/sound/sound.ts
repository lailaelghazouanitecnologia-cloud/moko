import { ISound } from './isound';

/**
 * CHIP-8 square-wave sound generator.
 * Uses the Web Audio API to produce a 440 Hz square wave by default.
 */
export class Sound implements ISound {
  private readonly audioContext: AudioContext;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private frequency: number = 440;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  /**
   * Start the square-wave oscillator if it is not already playing.
   * @public
   */
  public play(): void {
    if (this.isPlaying()) {
      return;
    }

    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    this.oscillator.type = 'square';
    this.oscillator.frequency.setValueAtTime(this.frequency, this.audioContext.currentTime);

    this.gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.oscillator.start();
  }

  /**
   * Stop and clean up the oscillator and gain node.
   * @public
   */
  public stop(): void {
    if (!this.isPlaying()) {
      return;
    }

    this.oscillator!.stop();
    this.oscillator!.disconnect();
    this.gainNode!.disconnect();

    this.oscillator = null;
    this.gainNode = null;
  }

  /**
   * Change the oscillator frequency.
   * @param hz - Desired frequency in hertz. Must be a finite positive number.
   * @throws {RangeError} If hz is not a positive finite number.
   * @public
   */
  public setFrequency(hz: number): void {
    if (!Number.isFinite(hz) || hz <= 0) {
      throw new RangeError('Frequency must be a positive finite number');
    }

    this.frequency = hz;

    if (this.isPlaying() && this.oscillator) {
      this.oscillator.frequency.setValueAtTime(hz, this.audioContext.currentTime);
    }
  }

  public isPlaying(): boolean {
    return this.oscillator !== null;
  }
}
