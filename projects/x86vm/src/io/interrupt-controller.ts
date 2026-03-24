private irqStatus: Uint8Array;
  private irqMask: Uint8Array;
  private isMaster: boolean;
  private vectorBase: number;
  private interruptPending: boolean;
  private priority: number;

  constructor(isMaster: boolean = true, vectorBase: number = 0x08) {
    this.isMaster = isMaster;
    this.vectorBase = vectorBase;
    this.interruptPending = false;
    this.priority = 0;
    this.irqStatus = new Uint8Array(8);
    this.irqMask = new Uint8Array(8);
    this.reset();
  }

  requestInterrupt(irq: number): void {
    if (irq < 0 || irq > 7) return;
    this.irqStatus[irq] = 1;
    this.interruptPending = true;
  }

  acknowledgeInterrupt(irq: number): void {
    if (irq < 0 || irq > 7) return;
    this.irqStatus[irq = 0;
  }

  getPendingIRQ(): number | null {
    for (let i = 0; i < 8; i++) {
      const idx = (this.priority + i) % 8;
      if (this.irqStatus[idx] === 1 && this.irqMask[idx] === 0) {
        return idx;
      }
    }
    return null;
  }

  isIRQPending(irq: number): boolean {
    if (irq < 0 || irq > 7) return false;
    return this.irqStatus[irq] === 1;
  }

  setIRQMask(irq: number, masked: boolean): void {
    if (irq < 0 || irq > 7) return;
    this.irqMask[irq] = masked ? 1 : 0;
  }

  isIRQMasked(irq: number): boolean {
    if (irq < 0 || irq > 7) return true;
    return this.irqMask[irq] === 1;
  }

  read(port: number, size: IOSize): number {
    return 0;
  }

  write(port: number, value: number, size: IOSize): void {
  }

  readCommand(port: number): number {
    return 0;
  }

  writeCommand(port: number, value: number): void {
  }

  readData(port: number): number {
    return 0;
  }

  writeData(port: number, value: number): void {
  }

  getInterruptVector(irq: number): number {
    if (irq < 0 || irq > 7) return 0;
    return this.vectorBase + irq;
  }

  isInService(irq: number): boolean {
    return false;
  }

  endOfInterrupt(irq: number): void {
  }

  reset(): void {
    this.irqStatus.fill(0);
    this.irqMask.fill(0);
    this.interruptPending = false;
    this.priority = 0;
  }

  getIRR(): number {
    let irr = 0;
    for (let i = 0; i < 8; i++) {
      if (this.irqStatus[i] === 1) {
        irr |= (1 << i);
      }
    }
    return irr;
  }

  getISR(): number {
    return 0;
  }

  getIMR(): number {
    let imr = 0;
    for (let i = 0; i < 8; i++) {
      if (this.irqMask[i] === 1) {
        imr |= (1 << i);
      }
    }
    return imr;
  }

  getBasePort(): number {
    return 0x20;
  }

  getPortCount(): number {
    return 2;
  }

  getName(): string {
    return this.isMaster ? 'Master PIC' : 'Slave PIC';
  }

  isPortValid(port: number): boolean {
    const base = this.getBasePort();
    return port >= base && port < base + this.getPortCount();
  }

  reset(): void {
    this.irqStatus.fill(0);
    this.irqMask.fill(0);
    this.interruptPending = false;
    this.priority = 0;
  }

  getIRQ(): number | null {
    return null;
  }

  canInterrupt(): boolean {
    return this.interruptPending;
  }

  getInterruptVector(): number {
    return this.vectorBase;
  }
}
