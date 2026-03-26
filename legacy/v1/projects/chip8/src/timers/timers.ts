import { ITimers } from './itimers';

export class Timers implements ITimers {
  private delayTimer: number;
  private soundTimer: number;
  private readonly audioCtx: AudioContext;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  constructor() {
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  tick60Hz(): void {
    if (this.delayTimer > 0) this.delayTimer--;
    if (this.soundTimer > 0) {
      this.soundTimer--;
      if (this.soundTimer === 0) this.stopTone();
    }
  }

  getDelay(): number {
    return this.delayTimer;
  }

  setDelay(val: number): void {
    this.delayTimer = val & 0xFF;
  }

  getSound(): number {
    return this.soundTimer;
  }

  setSound(val: number): void {
    this.soundTimer = val & 0xFF;
    if (this.soundTimer > 0) this.startTone();
  }

  startTone(): void {
    if (this.oscillator) return;
    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();
    this.oscillator.type = 'square';
    this.oscillator.frequency.value = 60;
    this.gainNode.gain.value = 0.1;
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);
    this.oscillator.start();
  }

  stopTone(): void {
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
}
