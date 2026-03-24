export class PulseChannel {
  private enabled: boolean = false;
  private channel: boolean = false;
  private lengthCounter: number = 0;
  private lengthCounterHalt: boolean = false;
  private envelope: number = 0;
  private envelopePeriod: number = 0;
  private envelopeVolume: number = 0;
  private envelopeStart: boolean = false;
  private constantVolume: boolean = false;
  private timer: number = 0;
  private timerPeriod: number = 0;
  private duty: number = 0;
  private dutyCycle: number = 0;
  private sweep: number = 0;
  private sweepPeriod: number = 0;
  private sweepNegate: boolean = false;
  private sweepShift: number = 0;
  private sweepReload: boolean = false;
  private sweepMute: boolean = false;
  private sequencer: number = 0;

  constructor(channel: boolean) {
    this.channel = channel;
    this.reset();
  }

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
    this.duty = 0;
    this.dutyCycle = 0;
    this.sweep = 0;
    this.sweepPeriod = 0;
    this.sweepNegate = false;
    this.sweepShift = 0;
    this.sweepReload = false;
    this.sweepMute = false;
    this.sequencer = 0;
  }

  writeControl(value: number): void {
    this.duty = (value >> 6) & 0x03;
    this.lengthCounterHalt = !!(value & 0x20);
    this.constantVolume = !!(value & 0x10);
    this.envelopePeriod = value & 0x0F;
    this.envelopeVolume = this.envelopePeriod;
    this.envelopeStart = true;
  }

  writeSweep(value: number): void {
    this.sweepPeriod = (value >> 4) & 0x07;
    this.sweepNegate = !!(value & 0x08);
    this.sweepShift = value & 0x07;
    this.sweepReload = true;
  }

  writeTimerLow(value: number): void {
    this.timerPeriod = (this.timerPeriod & 0xFF00) | value;
  }

  writeTimerHigh(value: number): void {
    const lengthTable = [
      10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14,
      12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30
    ];
    this.lengthCounter = lengthTable[(value >> 3) & 0x1F];
    this.timerPeriod = (this.timerPeriod & 0x00FF) | ((value & 0x07) << 8);
    this.sequencer = 0;
    this.envelopeStart = true;
  }

  clockTimer(): void {
    if (this.timer === 0) {
      this.timer = this.timerPeriod;
      this.sequencer = (this.sequencer + 1) & 0x07;
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

  clockSweep(): void {
    if (this.sweepReload) {
      this.sweepReload = false;
      this.sweep = this.sweepPeriod;
    } else if (this.sweep > 0) {
      this.sweep--;
    } else {
      this.sweep = this.sweepPeriod;
      if (this.sweepPeriod > 0 && !this.sweepMute) {
        const delta = this.timerPeriod >> this.sweepShift;
        if (this.sweepNegate) {
          this.timerPeriod -= delta;
          if (this.channel) {
            this.timerPeriod--;
          }
        } else {
          this.timerPeriod += delta;
        }
      }
    }
    this.updateSweep();
  }

  getVolume(): number {
    if (this.constantVolume) {
      return this.envelopePeriod;
    } else {
      return this.envelope;
    }
  }

  getOutput(): number {
    if (!this.enabled || this.lengthCounter === 0 || this.timerPeriod < 8 || this.timerPeriod > 0x7FF || this.sweepMute) {
      return 0;
    }
    const dutyTable = [
      [0, 1, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 0, 0, 0],
      [1, 0, 0, 1, 1, 1, 1, 1]
    ];
    const dutyValue = dutyTable[this.duty][this.sequencer];
    return dutyValue * this.getVolume();
  }

  setEnabled(enable: boolean): void {
    this.enabled = enable;
    if (!enable) {
      this.lengthCounter = 0;
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.lengthCounter > 0;
  }

  updateSweep(): void {
    const targetPeriod = this.timerPeriod + ((this.timerPeriod >> this.sweepShift) * (this.sweepNegate ? -1 : 1));
    this.sweepMute = targetPeriod > 0x7FF || this.timerPeriod < 8;
  }

  reloadSweep(): void {
    this.sweepReload = true;
  }

  getDutyValue(): number {
    const dutyTable = [
      [0, 1, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 0, 0, 0],
      [1, 0, 0, 1, 1, 1, 1, 1]
    ];
    return dutyTable[this.duty][this.sequencer];
  }

  getSequencer(): number {
    return this.sequencer;
  }
}
