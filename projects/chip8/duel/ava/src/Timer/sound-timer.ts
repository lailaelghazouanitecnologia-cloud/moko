import { AudioContext } from './audio-context';

export class SoundTimer {
  private value: number = 0;
  private lastUpdate: number = 0;
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private muted: boolean = false;

  set(val: number): void {
    this.value = Math.max(0, Math.min(255, val));
    if (this.value > 0) {
      this.startBeep();
    } else {
      this.stopBeep();
    }
  }

  get(): number {
    return this.value;
  }

  tick(now: number): void {
    if (this.lastUpdate === 0) {
      this.lastUpdate = now;
      return;
    }
    const delta = now - this.lastUpdate;
    if (delta >= 1000 / 60) {
      if (this.value > 0) {
        this.value--;
        if (this.value === 0) {
          this.stopBeep();
        }
      }
      this.lastUpdate = now;
    }
  }

  isActive(): boolean {
    return this.value > 0;
  }

  reset(): void {
    this.value = 0;
    this.stopBeep();
  }

  startBeep(): void {
    if (this.muted) return;
    if (this.oscillator) return;

    this.audioCtx = new AudioContext();
    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();

    this.oscillator.type = 'square';
    this.oscillator.frequency.setValueAtTime(400, this.audioCtx.currentTime);
    this.gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);
    this.oscillator.start();
  }

  stopBeep(): void {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBeep();
    } else if (this.value > 0) {
      this.startBeep();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }
}
