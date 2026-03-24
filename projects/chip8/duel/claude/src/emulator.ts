import { CPU } from './cpu';
import { Memory } from './memory';
import { Display } from './display';
import { Keypad } from './keypad';
import { Timer } from './timer';
import { Clock } from './clock';
import { Speaker } from './speaker';

export interface EmulatorState {
  cpu: Uint8Array;
  memory: Uint8Array;
  display: Uint8Array;
  keypad: Uint8Array;
  delayTimer: number;
  soundTimer: number;
  pc: number;
  i: number;
  sp: number;
  dt: number;
  st: number;
}

export class Emulator {
  private cpu: CPU;
  private memory: Memory;
  private display: Display;
  private keypad: Keypad;
  private delayTimer: Timer;
  private soundTimer: Timer;
  private clock: Clock;
  private speaker: Speaker;
  private running: boolean = false;
  private animationFrameId: number | null = null;

  constructor() {
    this.memory = new Memory();
    this.display = new Display();
    this.keypad = new Keypad();
    this.delayTimer = new Timer();
    this.soundTimer = new Timer();
    this.cpu = new CPU(this.memory, this.display, this.keypad, this.delayTimer, this.soundTimer);
    this.clock = new Clock(this.cpu, this.delayTimer, this.soundTimer);
    this.speaker = new Speaker(this.clock);
  }

  loadRom(data: Uint8Array): void {
    this.memory.loadRom(data);
    this.cpu.reset();
    this.display.clear();
    this.delayTimer.reset();
    this.soundTimer.reset();
    this.running = false;
    this.stopLoop();
  }

  run(): void {
    if (this.running) return;
    this.running = true;
    this.startLoop();
  }

  pause(): void {
    this.running = false;
    this.stopLoop();
  }

  reset(): void {
    this.pause();
    this.cpu.reset();
    this.display.clear();
    this.delayTimer.reset();
    this.soundTimer.reset();
  }

  isRunning(): boolean {
    return this.running;
  }

  getDisplayBuffer(): Uint8Array {
    return this.display.getBuffer();
  }

  setKeyState(key: number, pressed: boolean): void {
    this.keypad.setKeyState(key, pressed);
  }

  getState(): EmulatorState {
    return {
      cpu: this.cpu.getState(),
      memory: this.memory.getState(),
      display: this.display.getState(),
      keypad: this.keypad.getState(),
      delayTimer: this.delayTimer.getValue(),
      soundTimer: this.soundTimer.getValue(),
      pc: this.cpu.getPC(),
      i: this.cpu.getI(),
      sp: this.cpu.getSP(),
      dt: this.delayTimer.getValue(),
      st: this.soundTimer.getValue()
    };
  }

  setState(state: EmulatorState): void {
    this.cpu.setState(state.cpu);
    this.memory.setState(state.memory);
    this.display.setState(state.display);
    this.keypad.setState(state.keypad);
    this.delayTimer.setValue(state.delayTimer);
    this.soundTimer.setValue(state.soundTimer);
  }

  private startLoop(): void {
    const step = () => {
      if (!this.running) return;
      this.clock.tick();
      this.animationFrameId = requestAnimationFrame(step);
    };
    this.animationFrameId = requestAnimationFrame(step);
  }

  private stopLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
