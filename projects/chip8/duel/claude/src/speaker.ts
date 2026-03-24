import { Clock } from './clock.js';

export class Speaker {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private clock: Clock;
  private enabled = false;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  async init(): Promise<void> {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  private ensureAudio(): void {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      throw new Error('AudioContext not initialized or closed');
    }
  }

  start(): void {
    if (this.enabled) return;
    this.ensureAudio();
    this.enabled = true;
    this.oscillator = this.audioCtx!.createOscillator();
    this.gainNode = this.audioCtx!.createGain();
    this.oscillator.type = 'square';
    this.oscillator.frequency.setValueAtTime(440, this.audioCtx!.currentTime);
    this.gainNode.gain.setValueAtTime(0.1, this.audioCtx!.currentTime);
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx!.destination);
    this.oscillator.start();
  }

  stop(): void {
    if (!this.enabled) return;
    this.enabled = false;
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  update(): void {
    const soundTimer = this.clock.getSoundTimer();
    if (soundTimer > 0 && !this.enabled) {
      this.start();
    } else if (soundTimer === 0 && this.enabled) {
      this.stop();
    }
  }

  cleanup(): void {
    this.stop();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
    this.audioCtx = null;
  }
}
