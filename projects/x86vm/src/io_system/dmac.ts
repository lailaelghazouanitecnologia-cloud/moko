private channels: DMAChannel[];
  private commandRegister: number = 0;
  private statusRegister: number = 0;
  private requestRegister: number = 0;
  private maskRegister: number = 0x0F;
  private modeRegister: number[] = [0, 0, 0, 0];
  private flipFlop: boolean = false;
  private interruptController: InterruptController;

  constructor(interruptController: InterruptController) {
    this.interruptController = interruptController;
    this.channels = [
      new DMAChannel(0),
      new DMAChannel(1),
      new DMAChannel(2),
      new DMAChannel(3)
    ];
  }

  readPort(port: number, size: number): number {
    const offset = port & 0x0F;
    
    switch (offset) {
      case 0x00: case 0x02: case 0x04: case 0x06:
        const ch = offset >> 1;
        return this.flipFlop ? this.channels[ch].getCurrentAddress() >> 8 : this.channels[ch].getCurrentAddress() & 0xFF;
      
      case 0x01: case 0x03: case 0x05: case 0x07:
        const ch2 = offset >> 1;
        return this.flipFlop ? this.channels[ch2].getCurrentCount() >> 8 : this.channels[ch2].getCurrentCount() & 0xFF;
      
      case 0x08:
        const status = this.statusRegister;
        this.statusRegister &= 0xF0;
        return status;
      
      case 0x0D:
        return this.flipFlop ? 1 : 0;
      
      default:
        return 0xFF;
    }
  }

  writePort(port: number, value: number, size: number): void {
    const offset = port & 0x0F;
    
    switch (offset) {
      case 0x00: case 0x02: case 0x04: case 0x06:
        const ch = offset >> 1;
        if (this.flipFlop) {
          this.channels[ch].setBaseAddress((this.channels[ch].getBaseAddress() & 0x00FF) | (value << 8));
        } else {
          this.channels[ch].setBaseAddress((this.channels[ch].getBaseAddress() & 0xFF00) | value);
        }
        this.flipFlop = !this.flipFlop;
        break;
      
      case 0x01: case 0x03: case 0x05: case 0x07:
        const ch2 = offset >> 1;
        if (this.flipFlop) {
          this.channels[ch2].setBaseCount((this.channels[ch2].getBaseCount() & 0x00FF) | (value << 8));
        } else {
          this.channels[ch2].setBaseCount((this.channels[ch2].getBaseCount() & 0xFF00) | value);
        }
        this.flipFlop = !this.flipFlop;
        break;
      
      case 0x08:
        this.commandRegister = value;
        break;
      
      case 0x09:
        if (value & 0x04) {
          this.maskRegister |= (1 << (value & 0x03));
        } else {
          this.maskRegister &= ~(1 << (value & 0x03));
        }
        break;
      
      case 0x0A:
        this.writeModeRegister(value);
        break;
      
      case 0x0B:
        this.flipFlop = false;
        break;
      
      case 0x0C:
        this.maskRegister = 0x0F;
        this.statusRegister = 0;
        break;
    }
  }

  handleInterrupt(): boolean {
    for (let i = 0; i < 4; i++) {
      if (this.channels[i].isTerminalCountReached() && !this.channels[i].isMasked()) {
        this.statusRegister |= (1 << i);
        if (i < 4) {
          this.interruptController.requestIRQ(13);
        }
        return true;
      }
    }
    return false;
  }

  getIRQ(): number {
    return 13;
  }

  reset(): void {
    this.commandRegister = 0;
    this.statusRegister = 0;
    this.requestRegister = 0;
    this.maskRegister = 0x0F;
    this.modeRegister.fill(0);
    this.flipFlop = false;
    for (const ch of this.channels) {
      ch.reset();
    }
  }

  private writeModeRegister(value: number): void {
    const channel = value & 0x03;
    const mode = (value >> 2) & 0x07;
    this.modeRegister[channel] = mode;
    this.channels[channel].setMode(mode);
  }

  performTransfer(channel: number, memory: Uint8Array, offset: number): void {
    if (channel < 0 || channel > 3) return;
    const ch = this.channels[channel];
    if (ch.isMasked()) return;
    
    const transferSize = Math.min(ch.getCurrentCount(), 65536);
    
    for (let i = 0; i < transferSize; i++) {
      if (ch.getMode() & 0x08) {
        memory[offset + i] = 0;
      } else {
        memory[offset + i] = memory[ch.getCurrentAddress() + i];
      }
      ch.decrementCount();
      if (ch.getMode() & 0x20) {
        ch.incrementAddress();
      } else {
        ch.decrementAddress();
      }
    }
    
    if (ch.getCurrentCount() === 0) {
      ch.setTerminalCountReached(true);
      this.statusRegister |= (1 << channel);
      if (channel < 4) {
        this.interruptController.requestIRQ(13);
      }
    }
  }
}

class DMAChannel {
  private baseAddress: number = 0;
  private currentAddress: number = 0;
  private baseCount: number = 0;
  private currentCount: number = 0;
  private mode: number = 0;
  private masked: boolean = true;
  private terminalCountReached: boolean = false;

  constructor(private channel: number) {}

  getBaseAddress(): number {
    return this.baseAddress;
  }

  setBaseAddress(address: number): void {
    this.baseAddress = address & 0xFFFF;
    this.currentAddress = this.baseAddress;
  }

  getCurrentAddress(): number {
    return this.currentAddress;
  }

  getBaseCount(): number {
    return this.baseCount;
  }

  setBaseCount(count: number): void {
    this.baseCount = count & 0xFFFF;
    this.currentCount = this.baseCount;
  }

  getCurrentCount(): number {
    return this.currentCount;
  }

  decrementCount(): void {
    this.currentCount = (this.currentCount - 1) & 0xFFFF;
  }

  incrementAddress(): void {
    this.currentAddress = (this.currentAddress + 1) & 0xFFFF;
  }

  decrementAddress(): void {
    this.currentAddress = (this.currentAddress - 1) & 0xFFFF;
  }

  getMode(): number {
    return this.mode;
  }

  setMode(mode: number): void {
    this.mode = mode;
  }

  isMasked(): boolean {
    return this.masked;
  }

  setMasked(masked: boolean): void {
    this.masked = masked;
  }

  isTerminalCountReached(): boolean {
    return this.terminalCountReached;
  }

  setTerminalCountReached(reached: boolean): void {
    this.terminalCountReached = reached;
  }

  reset(): void {
    this.baseAddress = 0;
    this.currentAddress = 0;
    this.baseCount = 0;
    this.currentCount = 0;
    this.mode = 0;
    this.masked = true;
    this.terminalCountReached = false;
  }
}
