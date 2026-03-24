import { Memory } from './memory';
import { CPU } from './cpu';
import { Decoder } from './decoder';
import { Executor } from './executor';
import { Instruction } from './instruction';

export interface InterpreterState {
  cycleCount: number;
  isRunning: boolean;
  isWaitingForInput: boolean;
  pc: number;
  sp: number;
  registers: number[];
  delayTimer: number;
  soundTimer: number;
}

export class Interpreter {
  private memory: Memory;
  private cpu: CPU;
  private decoder: Decoder;
  private executor: Executor;
  private isRunning: boolean = false;
  private cycleCount: number = 0;
  private hz: number = 500;
  private lastFrameTime: number = 0;
  private frameCycles: number = 0;
  private targetCyclesPerFrame: number = 0;

  constructor() {
    this.memory = new Memory();
    this.cpu = new CPU();
    this.decoder = new Decoder();
    this.executor = new Executor();
    this.targetCyclesPerFrame = Math.floor(this.hz / 60);
  }

  initialize(memory: Memory, cpu: CPU): void {
    this.memory = memory;
    this.cpu = cpu;
    this.decoder = new Decoder();
    this.executor = new Executor();
    this.executor.initialize(cpu, memory);
  }

  start(): void {
    this.isRunning = true;
    this.lastFrameTime = performance.now();
  }

  stop(): void {
    this.isRunning = false;
  }

  step(): void {
    if (!this.isRunning) return;

    const opcode = this.fetch();
    const instruction = this.decoder.decode(opcode);
    this.executor.execute(instruction);
    this.cycleCount++;
    this.frameCycles++;
  }

  runFrame(): number {
    const startTime = performance.now();
    const targetCycles = this.targetCyclesPerFrame;
    
    this.frameCycles = 0;
    
    while (this.frameCycles < targetCycles && this.isRunning) {
      this.step();
    }
    
    this.updateTimers();
    this.handleInterrupts();
    
    const elapsed = performance.now() - startTime;
    const targetFrameTime = 1000 / 60;
    const remaining = Math.max(0, targetFrameTime - elapsed);
    
    return remaining;
  }

  fetch(): number {
    const pc = this.cpu.getPC();
    const opcode = this.getOpcodeAt(pc);
    this.cpu.setPC(pc + 2);
    return opcode;
  }

  getOpcodeAt(address: number): number {
    const high = this.memory.read(address) << 8;
    const low = this.memory.read(address + 1);
    return high | low;
  }

  updateTimers(): void {
    if (this.cpu.getDelayTimer() > 0) {
      this.cpu.setDelayTimer(this.cpu.getDelayTimer() - 1);
    }
    if (this.cpu.getSoundTimer() > 0) {
      this.cpu.setSoundTimer(this.cpu.getSoundTimer() - 1);
    }
  }

  handleInterrupts(): void {
    if (this.cpu.isWaitingForKey()) {
      const key = this.cpu.checkKeyPress();
      if (key !== null) {
        this.cpu.setKeyWaitRegister(key);
        this.cpu.setWaitingForKey(false);
      }
    }
  }

  getCycleCount(): number {
    return this.cycleCount;
  }

  reset(): void {
    this.isRunning = false;
    this.cycleCount = 0;
    this.frameCycles = 0;
    this.lastFrameTime = 0;
    this.cpu.reset();
    this.memory.reset();
  }

  setSpeed(hz: number): void {
    this.hz = hz;
    this.targetCyclesPerFrame = Math.floor(hz / 60);
  }

  isWaitingForInput(): boolean {
    return this.cpu.isWaitingForKey();
  }

  skipKeyWait(): void {
    this.cpu.setWaitingForKey(false);
  }

  getState(): InterpreterState {
    return {
      cycleCount: this.cycleCount,
      isRunning: this.isRunning,
      isWaitingForInput: this.isWaitingForInput(),
      pc: this.cpu.getPC(),
      sp: this.cpu.getSP(),
      registers: [...this.cpu.getRegisters()],
      delayTimer: this.cpu.getDelayTimer(),
      soundTimer: this.cpu.getSoundTimer()
    };
  }
}
