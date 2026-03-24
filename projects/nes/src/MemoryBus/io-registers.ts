import { InterruptType } from '../CPU';

export class IoRegisters {
  private ppuCtrl: number = 0;
  private ppuMask: number = 0;
  private ppuStatus: number = 0;
  private oamAddr: number = 0;
  private ppuScroll: number = 0;
  private ppuAddr: number = 0;
  private ppuData: number = 0;
  private controller1: number = 0;
  private controller2: number = 0;
  private controllerShift1: number = 0;
  private controllerShift2: number = 0;
  private apuPulse1: number = 0;
  private apuPulse2: number = 0;
  private apuTriangle: number = 0;
  private apuNoise: number = 0;
  private apuDMC: number = 0;
  private apuStatus: number = 0;
  private apuFrameCounter: number = 0;
  private dmaPage: number = 0;
  private dmaAddr: number = 0;
  private dmaData: number = 0;
  private dmaDummy: boolean = true;
  private dmaDelay: number = 0;

  readRegister(address: number): number {
    if (address >= 0x2000 && address <= 0x2007) {
      return this.readPPURegister(address);
    } else if (address >= 0x4000 && address <= 0x4017) {
      return this.readAPURegister(address);
    } else if (address === 0x4016) {
      return this.readController(1);
    } else if (address === 0x4017) {
      return this.readController(2);
    }
    return 0;
  }

  writeRegister(address: number, value: number): void {
    if (address >= 0x2000 && address <= 0x2007) {
      this.writePPURegister(address, value);
    } else if (address >= 0x4000 && address <= 0x4017) {
      this.writeAPURegister(address, value);
    } else if (address === 0x4014) {
      this.startDMA(value);
    } else if (address === 0x4016) {
      this.writeController(1, value);
    }
  }

  readPPURegister(address: number): number {
    const reg = address & 0x2007;
    switch (reg) {
      case 0x2002:
        const status = this.ppuStatus;
        this.ppuStatus &= 0x7F;
        return status;
      case 0x2004:
        return 0;
      case 0x2007:
        const data = this.ppuData;
        this.incrementPPUAddr();
        return data;
      default:
        return 0;
    }
  }

  writePPURegister(address: number, value: number): void {
    const reg = address & 0x2007;
    switch (reg) {
      case 0x2000:
        this.ppuCtrl = value;
        break;
      case 0x2001:
        this.ppuMask = value;
        break;
      case 0x2003:
        this.oamAddr = value;
        break;
      case 0x2005:
        this.ppuScroll = value;
        break;
      case 0x2006:
        this.ppuAddr = value;
        break;
      case 0x2007:
        this.ppuData = value;
        this.incrementPPUAddr();
        break;
    }
  }

  readAPURegister(address: number): number {
    if (address === 0x4015) {
      return this.apuStatus;
    }
    return 0;
  }

  writeAPURegister(address: number, value: number): void {
    switch (address) {
      case 0x4000:
      case 0x4001:
      case 0x4002:
      case 0x4003:
        this.apuPulse1 = value;
        break;
      case 0x4004:
      case 0x4005:
      case 0x4006:
      case 0x4007:
        this.apuPulse2 = value;
        break;
      case 0x4008:
      case 0x4009:
      case 0x400A:
      case 0x400B:
        this.apuTriangle = value;
        break;
      case 0x400C:
      case 0x400D:
      case 0x400E:
      case 0x400F:
        this.apuNoise = value;
        break;
      case 0x4010:
      case 0x4011:
      case 0x4012:
      case 0x4013:
        this.apuDMC = value;
        break;
      case 0x4015:
        this.apuStatus = value;
        break;
      case 0x4017:
        this.apuFrameCounter = value;
        break;
    }
  }

  readController(port: number): number {
    let result = 0;
    if (port === 1) {
      result = (this.controllerShift1 & 0x80) > 0 ? 1 : 0;
      this.controllerShift1 <<= 1;
    } else if (port === 2) {
      result = (this.controllerShift2 & 0x80) > 0 ? 1 : 0;
      this.controllerShift2 <<= 1;
    }
    return result | 0x40;
  }

  writeController(port: number, value: number): void {
    if (port === 1 && (value & 0x01) === 0x01) {
      this.controllerShift1 = this.controller1;
      this.controllerShift2 = this.controller2;
    }
  }

  startDMA(page: number): void {
    this.dmaPage = page;
    this.dmaAddr = 0;
    this.dmaDummy = true;
    this.dmaDelay = 0;
  }

  stepDMA(): number {
    if (this.dmaDelay > 0) {
      this.dmaDelay--;
      return 1;
    }
    if (this.dmaAddr < 256) {
      if (this.dmaDummy) {
        this.dmaDummy = false;
        return 1;
      }
      this.dmaAddr++;
      return 1;
    }
    return 0;
  }

  isDMAActive(): boolean {
    return this.dmaAddr < 256;
  }

  reset(): void {
    this.ppuCtrl = 0;
    this.ppuMask = 0;
    this.ppuStatus = 0;
    this.oamAddr = 0;
    this.ppuScroll = 0;
    this.ppuAddr = 0;
    this.ppuData = 0;
    this.controller1 = 0;
    this.controller2 = 0;
    this.controllerShift1 = 0;
    this.controllerShift2 = 0;
    this.apuPulse1 = 0;
    this.apuPulse2 = 0;
    this.apuTriangle = 0;
    this.apuNoise = 0;
    this.apuDMC = 0;
    this.apuStatus = 0;
    this.apuFrameCounter = 0;
    this.dmaPage = 0;
    this.dmaAddr = 0;
    this.dmaData = 0;
    this.dmaDummy = true;
    this.dmaDelay = 0;
  }

  setControllerState(port: number, state: number): void {
    if (port === 1) {
      this.controller1 = state;
    } else if (port === 2) {
      this.controller2 = state;
    }
  }

  getPPUCtrl(): number {
    return this.ppuCtrl;
  }

  getPPUStatus(): number {
    return this.ppuStatus;
  }

  setPPUStatus(value: number): void {
    this.ppuStatus = value;
  }

  incrementPPUAddr(): void {
    const increment = (this.ppuCtrl & 0x04) ? 32 : 1;
    this.ppuAddr = (this.ppuAddr + increment) & 0x7FFF;
  }

  getFrameCounter(): number {
    return this.apuFrameCounter;
  }

  setInterruptFlag(flag: InterruptType): void {
    if (flag === InterruptType.NMI) {
      this.ppuStatus |= 0x80;
    }
  }

  clearInterruptFlag(flag: InterruptType): void {
    if (flag === InterruptType.NMI) {
      this.ppuStatus &= 0x7F;
    }
  }
}
