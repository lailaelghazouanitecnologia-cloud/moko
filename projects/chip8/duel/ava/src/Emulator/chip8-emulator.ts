import { Cpu } from '../CPU';
import { FrameBuffer } from '../Display';
import { Keypad } from '../Input';
import { Ram } from '../Memory';
import { SoundTimer } from '../Timer';
import { Clock } from './clock';
import { QuirkSettings } from './quirk-settings';
import { QuirkType } from './quirk-type';
import { EmulatorState } from './emulator-state';

export class Chip8Emulator {
  private cpu: Cpu;
  private memory: Ram;
  private display: FrameBuffer;
  private keypad: Keypad;
  private delayTimer: SoundTimer;
  private soundTimer: SoundTimer;
  private clock: Clock;
  private isRunning: boolean;
  private cyclesPerFrame: number;
  private quirks: QuirkSettings;

  constructor() {
    this.cpu = new Cpu();
    this.memory = new Ram(4096);
    this.display = new FrameBuffer(64, 32);
    this.keypad = new Keypad();
    this.delayTimer = new SoundTimer();
    this.soundTimer = new SoundTimer();
    this.clock = new Clock();
    this.isRunning = false;
    this.cyclesPerFrame = 10;
    this.quirks = new QuirkSettings();
  }

  initialize(): void {
    this.cpu.reset();
    this.memory.reset();
    this.display.clear();
    this.keypad = new Keypad();
    this.delayTimer.reset();
    this.soundTimer.reset();
    this.clock.reset();
    this.isRunning = false;
  }

  loadRom(rom: Uint8Array): void {
    this.memory.load(rom, 0x200);
  }

  start(): void {
    this.isRunning = true;
    this.clock.start();
  }

  stop(): void {
    this.isRunning = false;
    this.clock.stop();
  }

  reset(): void {
    this.stop();
    this.initialize();
  }

  step(): void {
    if (!this.isRunning) return;

    const opcode = this.cpu.fetch(this.memory);
    this.cpu.execute(opcode, this.memory, this.display, this.keypad, this.quirks);
    this.cpu.updateTimers(this.delayTimer, this.soundTimer);
  }

  stepFrame(): void {
    for (let i = 0; i < this.cyclesPerFrame; i++) {
      this.step();
    }
  }

  update(deltaTime: number): void {
    if (!this.isRunning) return;

    this.stepFrame();
    this.delayTimer.tick();
    this.soundTimer.tick();
  }

  getPixel(x: number, y: number): boolean {
    return this.display.getPixel(x, y);
  }

  setKey(key: number, pressed: boolean): void {
    this.keypad.setKey(key, pressed);
  }

  saveState(): EmulatorState {
    return {
      cpu: this.cpu.saveState(),
      memory: this.memory.dump(0, this.memory.getSize()),
      display: this.display.pixels.slice(),
      keypad: this.keypad.saveState(),
      delayTimer: this.delayTimer.get(),
      soundTimer: this.soundTimer.get(),
      quirks: this.quirks.clone()
    };
  }

  loadState(state: EmulatorState): void {
    this.cpu.loadState(state.cpu);
    this.memory.load(new Uint8Array(state.memory), 0);
    this.display.pixels = state.display.slice();
    this.keypad.loadState(state.keypad);
    this.delayTimer.set(state.delayTimer);
    this.soundTimer.set(state.soundTimer);
    this.quirks = state.quirks.clone();
  }

  getRegister(index: number): number {
    return this.cpu.getRegister(index);
  }

  setRegister(index: number, value: number): void {
    this.cpu.setRegister(index, value);
  }

  getProgramCounter(): number {
    return this.cpu.getProgramCounter();
  }

  getStackPointer(): number {
    return this.cpu.getStackPointer();
  }

  getDelayTimer(): number {
    return this.delayTimer.get();
  }

  getSoundTimer(): number {
    return this.soundTimer.get();
  }

  setQuirk(quirk: QuirkType, enabled: boolean): void {
    this.quirks.set(quirk, enabled);
  }

  getQuirk(quirk: QuirkType): boolean {
    return this.quirks.get(quirk);
  }

  setCyclesPerFrame(cycles: number): void {
    this.cyclesPerFrame = cycles;
  }

  getFrameBuffer(): boolean[] {
    return this.display.pixels.slice();
  }

  isWaitingForKey(): boolean {
    return this.cpu.isWaitingForKey();
  }

  getWaitingKeyRegister(): number {
    return this.cpu.getWaitingKeyRegister();
  }

  dumpMemory(start: number, length: number): number[] {
    return this.memory.dump(start, length);
  }

  getMemorySize(): number {
    return this.memory.getSize();
  }
}
