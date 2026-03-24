import { CPU } from './cpu';
import { Memory } from './memory';
import { Display } from './display';
import { Keyboard } from './keyboard';
import { Speaker } from './speaker';
import { Timers } from './timers';
import { Registers } from './registers';
import { Clock } from './clock';
import { loadROM } from './loader';

export interface EmulatorOptions {
  clockSpeed?: number;
  frameRate?: number;
}

export class Emulator {
  private memory: Memory;
  private registers: Registers;
  private display: Display;
  private keyboard: Keyboard;
  private timers: Timers;
  private speaker: Speaker;
  private cpu: CPU;
  private clock: Clock;
  private running: boolean;
  private lastFrameTime: number;
  private frameInterval: number;
  private cyclesPerFrame: number;

  constructor(options: EmulatorOptions = {}) {
    const clockSpeed = options.clockSpeed ?? 600;
    const frameRate = options.frameRate ?? 60;

    this.memory = new Memory();
    this.registers = new Registers();
    this.display = new Display();
    this.keyboard = new Keyboard();
    this.timers = new Timers();
    this.speaker = new Speaker(new Clock(clockSpeed));
    this.cpu = new CPU(this.memory, this.registers, this.display, this.keyboard, this.timers);
    this.clock = new Clock(clockSpeed);
    this.running = false;
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / frameRate;
    this.cyclesPerFrame = Math.floor(clockSpeed / frameRate);
  }

  public loadROM(data: ArrayBuffer): void {
    loadROM(this.memory, data);
    this.reset();
  }

  public reset(): void {
    this.cpu.reset();
    this.display.clear();
    this.timers.reset();
    this.running = false;
    this.lastFrameTime = 0;
  }

  public step(): void {
    if (!this.cpu.isHalted()) {
      this.cpu.cycle();
    }
  }

  public run(): void {
    this.running = true;
    this.lastFrameTime = performance.now();
    this.runLoop();
  }

  public pause(): void {
    this.running = false;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getDisplayBuffer(): Uint8Array {
    return this.display.getBuffer();
  }

  public keyPressed(key: number): void {
    this.cpu.keyPressed(key);
  }

  public isWaitingForKey(): boolean {
    return this.cpu.isWaitingForKey();
  }

  private runLoop(): void {
    if (!this.running) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime >= this.frameInterval) {
      for (let i = 0; i < this.cyclesPerFrame; i++) {
        this.step();
      }

      this.timers.tick();
      this.lastFrameTime = currentTime;
    }

    requestAnimationFrame(() => this.runLoop());
  }
}
