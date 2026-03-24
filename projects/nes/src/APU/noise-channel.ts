export class NoiseChannel {
  private enabled: boolean = false;
  private lengthCounter: number = 0;
  private lengthCounterHalt: boolean = false;
  private envelope: number = 0;
  private envelopePeriod: number = 0;
  private envelopeVolume: number = 0;
  private envelopeStart: boolean = false;
  private constantVolume: boolean = false;
  private timer: number = 0;
  private timerPeriod: number = 0;
  private mode: boolean = false;
  private shiftRegister: number = 1;

  reset(): void {
    this.enabled = false;
    this.lengthCounter = 0;
    this.lengthCounterHalt = false;
    this.envelope = 0;
    this.envelopePeriod = 0;
    this.envelopeVolume = 0;
    this.envelopeStart = false;
    this.constantVolume = false;
    this.timer = 0;
    this.timerPeriod = 0;
    this.mode = false;
    this.shiftRegister = 1;
  }

  writeControl(value: number): void {
    this.lengthCounterHalt = (value & 0x20) !== 0;
    this.constantVolume = (value & 0x10) !== 0;
    this.envelopePeriod = value & 0x0F;
    this.envelopeVolume = this.envelopePeriod;
    this.envelopeStart = true;
  }

  writePeriod(value: number): void {
    this.mode = (value & 0x80) !== 0;
    this.timerPeriod = this.getTimerPeriod(this.mode, value & 0x0F);
  }

  writeLength(value: number): void {
    if (this.enabled) {
      this.lengthCounter = value & 0x1F;
    }
  }

  clockTimer(): void {
    if (this.timer === 0) {
      this.timer = this.timerPeriod;
      this.shiftLFSR();
    } else {
      this.timer--;
    }
  }

  clockLengthCounter(): void {
    if (!this.lengthCounterHalt && this.lengthCounter > 0) {
      this.lengthCounter--;
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

  getOutput(): number {
    if (!this.enabled || this.lengthCounter === 0) {
      return 0;
    }

    if ((this.shiftRegister & 1) === 1) {
      return 0;
    }

    const volume = this.constantVolume ? this.envelopePeriod : this.envelope;
    return volume / 15;
  }

  setEnabled(enable: boolean): void {
    this.enabled = enable;
    if (!enable) {
      this.lengthCounter = 0;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  shiftLFSR(): void {
    const feedback = (this.shiftRegister & 1) ^ ((this.shiftRegister >> (this.mode ? 6 : 1)) & 1);
    this.shiftRegister = (this.shiftRegister >> 1) | (feedback << 14);
  }

  getTimerPeriod(mode: boolean, period: number): number {
    const noiseTable = [
      4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068
    ];
    return noiseTable[period & 0x0F];
  }
}
