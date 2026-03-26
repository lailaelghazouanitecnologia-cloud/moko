import { ISound } from './isound';

/**
 * Generates square wave tone for CHIP-8 sound timer.
 * Manages Web Audio API resources to produce a beep when the sound timer is active.
 */
export class Sound implements ISound {
  private frequency: number;
  private isPlaying: boolean;
  private readonly audioContext: AudioContext;
  private oscillator: OscillatorNode | null;
  private gainNode: GainNode | null;

  constructor() {
    this.frequency = 440;
    this.isPlaying = false;

    const AudioContextConstructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextConstructor();
    this.oscillator = null;
    this.gainNode = null;
  }

  public play(): void {
    if (this.isPlaying) {
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
    this.isPlaying = true;
  }

  /**
   * Stop sound output.
   * Stops and disconnects the oscillator and gain nodes.
   */
  public stop(): void {
    if (!this.isPlaying) {
      return;
    }

    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    this.isPlaying = false;
  }

  public setFrequency(hz: number): void {
    if (!Number.isFinite(hz)) {
      throw new TypeError('Frequency must be a finite number');
    }
    if (hz <= 0) {
      throw new RangeError('Frequency must be positive');
    }

    this.frequency = hz;

    if (this.oscillator && this.isPlaying) {
      this.oscillator.frequency.setValueAtTime(this.frequency, this.audioContext.currentTime);
    }
  }

  public isPlayingSound(): boolean {
    return this.isPlaying;
  }

  public getFrequency(): number {
    return this.frequency;
  }
}
