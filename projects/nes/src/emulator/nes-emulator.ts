import { CPU6502, Flags } from '../cpu';
import { PPU2C02, Nametable } from '../ppu';
import { APU2A03, PulseChannel, TriangleChannel, NoiseChannel, DMCChannel } from '../apu';
import { MemoryBus, Cartridge, Mapper, RAM, ROM } from '../memory';
import { Button, InputState, Joypad, Controller } from '../input';
import { Clock } from './clock';
import { Frame } from './frame';
import { Debugger } from './debugger';
import { Tracer } from './tracer';

export interface CpuStateInfo {
  a: number;
  x: number;
  y: number;
  sp: number;
  pc: number;
  flags: number;
}

export interface PpuStateInfo {
  scanline: number;
  cycle: number;
  frame: number;
  v: number;
  t: number;
  x: number;
  w: boolean;
}

export interface MapperInfo {
  number: number;
  name: string;
  prgBanks: number;
  chrBanks: number;
}

export class NESEmulator {
  private cpu: CPU6502;
  private ppu: PPU2C02;
  private apu: APU2A03;
  private memory: MemoryBus;
  private controller: Controller;
  private clock: Clock;
  private debugger: Debugger;
  private tracer: Tracer;
  private frame: Frame;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private fps: number = 0;
  private breakpoints: Set<number> = new Set();
  private saveStates: Map<number, any> = new Map();

  constructor() {
    this.cpu = new CPU6502();
    this.ppu = new PPU2C02();
    this.apu = new APU2A03();
    this.memory = new MemoryBus();
    this.controller = new Controller();
    this.clock = new Clock();
    this.debugger = new Debugger();
    this.tracer = new Tracer();
    this.frame = new Frame();
  }

  loadRom(romData: Uint8Array): void {
    const cartridge = new Cartridge(romData);
    this.memory.loadCartridge(cartridge);
    this.reset();
  }

  reset(): void {
    this.cpu.reset();
    this.ppu.reset();
    this.apu.reset();
    this.memory.reset();
    this.controller.reset();
    this.clock.reset();
    this.frame.reset();
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
  }

  run(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    
    const step = () => {
      if (!this.isRunning) return;
      if (this.isPaused) {
        requestAnimationFrame(step);
        return;
      }
      
      this.clockTick();
      
      if (this.ppu.isFrameComplete()) {
        this.frameCount++;
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.fps = 1000 / delta;
        this.lastFrameTime = now;
        this.ppu.clearFrameComplete();
      }
      
      requestAnimationFrame(step);
    };
    
    requestAnimationFrame(step);
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  step(): void {
    const cycles = this.cpu.step();
    for (let i = 0; i < cycles * 3; i++) {
      this.ppu.step();
    }
    for (let i = 0; i < cycles; i++) {
      this.apu.step();
    }
  }

  stepFrame(): void {
    const startFrame = this.ppu.getFrame();
    do {
      this.step();
    } while (this.ppu.getFrame() === startFrame);
  }

  getFrameBuffer(): Uint8Array {
    return this.ppu.getFrameBuffer();
  }

  getAudioBuffer(): Float32Array {
    return this.apu.getAudioBuffer();
  }

  saveState(slot: number): void {
    const state = {
      cpu: this.cpu.saveState(),
      ppu: this.ppu.saveState(),
      apu: this.apu.saveState(),
      memory: this.memory.saveState(),
      controller: this.controller.saveState(),
      clock: this.clock.saveState(),
      frameCount: this.frameCount
    };
    this.saveStates.set(slot, state);
  }

  loadState(slot: number): void {
    const state = this.saveStates.get(slot);
    if (!state) return;
    
    this.cpu.loadState(state.cpu);
    this.ppu.loadState(state.ppu);
    this.apu.loadState(state.apu);
    this.memory.loadState(state.memory);
    this.controller.loadState(state.controller);
    this.clock.loadState(state.clock);
    this.frameCount = state.frameCount;
  }

  setBreakpoint(address: number): void {
    this.breakpoints.add(address);
    this.debugger.addBreakpoint(address);
  }

  clearBreakpoint(address: number): void {
    this.breakpoints.delete(address);
    this.debugger.removeBreakpoint(address);
  }

  enableTracing(enabled: boolean): void {
    this.tracer.enable(enabled);
  }

  getCpuState(): CpuStateInfo {
    return {
      a: this.cpu.getA(),
      x: this.cpu.getX(),
      y: this.cpu.getY(),
      sp: this.cpu.getSP(),
      pc: this.cpu.getPC(),
      flags: this.cpu.getFlags()
    };
  }

  getPpuState(): PpuStateInfo {
    return {
      scanline: this.ppu.getScanline(),
      cycle: this.ppu.getCycle(),
      frame: this.ppu.getFrame(),
      v: this.ppu.getV(),
      t: this.ppu.getT(),
      x: this.ppu.getX(),
      w: this.ppu.getW()
    };
  }

  setInput(joypad: number, button: Button, pressed: boolean): void {
    if (joypad === 0) {
      this.controller.joypad1.setButton(button, pressed);
    } else if (joypad === 1) {
      this.controller.joypad2.setButton(button, pressed);
    }
  }

  getMapperInfo(): MapperInfo {
    const mapper = this.memory.getMapper();
    return {
      number: mapper.getNumber(),
      name: mapper.getName(),
      prgBanks: mapper.getPrgBanks(),
      chrBanks: mapper.getChrBanks()
    };
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  getFps(): number {
    return this.fps;
  }

  private clockTick(): void {
    const cpuCycles = this.cpu.step();
    for (let i = 0; i < cpuCycles * 3; i++) {
      this.ppu.step();
    }
    for (let i = 0; i < cpuCycles; i++) {
      this.apu.step();
    }
    this.clock.tick(cpuCycles);
  }
}
