import { IEmulator } from './iemulator';
import { ICPU, CPU } from '../cpu';
import { IMemory, Memory } from '../memory';
import { IDisplay, Display } from '../display';
import { IInput, Input } from '../input';
import { ITimers, Timers } from '../timers';
import { ISound, Sound } from '../sound';

/**
 * CHIP-8 virtual machine coordinator.
 * Orchestrates the CPU, memory, display, input, timers, and sound subsystems.
 */
export class Emulator implements IEmulator {
  private readonly cpu: ICPU;
  private readonly memory: IMemory;
  private readonly display: IDisplay;
  private readonly input: IInput;
  private readonly timers: ITimers;
  private readonly sound: ISound;
  private running: boolean;
  private lastTime: number;
  private frameCount: number;
  private fps: number;
  private animationFrameId: number | null;

  constructor() {
    this.memory = new Memory();
    this.display = new Display();
    this.input = new Input();
    this.sound = new Sound();
    this.timers = new Timers(this.sound);
    this.cpu = new CPU(this.memory, this.display, this.input, this.timers, this.sound);
    
    this.running = false;
    this.lastTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    this.animationFrameId = null;
  }

  loadROM(data: Uint8Array): void {
    if (data.length === 0) {
      throw new RangeError('ROM data must not be empty');
    }
    this.memory.loadROM(data);
    this.reset();
  }

  /**
   * Start the emulation loop.
   * Runs the CPU and updates timers at approximately 60 FPS.
   */
  run(): void {
    if (this.running) return;
    
    this.running = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fps = 0;
    
    const loop = (currentTime: number) => {
      if (!this.running) return;
      
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;
      
      this.step();
      this.updateTimers(deltaTime);
      
      this.frameCount++;
      if (deltaTime > 0) {
        this.fps = 1000 / deltaTime;
      }
      
      this.animationFrameId = requestAnimationFrame(loop);
    };
    
    this.animationFrameId = requestAnimationFrame(loop);
  }

  pause(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  reset(): void {
    this.memory.reset();
    this.display.clear();
    this.input.reset();
    this.cpu.setPC(0x200);
    this.timers.update(0);
    this.sound.stop();
    
    this.frameCount = 0;
    this.fps = 0;
    this.lastTime = performance.now();
  }

  isRunning(): boolean {
    return this.running;
  }

  getFPS(): number {
    return this.fps;
  }

  step(): void {
    this.cpu.step();
  }

  updateTimers(deltaTime: number): void {
    if (!Number.isFinite(deltaTime)) {
      throw new TypeError('deltaTime must be a finite number');
    }
    if (deltaTime < 0) {
      throw new RangeError('deltaTime must be non-negative');
    }
    this.timers.update(deltaTime);
  }
}
