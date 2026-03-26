import { ITimer } from '../timer';
import { ISound } from './isound';

export class Sound implements ISound {
  private readonly audioContext: AudioContext;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private readonly timer: ITimer;

  constructor(timer: ITimer) {
    this.timer = timer;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  update(): void {
    const soundTimer = this.timer.getSound();
    if (soundTimer > 0 && !this.isPlaying()) {
      this.start();
    } else if (soundTimer === 0 && this.isPlaying()) {
      this.stop();
    }
  }

  start(): void {
    if (this.isPlaying()) return;

    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    this.oscillator.type = 'square';
    this.oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
    this.gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.oscillator.start();
  }

  stop(): void {
    if (!this.isPlaying()) return;

    this.oscillator!.stop();
    this.oscillator = null;
    this.gainNode = null;
  }

  isPlaying(): boolean {
    return this.oscillator !== null;
  }
}
