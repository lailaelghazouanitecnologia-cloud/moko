import { ISound } from './isound';

export class Sound implements ISound {
  private readonly audioContext: AudioContext;
  private oscillator: OscillatorNode | null = null;
  private readonly gainNode: GainNode;
  private frequency: number;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.1;
    this.gainNode.connect(this.audioContext.destination);
    this.frequency = 440;
  }

  start(): void {
    if (!this.audioContext) {
      throw new Error('Audio context is not available');
    }

    if (this.oscillator) {
      this.stop();
    }
    
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = 'square';
    this.oscillator.frequency.value = this.frequency;
    this.oscillator.connect(this.gainNode);
    this.oscillator.start();
  }

  stop(): void {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }
  }

  setFrequency(hz: number): void {
    if (hz < 20 || hz > 20000) {
      throw new RangeError('Frequency must be between 20 and 20000 Hz');
    }
    this.frequency = hz;
    if (this.oscillator) {
      this.oscillator.frequency.value = this.frequency;
    }
  }
}
