import { CPU6502 } from '../cpu';
import { PPU2C02 } from '../ppu';
import { APU2A03 } from '../apu';

export class Clock {
  private masterCycles: number = 0;
  private cpuCycles: number = 0;
  private ppuCycles: number = 0;
  private apuCycles: number = 0;
  private frameCount: number = 0;
  private targetFps: number = 60;
  private lastFrameTime: number = 0;
  private speed: number = 1.0;
  private frameTimeTarget: number = 1000 / 60;
  private frameComplete: boolean = false;

  tickMaster(): void {
    this.masterCycles++;
    this.frameComplete = false;
  }

  tickCpu(cycles: number): void {
    this.cpuCycles += cycles;
    this.masterCycles += cycles;
    
    const ppuCyclesToRun = cycles * 3;
    this.ppuCycles += ppuCyclesToRun;
    
    this.apuCycles += cycles;
  }

  tickPpu(cycles: number): void {
    this.ppuCycles += cycles;
    const cpuCycles = Math.floor(cycles / 3);
    this.cpuCycles += cpuCycles;
    this.masterCycles += cpuCycles;
  }

  synchronize(): void {
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastFrameTime;
    
    if (frameTime < this.frameTimeTarget / this.speed) {
      const delay = (this.frameTimeTarget / this.speed) - frameTime;
      const start = performance.now();
      while (performance.now() - start < delay) {
        // Busy wait for precise timing
      }
    }
    
    this.lastFrameTime = performance.now();
    this.frameCount++;
    this.frameComplete = true;
  }

  getCurrentTime(): number {
    return this.masterCycles;
  }

  getFrameTime(): number {
    return this.lastFrameTime;
  }

  reset(): void {
    this.masterCycles = 0;
    this.cpuCycles = 0;
    this.ppuCycles = 0;
    this.apuCycles = 0;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.frameComplete = false;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(5.0, speed));
  }

  getSpeed(): number {
    return this.speed;
  }

  isFrameComplete(): boolean {
    return this.frameComplete;
  }
}
