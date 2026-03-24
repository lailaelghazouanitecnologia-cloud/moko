import { PulseChannel } from './pulse-channel';
import { TriangleChannel } from './triangle-channel';
import { NoiseChannel } from './noise-channel';

export class AudioProcessingUnit {
  private pulse1: PulseChannel;
  private pulse2: PulseChannel;
  private triangle: TriangleChannel;
  private noise: NoiseChannel;
  private frameCounter: number;
  private frameCounterMode: number;
  private frameInterrupt: boolean;
  private sampleBuffer: Float32Array;
  private sampleIndex: number;
  private cycleCounter: number;

  constructor() {
    this.pulse1 = new PulseChannel(true);
    this.pulse2 = new PulseChannel(false);
    this.triangle = new TriangleChannel();
    this.noise = new NoiseChannel();
    this.frameCounter = 0;
    this.frameCounterMode = 0;
    this.frameInterrupt = false;
    this.sampleBuffer = new Float32Array(4096);
    this.sampleIndex = 0;
    this.cycleCounter = 0;
  }

  reset(): void {
    this.pulse1.reset();
    this.pulse2.reset();
    this.triangle.reset();
    this.noise.reset();
    this.frameCounter = 0;
    this.frameCounterMode = 0;
    this.frameInterrupt = false;
    this.sampleIndex = 0;
    this.cycleCounter = 0;
  }

  step(cpuCycles: number): void {
    this.cycleCounter += cpuCycles;
    const apuCycles = this.cycleCounter >> 1;
    this.cycleCounter &= 1;

    for (let i = 0; i < apuCycles; i++) {
      this.pulse1.clockTimer();
      this.pulse2.clockTimer();
      this.triangle.clockTimer();
      this.noise.clockTimer();

      if (++this.frameCounter === 3729) {
        this.clockEnvelopes();
      } else if (this.frameCounter === 7457) {
        this.clockEnvelopes();
        this.clockSweepUnits();
      } else if (this.frameCounter === 11186) {
        this.clockEnvelopes();
      } else if (this.frameCounter === 14916) {
        this.clockEnvelopes();
        this.clockSweepUnits();
        this.clockFrameCounter();
        this.frameCounter = 0;
        if (this.frameCounterMode === 0 && this.frameInterrupt) {
          this.frameInterrupt = true;
        }
      } else if (this.frameCounterMode === 1 && this.frameCounter === 18641) {
        this.clockEnvelopes();
        this.clockSweepUnits();
        this.clockFrameCounter();
        this.frameCounter = 0;
      }
    }
  }

  readRegister(address: number): number {
    switch (address) {
      case 0x4015:
        let result = 0;
        if (this.pulse1.isEnabled() && this.pulse1.lengthCounter > 0) result |= 0x01;
        if (this.pulse2.isEnabled() && this.pulse2.lengthCounter > 0) result |= 0x02;
        if (this.triangle.isEnabled() && this.triangle.lengthCounter > 0) result |= 0x04;
        if (this.noise.isEnabled() && this.noise.lengthCounter > 0) result |= 0x08;
        if (this.frameInterrupt) result |= 0x40;
        return result;
      default:
        return 0;
    }
  }

  writeRegister(address: number, value: number): void {
    switch (address) {
      case 0x4000:
        this.pulse1.writeControl(value);
        break;
      case 0x4001:
        this.pulse1.writeSweep(value);
        break;
      case 0x4002:
        this.pulse1.writeTimerLow(value);
        break;
      case 0x4003:
        this.pulse1.writeTimerHigh(value);
        break;
      case 0x4004:
        this.pulse2.writeControl(value);
        break;
      case 0x4005:
        this.pulse2.writeSweep(value);
        break;
      case 0x4006:
        this.pulse2.writeTimerLow(value);
        break;
      case 0x4007:
        this.pulse2.writeTimerHigh(value);
        break;
      case 0x4008:
        this.triangle.writeControl(value);
        break;
      case 0x400A:
        this.triangle.writeTimerLow(value);
        break;
      case 0x400B:
        this.triangle.writeTimerHigh(value);
        break;
      case 0x400C:
        this.noise.writeControl(value);
        break;
      case 0x400E:
        this.noise.writePeriod(value);
        break;
      case 0x400F:
        this.noise.writeLength(value);
        break;
      case 0x4015:
        this.pulse1.setEnabled((value & 0x01) !== 0);
        this.pulse2.setEnabled((value & 0x02) !== 0);
        this.triangle.setEnabled((value & 0x04) !== 0);
        this.noise.setEnabled((value & 0x08) !== 0);
        break;
      case 0x4017:
        this.setFrameCounterMode((value >> 7) & 0x01);
        this.enableFrameInterrupt((value & 0x40) === 0);
        if (this.frameCounterMode === 1) {
          this.clockEnvelopes();
          this.clockSweepUnits();
          this.clockFrameCounter();
          this.frameCounter = 0;
        }
        break;
    }
  }

  getSample(): number {
    const p1 = this.pulse1.getOutput();
    const p2 = this.pulse2.getOutput();
    const t = this.triangle.getOutput();
    const n = this.noise.getOutput();
    return this.mixChannels(p1, p2, t, n);
  }

  generateSamples(count: number): void {
    for (let i = 0; i < count && this.sampleIndex < this.sampleBuffer.length; i++) {
      this.sampleBuffer[this.sampleIndex++] = this.getSample();
    }
  }

  setFrameCounterMode(mode: number): void {
    this.frameCounterMode = mode & 0x01;
  }

  enableFrameInterrupt(enable: boolean): void {
    this.frameInterrupt = !enable;
  }

  getFrameInterrupt(): boolean {
    return this.frameInterrupt;
  }

  clearFrameInterrupt(): void {
    this.frameInterrupt = false;
  }

  clockFrameCounter(): void {
    this.pulse1.clockLengthCounter();
    this.pulse2.clockLengthCounter();
    this.triangle.clockLengthCounter();
    this.noise.clockLengthCounter();
  }

  clockEnvelopes(): void {
    this.pulse1.clockEnvelope();
    this.pulse2.clockEnvelope();
    this.noise.clockEnvelope();
    this.triangle.clockLinearCounter();
  }

  clockSweepUnits(): void {
    this.pulse1.clockSweep();
    this.pulse2.clockSweep();
  }

  mixChannels(p1: number, p2: number, t: number, n: number): number {
    const pulseOut = 95.88 / ((8128 / (p1 + p2)) + 100);
    const tndOut = 159.79 / ((1 / (t / 8227 + n / 12241)) + 100);
    return (pulseOut + tndOut) / 2;
  }

  getAudioBuffer(): Float32Array {
    return this.sampleBuffer;
  }
}
