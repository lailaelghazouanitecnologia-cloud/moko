import { ISound } from './isound';

/**
 * CHIP-8 square-wave buzzer implementation using Web Audio API.
 * Provides real-time control over tone generation with adjustable frequency and volume.
 */
export class Sound implements ISound {
  private readonly audioContext: AudioContext;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isActive = false;
  private frequency = 440;
  private volume = 0.3;

  constructor() {
    const AudioContextConstructor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextConstructor();
  }

  setBuzzer(active: boolean): void {
    if (active === this.isActive) return;

    this.isActive = active;
    if (active) {
      this.start();
    } else {
      this.stop();
    }
  }

  isPlaying(): boolean {
    return this.isActive;
  }

  setFrequency(hz: number): void {
    if (hz <= 0) throw new RangeError('Frequency must be positive');
    this.frequency = hz;
    if (this.oscillator) {
      this.oscillator.frequency.setValueAtTime(hz, this.audioContext.currentTime);
    }
  }

  setVolume(level: number): void {
    if (level < 0 || level > 1) throw new RangeError('Volume must be between 0 and 1');
    this.volume = level;
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(level, this.audioContext.currentTime);
    }
  }

  private start(): void {
    if (this.oscillator) return;

    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    this.oscillator.type = 'square';
    this.oscillator.frequency.setValueAtTime(this.frequency, this.audioContext.currentTime);
    this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.oscillator.start();
  }

  /**
   * Stop and disconnect audio nodes to cease tone generation.
   * @private
   */
  private stop(): void {
    if (!this.oscillator) return;

    this.oscillator.stop();
    this.oscillator.disconnect();
    this.gainNode?.disconnect();

    this.oscillator = null;
    this.gainNode = null;
  }
}
