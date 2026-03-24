import { Clock } from "./clock.js";

export class Speaker {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  private async ensureAudioContext(): Promise<void> {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }
    }
  }

  async init(): Promise<void> {
    await this.ensureAudioContext();
    if (!this.audioCtx) throw new Error("AudioContext not available");

    this.oscillator = this.audioCtx.createOscillator();
    this.gain = this.audioCtx.createGain();

    this.oscillator.type = "square";
    this.oscillator.frequency.value = 440;
    this.gain.gain.value = 0;

    this.oscillator.connect(this.gain);
    this.gain.connect(this.audioCtx.destination);

    this.oscillator.start();
  }

  private stop(): void {
    if (this.gain) {
      this.gain.gain.value = 0;
    }
  }

  private play(): void {
    if (this.gain) {
      this.gain.gain.value = 0.05;
    }
  }

  update(st: number): void {
    if (st > 0) {
      if (!this.oscillator || !this.gain) {
        this.init().catch(() => {});
      } else {
        this.play();
      }
    } else {
      this.stop();
    }
  }

  destroy(): void {
    this.stop();
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }
    if (this.gain) {
      this.gain.disconnect();
      this.gain = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
