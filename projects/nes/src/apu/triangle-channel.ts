import { APU2A03 } from './apu2-a03';

export class TriangleChannel {
  private enabled: boolean = false;
  private timer: number = 0;
  private timerPeriod: number = 0;
  private linearCounter: number = 0;
  private linearCounterPeriod: number = 0;
  private linearCounterReload: boolean = false;
  private linearCounterControl: boolean = false;
  private lengthCounter: number = 0;
  private sequencer: number = 0;
  private halt: boolean = false;

  private static readonly TRIANGLE_SEQUENCE: number[] = [
    15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
  ];

  private static readonly LENGTH_TABLE: number[] = [
    10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14,
    12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30
  ];

  writeControl(data: number): void {
    this.linearCounterControl = (data & 0x80) !== 0;
    this.halt = this.linearCounterControl;
    this.linearCounterPeriod = data & 0x7F;
  }

  writeTimerLow(data: number): void {
    this.timerPeriod = (this.timerPeriod & 0xFF00) | data;
  }

  writeLength(data: number): void {
    this.lengthCounter = TriangleChannel.LENGTH_TABLE[(data >> 3) & 0x1F];
    this.linearCounterReload = true;
    this.timerPeriod = (this.timerPeriod & 0x00FF) | ((data & 0x07) << 8);
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

  clockLinearCounter(): void {
    if (this.linearCounterReload) {
      this.linearCounter = this.linearCounterPeriod;
    } else if (this.linearCounter > 0) {
      this.linearCounter--;
    }

    if (!this.linearCounterControl) {
      this.linearCounterReload = false;
    }
  }

  clockLengthCounter(): void {
    if (!this.halt && this.lengthCounter > 0) {
      this.lengthCounter--;
    }
  }

  getOutput(): number {
    if (!this.enabled) return 0;
    if (this.lengthCounter === 0) return 0;
    if (this.linearCounter === 0) return 0;
    return this.getTriangleValue();
  }

  setEnabled(enable: boolean): void {
    this.enabled = enable;
    if (!enable) {
      this.lengthCounter = 0;
    }
  }

  getTriangleValue(): number {
    return TriangleChannel.TRIANGLE_SEQUENCE[this.sequencer];
  }

  reloadLinearCounter(): void {
    this.linearCounterReload = true;
  }

  setLengthCounter(value: number): void {
    this.lengthCounter = value;
  }

  reset(): void {
    this.enabled = false;
    this.timer = 0;
    this.timerPeriod = 0;
    this.linearCounter = 0;
    this.linearCounterPeriod = 0;
    this.linearCounterReload = false;
    this.linearCounterControl = false;
    this.lengthCounter = 0;
    this.sequencer = 0;
    this.halt = false;
  }

  saveState(): Uint8Array {
    const state = new Uint8Array(11);
    state[0] = this.enabled ? 1 : 0;
    state[1] = this.timer & 0xFF;
    state[2] = (this.timer >> 8) & 0xFF;
    state[3] = this.timerPeriod & 0xFF;
    state[4] = (this.timerPeriod >> 8) & 0xFF;
    state[5] = this.linearCounter;
    state[6] = this.linearCounterPeriod;
    state[7] = this.linearCounterReload ? 1 : 0;
    state[8] = this.linearCounterControl ? 1 : 0;
    state[9] = this.lengthCounter;
    state[10] = this.sequencer;
    return state;
  }

  loadState(state: Uint8Array): void {
    this.enabled = state[0] !== 0;
    this.timer = state[1] | (state[2] << 8);
    this.timerPeriod = state[3] | (state[4] << 8);
    this.linearCounter = state[5];
    this.linearCounterPeriod = state[6];
    this.linearCounterReload = state[7] !== 0;
    this.linearCounterControl = state[8] !== 0;
    this.lengthCounter = state[9];
    this.sequencer = state[10];
  }
}
