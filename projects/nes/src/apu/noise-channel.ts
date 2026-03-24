import { APU2A03 } from './apu2-a03';

export class NoiseChannel {
  private enabled: boolean = false;
  private mode: boolean = false;
  private timer: number = 0;
  private timerPeriod: number = 0;
  private shiftRegister: number = 1;
  private lengthCounter: number = 0;
  private lengthCounterHalt: boolean = false;
  private envelope: number = 0;
  private envelopePeriod: number = 0;
  private envelopeVolume: number = 0;
  private envelopeStart: boolean = false;
  private constantVolume: boolean = false;

  private static readonly LENGTH_TABLE: number[] = [
    10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14,
    12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30
  ];

  private static readonly NOISE_TABLE: number[] = [
    4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068
  ];

  writeControl(data: number): void {
    this.lengthCounterHalt = (data & 0x20) !== 0;
    this.constantVolume = (data & 0x10) !== 0;
    this.envelopePeriod = data & 0x0F;
    this.envelopeVolume = this.envelopePeriod;
  }

  writePeriod(data: number): void {
    this.mode = (data & 0x80) !== 0;
    this.timerPeriod = NoiseChannel.NOISE_TABLE[data & 0x0F];
  }

  writeLength(data: number): void {
    this.lengthCounter = NoiseChannel.LENGTH_TABLE[(data >> 3) & 0x1F];
    this.envelopeStart = true;
  }

  clockTimer(): void {
    if (this.timer === 0) {
      this.timer = this.timerPeriod;
      const feedback = this.mode ? 
        ((this.shiftRegister & 0x40) >> 6) ^ (this.shiftRegister & 0x01) :
        ((this.shiftRegister & 0x02) >> 1) ^ (this.shiftRegister & 0x01);
      this.shiftRegister = (this.shiftRegister >> 1) | (feedback << 14);
    } else {
      this.timer--;
    }
  }

  clockEnvelope(): void {
    if (this.envelopeStart) {
      this.envelopeStart = false;
      this.envelope = 15;
      this.envelopeVolume = this.envelopePeriod;
    } else if (this.envelopeVolume > 0) {
      this.envelopeVolume--;
    } else {
      this.envelopeVolume = this.envelopePeriod;
      if (this.envelope > 0) {
        this.envelope--;
      } else if (this.lengthCounterHalt) {
        this.envelope = 15;
      }
    }
  }

  clockLengthCounter(): void {
    if (!this.lengthCounterHalt && this.lengthCounter > 0) {
      this.lengthCounter--;
    }
  }

  getOutput(): number {
    if (!this.enabled || this.lengthCounter === 0 || (this.shiftRegister & 0x01) === 1) {
      return 0;
    }
    return this.constantVolume ? this.envelopePeriod : this.envelope;
  }

  setEnabled(enable: boolean): void {
    this.enabled = enable;
    if (!enable) {
      this.lengthCounter = 0;
    }
  }

  getNoiseValue(): number {
    return this.shiftRegister & 0x01;
  }

  setLengthCounter(value: number): void {
    this.lengthCounter = value;
  }

  reset(): void {
    this.enabled = false;
    this.mode = false;
    this.timer = 0;
    this.timerPeriod = 0;
    this.shiftRegister = 1;
    this.lengthCounter = 0;
    this.lengthCounterHalt = false;
    this.envelope = 0;
    this.envelopePeriod = 0;
    this.envelopeVolume = 0;
    this.envelopeStart = false;
    this.constantVolume = false;
  }

  saveState(): Uint8Array {
    const state = new Uint8Array(12);
    state[0] = this.enabled ? 1 : 0;
    state[1] = this.mode ? 1 : 0;
    state[2] = this.timer & 0xFF;
    state[3] = (this.timer >> 8) & 0xFF;
    state[4] = this.timerPeriod & 0xFF;
    state[5] = (this.timerPeriod >> 8) & 0xFF;
    state[6] = this.shiftRegister & 0xFF;
    state[7] = (this.shiftRegister >> 8) & 0xFF;
    state[8] = this.lengthCounter;
    state[9] = this.lengthCounterHalt ? 1 : 0;
    state[10] = this.envelope | (this.envelopeVolume << 4) | (this.envelopeStart ? 0x80 : 0) | (this.constantVolume ? 0x40 : 0);
    state[11] = this.envelopePeriod;
    return state;
  }

  loadState(state: Uint8Array): void {
    this.enabled = state[0] !== 0;
    this.mode = state[1] !== 0;
    this.timer = state[2] | (state[3] << 8);
    this.timerPeriod = state[4] | (state[5] << 8);
    this.shiftRegister = state[6] | (state[7] << 8);
    this.lengthCounter = state[8];
    this.lengthCounterHalt = state[9] !== 0;
    this.envelope = state[10] & 0x0F;
    this.envelopeVolume = (state[10] >> 4) & 0x0F;
    this.envelopeStart = (state[10] & 0x80) !== 0;
    this.constantVolume = (state[10] & 0x40) !== 0;
    this.envelopePeriod = state[11];
  }
}
