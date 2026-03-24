import { EventEmitter } from 'events';
import { CPUCore } from './cpu-core';

interface InterruptDescriptor {
  offset: number;
  segment: number;
  gateType: 'interrupt' | 'trap' | 'task';
  privilegeLevel: number;
  present: boolean;
}

interface PIC8259 {
  requestInterrupt(vector: number): void;
  acknowledgeInterrupt(): number;
  endOfInterrupt(vector: number): void;
  getIRR(): number;
  getISR(): number;
  getIMR(): number;
  maskInterrupt(vector: number): void;
  unmaskInterrupt(vector: number): void;
  initialize(base: number): void;
}

interface IOAPIC {
  redirectIRQ(irq: number, vector: number): void;
  maskIRQ(irq: number): void;
  unmaskIRQ(irq: number): void;
  getIRR(): number;
}

export class InterruptController extends EventEmitter {
  private picMaster: PIC8259;
  private picSlave: PIC8259;
  private ioAPIC: IOAPIC;
  private pendingIRQS: number[];
  private interruptVectorTable: InterruptDescriptor[];
  private interruptFlag: boolean;

  constructor() {
    super();
    this.pendingIRQS = [];
    this.interruptVectorTable = new Array(256);
    this.interruptFlag = false;
    
    // Initialize PICs
    this.picMaster = {
      requestInterrupt: (vector: number) => {},
      acknowledgeInterrupt: () => 0,
      endOfInterrupt: (vector: number) => {},
      getIRR: () => 0,
      getISR: () => 0,
      getIMR: () => 0,
      maskInterrupt: (vector: number) => {},
      unmaskInterrupt: (vector: number) => {},
      initialize: (base: number) => {}
    };
    
    this.picSlave = {
      requestInterrupt: (vector: number) => {},
      acknowledgeInterrupt: () => 0,
      endOfInterrupt: (vector: number) => {},
      getIRR: () => 0,
      getISR: () => 0,
      getIMR: () => 0,
      maskInterrupt: (vector: number) => {},
      unmaskInterrupt: (vector: number) => {},
      initialize: (base: number) => {}
    };
    
    this.ioAPIC = {
      redirectIRQ: (irq: number, vector: number) => {},
      maskIRQ: (irq: number) => {},
      unmaskIRQ: (irq: number) => {},
      getIRR: () => 0
    };
    
    // Initialize vector table with default descriptors
    for (let i = 0; i < 256; i++) {
      this.interruptVectorTable[i] = {
        offset: 0,
        segment: 0,
        gateType: 'interrupt',
        privilegeLevel: 0,
        present: false
      };
    }
  }

  requestInterrupt(vector: number): void {
    if (vector < 0 || vector > 255) {
      return;
    }
    
    if (!this.pendingIRQS.includes(vector)) {
      this.pendingIRQS.push(vector);
      this.pendingIRQS.sort((a, b) => a - b);
    }
    
    if (vector < 8) {
      this.picMaster.requestInterrupt(vector);
    } else if (vector < 16) {
      this.picSlave.requestInterrupt(vector - 8);
    } else {
      this.ioAPIC.redirectIRQ(vector - 16, vector);
    }
  }

  acknowledgeInterrupt(): number {
    if (this.pendingIRQS.length === 0) {
      return -1;
    }
    
    const vector = this.pendingIRQS.shift()!;
    
    if (vector < 8) {
      this.picMaster.acknowledgeInterrupt();
    } else if (vector < 16) {
      this.picSlave.acknowledgeInterrupt();
    }
    
    return vector;
  }

  endOfInterrupt(vector: number): void {
    if (vector < 8) {
      this.picMaster.endOfInterrupt(vector);
    } else if (vector < 16) {
      this.picSlave.endOfInterrupt(vector - 8);
    }
  }

  raiseException(vector: number, errorCode?: number): void {
    if (vector < 0 || vector > 31) {
      return;
    }
    
    this.requestInterrupt(vector);
    
    if (errorCode !== undefined) {
      this.emit('exception', vector, errorCode);
    } else {
      this.emit('exception', vector);
    }
  }

  handleNMI(): void {
    this.requestInterrupt(2);
    this.emit('nmi');
  }

  checkInterrupts(): boolean {
    return this.interruptFlag && this.pendingIRQS.length > 0;
  }

  canServiceInterrupt(vector: number): boolean {
    if (!this.interruptFlag) {
      return false;
    }
    
    const descriptor = this.interruptVectorTable[vector];
    if (!descriptor.present) {
      return false;
    }
    
    return true;
  }

  getInterruptDescriptor(vector: number): InterruptDescriptor {
    if (vector < 0 || vector > 255) {
      throw new Error('Invalid interrupt vector');
    }
    
    return { ...this.interruptVectorTable[vector] };
  }

  setInterruptDescriptor(vector: number, descriptor: InterruptDescriptor): void {
    if (vector < 0 || vector > 255) {
      throw new Error('Invalid interrupt vector');
    }
    
    this.interruptVectorTable[vector] = { ...descriptor };
  }

  initializePIC(baseMaster: number, baseSlave: number): void {
    this.picMaster.initialize(baseMaster);
    this.picSlave.initialize(baseSlave);
  }

  maskInterrupt(vector: number): void {
    if (vector < 0 || vector > 255) {
      return;
    }
    
    if (vector < 8) {
      this.picMaster.maskInterrupt(vector);
    } else if (vector < 16) {
      this.picSlave.maskInterrupt(vector - 8);
    } else {
      this.ioAPIC.maskIRQ(vector - 16);
    }
  }

  unmaskInterrupt(vector: number): void {
    if (vector < 0 || vector > 255) {
      return;
    }
    
    if (vector < 8) {
      this.picMaster.unmaskInterrupt(vector);
    } else if (vector < 16) {
      this.picSlave.unmaskInterrupt(vector - 8);
    } else {
      this.ioAPIC.unmaskIRQ(vector - 16);
    }
  }

  getIRR(): number {
    const masterIRR = this.picMaster.getIRR();
    const slaveIRR = this.picSlave.getIRR();
    return masterIRR | (slaveIRR << 8);
  }

  getISR(): number {
    const masterISR = this.picMaster.getISR();
    const slaveISR = this.picSlave.getISR();
    return masterISR | (slaveISR << 8);
  }

  getIMR(): number {
    const masterIMR = this.picMaster.getIMR();
    const slaveIMR = this.picSlave.getIMR();
    return masterIMR | (slaveIMR << 8);
  }
}
