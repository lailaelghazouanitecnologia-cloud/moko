import { Emulator, EmulatorState } from './emulator';
import { Word } from './types';
import { disassemble } from './disassembler';

export interface Breakpoint {
  address: Word;
  enabled: boolean;
  hitCount: number;
}

export interface WatchPoint {
  address: Word;
  size: number;
  lastValue: number;
  enabled: boolean;
}

export class Debugger {
  private emulator: Emulator;
  private breakpoints: Map<Word, Breakpoint> = new Map();
  private watchPoints: Map<Word, WatchPoint> = new Map();
  private stepMode: 'none' | 'into' | 'over' = 'none';
  private stepDepth: number = 0;
  private paused: boolean = false;
  private previousState: EmulatorState | null = null;

  constructor(emulator: Emulator) {
    this.emulator = emulator;
  }

  addBreakpoint(address: Word): void {
    const bp: Breakpoint = {
      address,
      enabled: true,
      hitCount: 0
    };
    this.breakpoints.set(address, bp);
  }

  removeBreakpoint(address: Word): void {
    this.breakpoints.delete(address);
  }

  toggleBreakpoint(address: Word): void {
    const bp = this.breakpoints.get(address);
    if (bp) {
      bp.enabled = !bp.enabled;
    }
  }

  clearBreakpoints(): void {
    this.breakpoints.clear();
  }

  getBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  addWatchPoint(address: Word, size: number): void {
    const wp: WatchPoint = {
      address,
      size,
      lastValue: 0,
      enabled: true
    };
    this.watchPoints.set(address, wp);
  }

  removeWatchPoint(address: Word): void {
    this.watchPoints.delete(address);
  }

  clearWatchPoints(): void {
    this.watchPoints.clear();
  }

  getWatchPoints(): WatchPoint[] {
    return Array.from(this.watchPoints.values());
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.stepMode = 'none';
  }

  stepInto(): void {
    this.stepMode = 'into';
    this.stepDepth = 0;
    this.paused = false;
  }

  stepOver(): void {
    this.stepMode = 'over';
    this.stepDepth = 0;
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getCurrentInstruction(): string {
    const state = this.emulator.getState();
    const opcode = state.memory[state.pc] << 8 | state.memory[state.pc + 1];
    return disassemble(opcode);
  }

  getCallStack(): Word[] {
    const state = this.emulator.getState();
    return [...state.stack];
  }

  getRegisterValues(): Record<string, number> {
    const state = this.emulator.getState();
    const registers: Record<string, number> = {};
    for (let i = 0; i < 16; i++) {
      registers[`V${i.toString(16).toUpperCase()}`] = state.registers[i];
    }
    registers['PC'] = state.pc;
    registers['I'] = state.index;
    registers['DT'] = state.delayTimer;
    registers['ST'] = state.soundTimer;
    return registers;
  }

  getMemoryRange(start: Word, length: number): number[] {
    const state = this.emulator.getState();
    const result: number[] = [];
    for (let i = 0; i < length; i++) {
      result.push(state.memory[start + i]);
    }
    return result;
  }

  update(): void {
    if (this.paused) return;

    const state = this.emulator.getState();
    const pc = state.pc;

    // Check breakpoints
    const bp = this.breakpoints.get(pc);
    if (bp && bp.enabled) {
      bp.hitCount++;
      this.paused = true;
      return;
    }

    // Check watch points
    for (const wp of this.watchPoints.values()) {
      if (!wp.enabled) continue;
      
      const currentValue = this.getMemoryRange(wp.address, wp.size)
        .reduce((acc, val, idx) => acc | (val << (8 * idx)), 0);
      
      if (currentValue !== wp.lastValue) {
        wp.lastValue = currentValue;
        this.paused = true;
        return;
      }
    }

    // Handle step modes
    if (this.stepMode === 'into') {
      this.paused = true;
      this.stepMode = 'none';
    } else if (this.stepMode === 'over') {
      const currentOpcode = state.memory[state.pc] << 8 | state.memory[state.pc + 1];
      const isCall = (currentOpcode & 0xF000) === 0x2000;
      const isReturn = currentOpcode === 0x00EE;

      if (isCall) {
        this.stepDepth++;
      } else if (isReturn && this.stepDepth > 0) {
        this.stepDepth--;
      }

      if (this.stepDepth === 0) {
        this.paused = true;
        this.stepMode = 'none';
      }
    }

    this.previousState = { ...state };
  }

  reset(): void {
    this.paused = false;
    this.stepMode = 'none';
    this.stepDepth = 0;
    this.previousState = null;
    this.watchPoints.forEach(wp => {
      wp.lastValue = 0;
    });
  }
}
