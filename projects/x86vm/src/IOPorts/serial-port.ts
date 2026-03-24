import { EventEmitter } from 'events';

export class SerialPort extends EventEmitter {
  private divisor: number = 0;
  private interruptEnable: number = 0;
  private fifoControl: number = 0;
  private lineControl: number = 0;
  private modemControl: number = 0;
  private lineStatus: number = 0x60;
  private modemStatus: number = 0x30;
  private rxBuffer: number[] = [];
  private txBuffer: number[] = [];

  constructor() {
    super();
  }

  readData(): number {
    if (this.rxBuffer.length === 0) {
      return 0;
    }
    const data = this.rxBuffer.shift()!;
    this.updateLineStatus();
    return data;
  }

  writeData(value: number): void {
    this.txBuffer.push(value & 0xFF);
    this.lineStatus |= 0x20;
    this.emit('transmit', value);
  }

  readInterruptEnable(): number {
    return this.interruptEnable;
  }

  writeInterruptEnable(value: number): void {
    this.interruptEnable = value & 0x0F;
    this.checkInterrupts();
  }

  readDivisorLatch(msb: boolean): number {
    if (msb) {
      return (this.divisor >> 8) & 0xFF;
    } else {
      return this.divisor & 0xFF;
    }
  }

  writeDivisorLatch(msb: boolean, value: number): void {
    if (msb) {
      this.divisor = (this.divisor & 0x00FF) | ((value & 0xFF) << 8);
    } else {
      this.divisor = (this.divisor & 0xFF00) | (value & 0xFF);
    }
  }

  readLineStatus(): number {
    return this.lineStatus;
  }

  readModemStatus(): number {
    return this.modemStatus;
  }

  writeModemControl(value: number): void {
    this.modemControl = value & 0x1F;
    if (value & 0x10) {
      this.modemStatus |= 0x80;
    } else {
      this.modemStatus &= ~0x80;
    }
  }

  setBaudRate(rate: number): void {
    const baseClock = 115200;
    this.divisor = Math.round(baseClock / rate);
  }

  getBaudRate(): number {
    if (this.divisor === 0) {
      return 0;
    }
    return 115200 / this.divisor;
  }

  hasData(): boolean {
    return this.rxBuffer.length > 0;
  }

  addReceivedData(data: number): void {
    this.rxBuffer.push(data & 0xFF);
    this.updateLineStatus();
    if (this.interruptEnable & 0x01) {
      this.emit('interrupt');
    }
  }

  getTransmitData(): number | undefined {
    if (this.txBuffer.length === 0) {
      return undefined;
    }
    const data = this.txBuffer.shift();
    this.updateLineStatus();
    return data;
  }

  setBreak(enable: boolean): void {
    if (enable) {
      this.lineStatus |= 0x10;
    } else {
      this.lineStatus &= ~0x10;
    }
  }

  reset(): void {
    this.divisor = 0;
    this.interruptEnable = 0;
    this.fifoControl = 0;
    this.lineControl = 0;
    this.modemControl = 0;
    this.lineStatus = 0x60;
    this.modemStatus = 0x30;
    this.rxBuffer = [];
    this.txBuffer = [];
  }

  private updateLineStatus(): void {
    this.lineStatus &= ~0x01;
    if (this.rxBuffer.length > 0) {
      this.lineStatus |= 0x01;
    }
    
    this.lineStatus &= ~0x20;
    if (this.txBuffer.length === 0) {
      this.lineStatus |= 0x20;
    }
  }

  private checkInterrupts(): void {
    if (this.interruptEnable & 0x01 && this.rxBuffer.length > 0) {
      this.emit('interrupt');
    }
  }
}
