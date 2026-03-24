import { ExecutionEngine } from './execution-engine';
import { InterruptController } from './interrupt-controller';
import { InstructionCache } from './instruction-cache';
import { MicroOpQueue } from './micro-op-queue';
import { Timer8254, SerialPort } from '../IOPorts';
import { InstructionDecoder, DisplacementFetcher } from '../InstructionDecoder';
import { PhysicalMemory, VirtualMemory, MemoryMapper } from '../MemoryManager';
import { EFlagsRegister, DebugRegisters } from '../Registers';

export class CPUCore {
  private executionEngine: ExecutionEngine;
  private interruptController: InterruptController;
  private instructionCache: InstructionCache;
  private microOpQueue: MicroOpQueue;
  private registers: Registers;
  private memoryManager: MemoryManager;
  private decoder: InstructionDecoder;
  private ioPorts: Map<number, IOPort>;
  private halted: boolean = false;
  private cycles: number = 0;

  constructor() {
    this.executionEngine = new ExecutionEngine();
    this.interruptController = new InterruptController();
    this.instructionCache = new InstructionCache();
    this.microOpQueue = new MicroOpQueue();
    this.registers = new Registers();
    this.memoryManager = new MemoryManager();
    this.decoder = new InstructionDecoder();
    this.ioPorts = new Map<number, IOPort>();
  }

  initialize(): void {
    this.executionEngine.initialize();
    this.interruptController.initialize();
    this.instructionCache.initialize();
    this.microOpQueue.initialize();
    this.registers.initialize();
    this.memoryManager.initialize();
    this.decoder.initialize();
    
    this.halted = false;
    this.cycles = 0;
    
    this.ioPorts.set(0x40, new Timer8254());
    this.ioPorts.set(0x3F8, new SerialPort());
  }

  reset(): void {
    this.executionEngine.reset();
    this.interruptController.reset();
    this.instructionCache.reset();
    this.microOpQueue.reset();
    this.registers.reset();
    this.memoryManager.reset();
    this.decoder.reset();
    
    this.halted = false;
    this.cycles = 0;
  }

  step(): boolean {
    if (this.halted) {
      return false;
    }

    if (this.checkPendingInterrupts()) {
      const vector = this.interruptController.acknowledgeInterrupt();
      this.handleInterrupt(vector);
    }

    const instructionByte = this.fetchInstruction();
    const instruction = this.decoder.decode(instructionByte);
    
    if (instruction.type === InstructionType.HLT) {
      this.handleHLT();
      return false;
    }

    this.executionEngine.execute(instruction);
    this.cycles++;
    
    return true;
  }

  run(cycles: number): void {
    for (let i = 0; i < cycles && !this.halted; i++) {
      this.step();
    }
  }

  fetchInstruction(): number {
    const address = this.getLinearAddress();
    const cacheLine = this.instructionCache.fetch(address);
    
    if (!cacheLine) {
      const physicalAddress = this.memoryManager.translate(address);
      return this.memoryManager.readByte(physicalAddress);
    }
    
    return this.instructionCache.read(address);
  }

  handleInterrupt(vector: number): void {
    const currentCPL = this.getCurrentPrivilegeLevel();
    const descriptor = this.interruptController.getInterruptDescriptor(vector);
    
    if (!descriptor || !this.interruptController.canServiceInterrupt(vector)) {
      return;
    }

    this.registers.pushEFLAGS();
    this.registers.pushCS();
    this.registers.pushIP();
    
    this.registers.setIP(descriptor.offset);
    this.registers.setCS(descriptor.segment);
    this.registers.clearInterruptFlag();
    
    this.interruptController.endOfInterrupt(vector);
  }

  handleException(vector: number, errorCode?: number): void {
    this.interruptController.raiseException(vector, errorCode);
    
    if (vector === 0x00) {
      this.handleDivideError();
    } else if (vector === 0x0D) {
      this.handleGeneralProtectionFault(errorCode);
    } else if (vector === 0x0E) {
      this.handlePageFault(errorCode);
    }
  }

  checkPendingInterrupts(): boolean {
    if (!this.interruptController.checkInterrupts()) {
      return false;
    }
    
    return this.interruptController.getIRR() !== 0;
  }

  getCurrentPrivilegeLevel(): number {
    const cs = this.registers.getCS();
    return (cs & 0x03);
  }

  setProtectedMode(enabled: boolean): void {
    if (enabled) {
      this.registers.setCR0(this.registers.getCR0() | 0x01);
    } else {
      this.registers.setCR0(this.registers.getCR0() & ~0x01);
    }
  }

  isProtectedMode(): boolean {
    return (this.registers.getCR0() & 0x01) !== 0;
  }

  updateInstructionPointer(offset: number): void {
    const currentIP = this.registers.getIP();
    this.registers.setIP(currentIP + offset);
  }

  getLinearAddress(): number {
    const cs = this.registers.getCS() & 0xFFFF;
    const ip = this.registers.getIP() & 0xFFFF;
    
    if (this.isProtectedMode()) {
      const csBase = this.registers.getSegmentBase(cs);
      return csBase + ip;
    } else {
      return (cs << 4) + ip;
    }
  }

  handleHLT(): void {
    this.halted = true;
    this.registers.setHaltState(true);
  }

  dumpState(): string {
    const state = [
      `Cycles: ${this.cycles}`,
      `Halted: ${this.halted}`,
      `Protected Mode: ${this.isProtectedMode()}`,
      `CPL: ${this.getCurrentPrivilegeLevel()}`,
      `IP: 0x${this.registers.getIP().toString(16).padStart(8, '0')}`,
      `CS: 0x${this.registers.getCS().toString(16).padStart(4, '0')}`,
      `Flags: 0x${this.registers.getEFLAGS().toString(16).padStart(8, '0')}`,
      `EAX: 0x${this.registers.getEAX().toString(16).padStart(8, '0')}`,
      `EBX: 0x${this.registers.getEBX().toString(16).padStart(8, '0')}`,
      `ECX: 0x${this.registers.getECX().toString(16).padStart(8, '0')}`,
      `EDX: 0x${this.registers.getEDX().toString(16).padStart(8, '0')}`,
      `ESP: 0x${this.registers.getESP().toString(16).padStart(8, '0')}`,
      `EBP: 0x${this.registers.getEBP().toString(16).padStart(8, '0')}`,
      `ESI: 0x${this.registers.getESI().toString(16).padStart(8, '0')}`,
      `EDI: 0x${this.registers.getEDI().toString(16).padStart(8, '0')}`
    ];
    
    return state.join('\n');
  }

  private handleDivideError(): void {
    this.handleException(0x00);
  }

  private handleGeneralProtectionFault(errorCode?: number): void {
    this.handleException(0x0D, errorCode);
  }

  private handlePageFault(errorCode?: number): void {
    this.handleException(0x0E, errorCode);
  }
}

interface IOPort {
  read(port: number): number;
  write(port: number, value: number): void;
}

interface Registers {
  initialize(): void;
  reset(): void;
  pushEFLAGS(): void;
  pushCS(): void;
  pushIP(): void;
  setIP(value: number): void;
  setCS(value: number): void;
  clearInterruptFlag(): void;
  getCS(): number;
  getIP(): number;
  getCR0(): number;
  setCR0(value: number): void;
  getSegmentBase(segment: number): number;
  setHaltState(halted: boolean): void;
  getEFLAGS(): number;
  getEAX(): number;
  getEBX(): number;
  getECX(): number;
  getEDX(): number;
  getESP(): number;
  getEBP(): number;
  getESI(): number;
  getEDI(): number;
}

interface MemoryManager {
  initialize(): void;
  reset(): void;
  translate(linearAddress: number): number;
  readByte(address: number): number;
}

interface Instruction {
  type: InstructionType;
}

enum InstructionType {
  HLT = 'HLT'
}
