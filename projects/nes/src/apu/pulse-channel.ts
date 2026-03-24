import { APU2A03 } from './apu2-a03';

const DUTY_TABLE = [
  [0, 1, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 0],
  [1, 0, 0, 1, 1, 1, 1, 1]
];

const LENGTH_TABLE = [
  10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14,
  12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30
];

export class PulseChannel {
  private enabled: boolean = false;
  private channel: number;
  private timer: number = 0;
  private timerPeriod: number = 0;
  private duty: number = 0;
  private dutyCycle: number = 0;
  private lengthCounter: number = 0;
  private lengthCounterHalt: boolean = false;
  private envelope: number = 0;
  private envelopePeriod: number = 0;
  private envelopeVolume: number = 0;
  private envelopeStart: boolean = false;
  private constantVolume: boolean = false;
  private sweepReload: boolean = false;
  private sweepEnabled: boolean = false;
  private sweepPeriod: number = 0;
  private sweepNegate: boolean = false;
  private sweepShift: number = 0;
  private sweepTimer: number = 0;
  private sequencer: number = 0;

  constructor(channel: number) {
    this.channel = channel;
  }

  writeControl(data: number): void {
    this.duty = (data >> 6) & 0x03;
    this.lengthCounterHalt = (data & 0x20) !== 0;
    this.constantVolume = (data & 0x10) !== 0;
    this.envelopePeriod = data & 0x0F;
    this.envelopeVolume = this.envelopePeriod;
    this.envelopeStart = true;
  }

  writeSweep(data: number): void {
    this.sweepEnabled = (data & 0x80) !== 0;
    this.sweepPeriod = ((data >> 4) & 0x07);
    this.sweepNegate = (data & 0x08) !== 0;
    this.sweepShift = data & 0x07;
    this.sweepReload = true;
  }

  writeTimerLow(data: number): void {
    this.timerPeriod = (this.timerPeriod & 0xFF00) | data;
  }

  writeLength(data: number): void {
    this.dutyCycle = 0;
    this.timerPeriod = (this.timerPeriod & 0x00FF) | ((data & 0x07) << 8);
    if (this.enabled) {
      this.lengthCounter = LENGTH_TABLE[(data >> 3) & 0x1F];
    }
    this.envelopeStart = true;
  }

  clockTimer(): void {
    if (this.timer === 0) {
      this.timer = this.timerPeriod + 1;
      this.dutyCycle = (this.dutyCycle + 1) & 0x07;
    } else {
      this.timer--;
    }
  }

  clockEnvelope(): void {
    if (this.envelopeStart) {
      this.envelopeVolume = 15;
      this.envelopeStart = false;
      this.envelope = this.envelopePeriod;
    } else if (this.envelope > 0) {
      this.envelope--;
    } else {
      if (this.envelopeVolume > 0) {
        this.envelopeVolume--;
      } else if (this.lengthCounterHalt) {
        this.envelopeVolume = 15;
      }
      this.envelope = this.envelopePeriod;
    }
  }

  clockSweep(): void {
    if (this.sweepReload) {
      if (this.sweepEnabled && this.sweepTimer === 0) {
        this.sweepTimer = this.sweepPeriod;
      }
      this.sweepReload = false;
    } else if (this.sweepTimer > 0) {
      this.sweepTimer--;
    } else {
      if (this.sweepEnabled) {
        const change = this.updateSweep();
        if (this.sweepNegate) {
          this.timerPeriod -= change;
          if (this.channel === 1) {
            this.timerPeriod--;
          }
        } else {
          this.timerPeriod += change;
        }
      }
      this.sweepTimer = this.sweepPeriod;
    }
  }

  clockLengthCounter(): void {
    if (!this.lengthCounterHalt && this.lengthCounter > 0) {
      this.lengthCounter--;
    }
  }

  getOutput(): number {
    if (!this.enabled) return 0;
    if (this.lengthCounter === 0) return 0;
    if (this.timerPeriod < 8 || this.timerPeriod > 0x7FF) return 0;

    const volume = this.constantVolume ? this.envelopePeriod : this.envelopeVolume;
    const dutyValue = this.getDutyValue();
    return dutyValue * volume;
  }

  setEnabled(enable: boolean): void {
    this.enabled = enable;
    if (!enable) {
      this.lengthCounter = 0;
    }
  }

  updateSweep(): number {
    const change = this.timerPeriod >> this.sweepShift;
    const target = this.timerPeriod - change;
    if (this.sweepNegate && this.channel === 1) {
      return change + 1;
    }
    return change;
  }

  reloadSweep(): void {
    this.sweepTimer = this.sweepPeriod;
  }

  getDutyValue(): number {
    return DUTY_TABLE[this.duty][this.dutyCycle];
  }

  setLengthCounter(value: number): void {
    this.lengthCounter = value;
  }

  reset(): void {
    this.enabled = false;
    this.timer = 0;
    this.timerPeriod = 0;
    this.duty = 0;
    this.dutyCycle = 0;
    this.lengthCounter = 0;
    this.lengthCounterHalt = false;
    this.envelope = 0;
    this.envelopePeriod = 0;
    this.envelopeVolume = 0;
    this.envelopeStart = false;
    this.constantVolume = false;
    this.sweepReload = false;
    this.sweepEnabled = false;
    this.sweepPeriod = 0;
    this.sweepNegate = false;
    this.sweepShift = 0;
    this.sweepTimer = 0;
    this.sequencer = 0;
  }

  saveState(): Uint8Array {
    const state = new Uint8Array(20);
    state[0] = this.enabled ? 1 : 0;
    state[1] = this.timer & 0xFF;
    state[2] = (this.timer >> 8) & 0xFF;
    state[3] = this.timerPeriod & 0xFF;
    state[4] = (this.timerPeriod >> 8) & 0xFF;
    state[5] = this.duty;
    state[6] = this.dutyCycle;
    state[7] = this.lengthCounter;
    state[8] = this.lengthCounterHalt ? 1 : 0;
    state[9] = this.envelope;
    state[10] = this.envelopePeriod;
    state[11] = this.envelopeVolume;
    state[12] = this.envelopeStart ? 1 : 0;
    state[13] = this.constantVolume ? 1 : 0;
    state[14] = this.sweepReload ? 1 : 0;
    state[15] = this.sweepEnabled ? 1 : 0;
    state[16] = this.sweepPeriod;
    state[17] = this.sweepNegate ? 1 : 0;
    state[18] = this.sweepShift;
    state[19] = this.sweepTimer;
    return state;
  }

  loadState(state: Uint8Array): void {
    this.enabled = state[0] !== 0;
    this.timer = state[1] | (state[2] << 8);
    this.timerPeriod = state[3] | (state[4] << 8);
    this.duty = state[5];
    this.dutyCycle = state[6];
    this.lengthCounter = state[7];
    this.lengthCounterHalt = state[8] !== 0;
    this.envelope = state[9];
    this.envelopePeriod = state[10];
    this.envelopeVolume = state[11];
    this.envelopeStart = state[12] !== 0;
    this.constantVolume = state[13] !== 0;
    this.sweepReload = state[14] !== 0;
    this.sweepEnabled = state[15] !== 0;
    this.sweepPeriod = state[16];
    this.sweepNegate = state[17] !== 0;
    this.sweepShift = state[18];
    this.sweepTimer = state[19];
  }
}
