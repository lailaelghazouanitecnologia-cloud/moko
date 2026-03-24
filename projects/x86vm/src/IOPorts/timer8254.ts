import { EventEmitter } from '../utils';

interface TimerCounter {
  count: number;
  latch: number;
  mode: number;
  bcd: boolean;
  readWriteMode: number;
  enabled: boolean;
  gate: boolean;
  output: boolean;
  interruptPending: boolean;
  reloadValue: number;
}

export class Timer8254 extends EventEmitter {
  private counters: TimerCounter[];
  private controlWord: number;
  private latchMode: boolean;

  constructor() {
    super();
    this.counters = [
      {
        count: 0,
        latch: 0,
        mode: 0,
        bcd: false,
        readWriteMode: 0,
        enabled: false,
        gate: true,
        output: true,
        interruptPending: false,
        reloadValue: 0
      },
      {
        count: 0,
        latch: 0,
        mode: 0,
        bcd: false,
        readWriteMode: 0,
        enabled: false,
        gate: true,
        output: true,
        interruptPending: false,
        reloadValue: 0
      },
      {
        count: 0,
        latch: 0,
        mode: 0,
        bcd: false,
        readWriteMode: 0,
        enabled: false,
        gate: true,
        output: true,
        interruptPending: false,
        reloadValue: 0
      }
    ];
    this.controlWord = 0;
    this.latchMode = false;
  }

  readCounter(counter: number): number {
    if (counter < 0 || counter > 2) {
      throw new Error(`Invalid counter index: ${counter}`);
    }
    
    const ctr = this.counters[counter];
    if (this.latchMode) {
      return ctr.latch & 0xFF;
    }
    
    return ctr.count & 0xFF;
  }

  writeCounter(counter: number, value: number): void {
    if (counter < 0 || counter > 2) {
      throw new Error(`Invalid counter index: ${counter}`);
    }
    
    const ctr = this.counters[counter];
    value &= 0xFF;
    
    switch (ctr.readWriteMode) {
      case 0: // Latch count value command
        break;
      case 1: // Read/write low byte only
        ctr.reloadValue = value;
        ctr.count = value;
        ctr.enabled = true;
        break;
      case 2: // Read/write high byte only
        ctr.reloadValue = value << 8;
        ctr.count = value << 8;
        ctr.enabled = true;
        break;
      case 3: // Read/write low byte first, then high byte
        if (ctr.reloadValue & 0xFF00) {
          ctr.reloadValue = (ctr.reloadValue & 0xFF00) | value;
          ctr.count = ctr.reloadValue;
          ctr.enabled = true;
          ctr.reloadValue = 0;
        } else {
          ctr.reloadValue = value;
        }
        break;
    }
  }

  writeControl(value: number): void {
    this.controlWord = value;
    
    const counterIndex = (value >> 6) & 0x03;
    if (counterIndex === 3) {
      // Read back command
      const readBackCounters = value & 0x0F;
      for (let i = 0; i < 3; i++) {
        if (readBackCounters & (1 << i)) {
          this.latchCounter(i);
        }
      }
      return;
    }
    
    if (counterIndex < 3) {
      const counter = this.counters[counterIndex];
      counter.readWriteMode = (value >> 4) & 0x03;
      counter.mode = (value >> 1) & 0x07;
      counter.bcd = (value & 0x01) !== 0;
      
      if (counter.readWriteMode === 0) {
        // Latch count value command
        this.latchCounter(counterIndex);
      }
    }
  }

  getCounterMode(counter: number): number {
    if (counter < 0 || counter > 2) {
      throw new Error(`Invalid counter index: ${counter}`);
    }
    return this.counters[counter].mode;
  }

  setCounterMode(counter: number, mode: number): void {
    if (counter < 0 || counter > 2) {
      throw new Error(`Invalid counter index: ${counter}`);
    }
    this.counters[counter].mode = mode & 0x07;
  }

  latchCounter(counter: number): void {
    if (counter < 0 || counter > 2) {
      throw new Error(`Invalid counter index: ${counter}`);
    }
    this.counters[counter].latch = this.counters[counter].count;
  }

  readStatus(counter: number): number {
    if (counter < 0 || counter > 2) {
      throw new Error(`Invalid counter index: ${counter}`);
    }
    
    const ctr = this.counters[counter];
    let status = 0;
    
    if (ctr.output) status |= 0x80;
    if (ctr.count === 0) status |= 0x40;
    status |= (ctr.readWriteMode << 4);
    status |= (ctr.mode << 1);
    if (ctr.bcd) status |= 0x01;
    
    return status;
  }

  generateInterrupt(counter: number): void {
    if (counter < 0 || counter > 2) {
      throw new Error(`Invalid counter index: ${counter}`);
    }
    
    this.counters[counter].interruptPending = true;
    this.emit('interrupt', counter);
  }

  updateCount(counter: number, cycles: number): void {
    if (counter < 0 || counter > 2) {
      throw new Error(`Invalid counter index: ${counter}`);
    }
    
    const ctr = this.counters[counter];
    if (!ctr.enabled || !ctr.gate) return;
    
    for (let i = 0; i < cycles; i++) {
      if (ctr.count > 0) {
        ctr.count--;
        
        if (ctr.count === 0) {
          switch (ctr.mode) {
            case 0: // Interrupt on terminal count
              ctr.output = true;
              this.generateInterrupt(counter);
              break;
            case 1: // Hardware retriggerable one-shot
              ctr.output = false;
              break;
            case 2: // Rate generator
              ctr.output = false;
              ctr.count = ctr.reloadValue;
              break;
            case 3: // Square wave mode
              ctr.output = !ctr.output;
              ctr.count = ctr.reloadValue;
              break;
            case 4: // Software triggered strobe
              ctr.output = false;
              break;
            case 5: // Hardware triggered strobe
              ctr.output = false;
              break;
          }
        }
      }
    }
  }

  isCounterEnabled(counter: number): boolean {
    if (counter < 0 || counter > 2) {
      throw new Error(`Invalid counter index: ${counter}`);
    }
    return this.counters[counter].enabled;
  }

  getOutput(counter: number): boolean {
    if (counter < 0 || counter > 2) {
      throw new Error(`Invalid counter index: ${counter}`);
    }
    return this.counters[counter].output;
  }

  setGate(counter: number, gate: boolean): void {
    if (counter < 0 || counter > 2) {
      throw new Error(`Invalid counter index: ${counter}`);
    }
    
    const ctr = this.counters[counter];
    const oldGate = ctr.gate;
    ctr.gate = gate;
    
    // Handle gate transitions for modes that care
    if (!oldGate && gate && (ctr.mode === 1 || ctr.mode === 5)) {
      // Retrigger one-shot or hardware triggered strobe
      ctr.count = ctr.reloadValue;
      ctr.enabled = true;
    }
  }

  reset(): void {
    for (let i = 0; i < 3; i++) {
      const ctr = this.counters[i];
      ctr.count = 0;
      ctr.latch = 0;
      ctr.mode = 0;
      ctr.bcd = false;
      ctr.readWriteMode = 0;
      ctr.enabled = false;
      ctr.gate = true;
      ctr.output = true;
      ctr.interruptPending = false;
      ctr.reloadValue = 0;
    }
    this.controlWord = 0;
    this.latchMode = false;
  }

  getFrequency(counter: number): number {
    if (counter < 0 || counter > 2) {
      throw new Error(`Invalid counter index: ${counter}`);
    }
    
    const ctr = this.counters[counter];
    if (ctr.reloadValue === 0) return 0;
    
    // Assuming 1.193182 MHz input frequency
    const inputFreq = 1193182;
    return inputFreq / ctr.reloadValue;
  }

  readBack(counters: number): number {
    let result = 0;
    
    for (let i = 0; i < 3; i++) {
      if (counters & (1 << i)) {
        const status = this.readStatus(i);
        result |= (status << (i * 8));
      }
    }
    
    return result;
  }
}
