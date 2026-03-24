export class TriangleChannel {
  private enabled: boolean = false;
  private lengthCounter: number = 0;
  private linearCounter: number = 0;
  private linearCounterPeriod: number = 0;
  private linearCounterReload: boolean = false;
  private control: boolean = false;
  private timer: number = 0;
  private timerPeriod: number = 0;
  private sequencer: number = 0;

  private static readonly TRIANGLE_SEQUENCE: number[] = [
    15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
  ];

  reset(): void {
    this.enabled = false;
    this.lengthCounter = 0;
    this.linearCounter = 0;
    this.linearCounterPeriod = 0;
    this.linearCounterReload = false;
    this.control = false;
    this.timer = 0;
    this.timerPeriod = 0;
    this.sequencer = 0;
  }

  writeControl(value: number): void {
    this.control = (value & 0x80) !== 0;
    this.linearCounterPeriod = value & 0x7F;
    this.lengthCounterHalt = this.control;
  }

  writeTimerLow(value: number): void {
    this.timerPeriod = (this.timerPeriod & 0xFF00) | value;
  }

  writeTimerHigh(value: number): void {
    this.lengthCounter = this.getLengthCounterValue(value >> 3);
    this.timerPeriod = (this.timerPeriod & 0x00FF) | ((value & 0x07) << 8);
    this.linearCounterReload = true;
  }

  clockTimer(): void {
    if (this.timer === 0) {
      this.timer = this.timerPeriod;
      if (this.lengthCounter > 0 && this.linearCounter > 0) {
        this.sequencer = (this.sequencer + 1) & 31;
      }
    } else {
      this.timer--;
    }
  }

  clockLengthCounter(): void {
    if (!this.lengthCounterHalt && this.lengthCounter > 0) {
      this.lengthCounter--;
    }
  }

  clockLinearCounter(): void {
    if (this.linearCounterReload) {
      this.linearCounter = this.linearCounterPeriod;
    } else if (this.linearCounter > 0) {
      this.linearCounter--;
    }

    if (!this.control) {
      this.linearCounterReload = false;
    }
  }

  getOutput(): number {
    if (!this.enabled || this.lengthCounter === 0 || this.linearCounter === 0) {
      return 0;
    }
    return TriangleChannel.TRIANGLE_SEQUENCE[this.sequencer];
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

  reloadLinearCounter(): void {
    this.linearCounterReload = true;
  }

  getSequencerValue(): number {
    return this.sequencer;
  }

  private getLengthCounterValue(index: number): number {
    const lengthTable: number[] = [
      10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14,
      12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30
    ];
    return lengthTable[index & 31];
  }

  private lengthCounterHalt: boolean = false;
}
