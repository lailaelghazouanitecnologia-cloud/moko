private picMaster: number = 0x20;
  private picSlave: number = 0xA0;
  private imrMaster: number = 0xFF;
  private imrSlave: number = 0xFF;
  private irrMaster: number = 0;
  private irrSlave: number = 0;
  private isrMaster: number = 0;
  private isrSlave: number = 0;
  private priority: number = 7;
  private autoEOI: boolean = false;
  private specialMask: boolean = false;
  private readRegister: number = 0;
  private devices: IODevice[] = [];

  readPort(port: number, size: number): number {
    if (size !== 1) return 0;
    
    switch (port) {
      case 0x20:
        return this.readRegister === 0 ? this.irrMaster : this.isrMaster;
      case 0x21:
        return this.imrMaster;
      case 0xA0:
        return this.readRegister === 0 ? this.irrSlave : this.isrSlave;
      case 0xA1:
        return this.imrSlave;
      default:
        return 0;
    }
  }

  writePort(port: number, value: number, size: number): void {
    if (size !== 1) return;
    
    switch (port) {
      case 0x20:
        this.handleOCW2(value);
        break;
      case 0x21:
        this.imrMaster = value;
        break;
      case 0xA0:
        this.handleOCW2Slave(value);
        break;
      case 0xA1:
        this.imrSlave = value;
        break;
    }
  }

  handleInterrupt(): boolean {
    const masterPending = this.irrMaster & ~this.imrMaster;
    const slavePending = this.irrSlave & ~this.imrSlave;
    
    if (masterPending === 0 && slavePending === 0) return false;
    
    if (slavePending !== 0 && (masterPending & (1 << 2)) === 0) {
      const irq = this.getHighestPriorityIRQ(slavePending);
      if (irq !== -1) {
        this.isrSlave |= 1 << irq;
        this.irrSlave &= ~(1 << irq);
        return true;
      }
    }
    
    if (masterPending !== 0) {
      const irq = this.getHighestPriorityIRQ(masterPending);
      if (irq !== -1) {
        this.isrMaster |= 1 << irq;
        this.irrMaster &= ~(1 << irq);
        return true;
      }
    }
    
    return false;
  }

  getIRQ(): number {
    const masterPending = this.irrMaster & ~this.imrMaster;
    const slavePending = this.irrSlave & ~this.imrSlave;
    
    if (slavePending !== 0 && (masterPending & (1 << 2)) === 0) {
      const irq = this.getHighestPriorityIRQ(slavePending);
      if (irq !== -1) return irq + 8;
    }
    
    if (masterPending !== 0) {
      const irq = this.getHighestPriorityIRQ(masterPending);
      if (irq !== -1) return irq;
    }
    
    return -1;
  }

  reset(): void {
    this.imrMaster = 0xFF;
    this.imrSlave = 0xFF;
    this.irrMaster = 0;
    this.irrSlave = 0;
    this.isrMaster = 0;
    this.isrSlave = 0;
    this.priority = 7;
    this.autoEOI = false;
    this.specialMask = false;
    this.readRegister = 0;
  }

  private handleOCW2(value: number): void {
    const ocw2 = value & 0xE0;
    const level = value & 0x07;
    
    switch (ocw2) {
      case 0x00:
        break;
      case 0x20:
        if (level === 7) {
          const highest = this.getHighestPriorityInService(this.isrMaster);
          if (highest !== -1) {
            this.isrMaster &= ~(1 << highest);
          }
        } else {
          this.isrMaster &= ~(1 << level);
        }
        break;
      case 0x60:
        this.isrMaster &= ~(1 << level);
        break;
      case 0xA0:
        this.priority = level;
        break;
      case 0xC0:
        this.readRegister = value & 0x01;
        break;
      case 0xE0:
        this.priority = level;
        break;
    }
  }

  private handleOCW2Slave(value: number): void {
    const ocw2 = value & 0xE0;
    const level = value & 0x07;
    
    switch (ocw2) {
      case 0x00:
        break;
      case 0x20:
        if (level === 7) {
          const highest = this.getHighestPriorityInService(this.isrSlave);
          if (highest !== -1) {
            this.isrSlave &= ~(1 << highest);
          }
        } else {
          this.isrSlave &= ~(1 << level);
        }
        break;
      case 0x60:
        this.isrSlave &= ~(1 << level);
        break;
      case 0xA0:
        this.priority = level;
        break;
      case 0xC0:
        this.readRegister = value & 0x01;
        break;
      case 0xE0:
        this.priority = level;
        break;
    }
  }

  private getHighestPriorityIRQ(pending: number): number {
    for (let i = 0; i < 8; i++) {
      const irq = (this.priority + 1 + i) % 8;
      if (pending & (1 << irq)) return irq;
    }
    return -1;
  }

  private getHighestPriorityInService(isr: number): number {
    for (let i = 0; i < 8; i++) {
      const irq = (this.priority + 1 + i) % 8;
      if (isr & (1 << irq)) return irq;
    }
    return -1;
  }

  requestIRQ(irq: number): void {
    if (irq < 0 || irq > 15) return;
    
    if (irq < 8) {
      this.irrMaster |= 1 << irq;
    } else {
      this.irrSlave |= 1 << (irq - 8);
      this.irrMaster |= 1 << 2;
    }
  }

  registerDevice(device: IODevice): void {
    this.devices.push(device);
  }

  getIMR(): number {
    return this.imrMaster;
  }

  getISR(): number {
    return this.isrMaster;
  }

  getIRR(): number {
    return this.irrMaster;
  }
}
