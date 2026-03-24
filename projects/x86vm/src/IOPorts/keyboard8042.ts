import { IOPortSpace } from './io-port-space';

export class Keyboard8042 {
  private outputBuffer: number = 0;
  private inputBuffer: number = 0;
  private statusRegister: number = 0;
  private commandRegister: number = 0;
  private configuration: number = 0;
  private keyQueue: number[] = [];
  private scanCodeSet: number = 2;
  private keyboardEnabled: boolean = true;
  private selfTestPassed: boolean = true;

  constructor() {
    this.reset();
  }

  readData(): number {
    const data = this.outputBuffer;
    this.statusRegister &= ~0x01;
    this.outputBuffer = 0;
    return data;
  }

  writeData(value: number): void {
    this.inputBuffer = value & 0xFF;
    this.statusRegister |= 0x02;
  }

  readStatus(): number {
    return this.statusRegister;
  }

  writeCommand(command: number): void {
    this.commandRegister = command & 0xFF;
    this.handleCommand(command);
  }

  handleCommand(command: number): void {
    switch (command) {
      case 0x20:
        this.outputBuffer = this.configuration;
        this.statusRegister |= 0x01;
        break;
      case 0x60:
        this.configuration = this.inputBuffer;
        this.statusRegister &= ~0x02;
        break;
      case 0xAA:
        this.handleSelfTest();
        break;
      case 0xAE:
        this.enableKeyboard();
        break;
      case 0xAD:
        this.disableKeyboard();
        break;
      case 0xF4:
        this.setScanCodeSet(this.inputBuffer);
        this.statusRegister &= ~0x02;
        break;
      case 0xF5:
        this.outputBuffer = this.getScanCodeSet();
        this.statusRegister |= 0x01;
        break;
      case 0xED:
        this.setLEDs(this.inputBuffer);
        this.statusRegister &= ~0x02;
        break;
      default:
        break;
    }
  }

  addKeyCode(scancode: number): void {
    if (this.keyboardEnabled && this.keyQueue.length < 16) {
      this.keyQueue.push(scancode & 0xFF);
      if (this.keyQueue.length === 1) {
        this.outputBuffer = scancode & 0xFF;
        this.statusRegister |= 0x01;
      }
    }
  }

  hasKey(): boolean {
    return this.keyQueue.length > 0;
  }

  getKey(): number {
    if (this.keyQueue.length === 0) {
      return 0;
    }
    const key = this.keyQueue.shift() || 0;
    if (this.keyQueue.length > 0) {
      this.outputBuffer = this.keyQueue[0];
      this.statusRegister |= 0x01;
    } else {
      this.statusRegister &= ~0x01;
    }
    return key;
  }

  setLEDs(leds: number): void {
    const ledMask = leds & 0x07;
    this.configuration = (this.configuration & ~0x07) | ledMask;
  }

  reset(): void {
    this.outputBuffer = 0;
    this.inputBuffer = 0;
    this.statusRegister = 0x10;
    this.commandRegister = 0;
    this.configuration = 0x55;
    this.keyQueue = [];
    this.scanCodeSet = 2;
    this.keyboardEnabled = true;
    this.selfTestPassed = true;
  }

  enableKeyboard(): void {
    this.keyboardEnabled = true;
    this.configuration |= 0x01;
  }

  disableKeyboard(): void {
    this.keyboardEnabled = false;
    this.configuration &= ~0x01;
  }

  setScanCodeSet(set: number): void {
    if (set >= 1 && set <= 3) {
      this.scanCodeSet = set;
    }
  }

  getScanCodeSet(): number {
    return this.scanCodeSet;
  }

  handleSelfTest(): void {
    this.selfTestPassed = true;
    this.outputBuffer = 0x55;
    this.statusRegister |= 0x01;
  }
}
