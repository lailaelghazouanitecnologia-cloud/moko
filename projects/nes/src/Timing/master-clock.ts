import { CpuClock } from './cpu-clock';
import { PpuClock } from './ppu-clock';
import { FrameSequencer } from './frame-sequencer';

export class MasterClock {
  private cpuClock: CpuClock;
  private ppuClock: PpuClock;
  private frameSequencer: FrameSequencer;
  private cpuCycles: number;
  private ppuCycles: number;
  private apuCycles: number;

  constructor() {
    this.cpuClock = new CpuClock();
    this.ppuClock = new PpuClock();
    this.frameSequencer = new FrameSequencer();
    this.cpuCycles = 0;
    this.ppuCycles = 0;
    this.apuCycles = 0;
  }

  reset(): void {
    this.cpuClock.reset();
    this.ppuClock.reset();
    this.frameSequencer.reset();
    this.cpuCycles = 0;
    this.ppuCycles = 0;
    this.apuCycles = 0;
  }

  step(): void {
    this.cpuCycles++;
    this.ppuCycles++;
    this.apuCycles++;
    
    this.cpuClock.step();
    this.ppuClock.step();
    this.frameSequencer.step();
  }

  stepCpu(cycles: number): void {
    this.cpuCycles += cycles;
    this.cpuClock.addCycles(cycles);
  }

  stepPpu(): void {
    this.ppuCycles += 4;
    this.ppuClock.stepPixel();
  }

  stepApu(): void {
    this.apuCycles++;
  }

  getCpuCycles(): number {
    return this.cpuCycles;
  }

  getPpuCycles(): number {
    return this.ppuCycles;
  }

  getFrameCount(): number {
    return this.frameSequencer.getFrameParity() ? Math.floor(this.frameSequencer.getCurrentCycle() / 89342) : Math.floor(this.frameSequencer.getCurrentCycle() / 89342);
  }

  isEvenFrame(): boolean {
    return !this.frameSequencer.getFrameParity();
  }

  synchronize(): void {
    const targetCycles = Math.max(this.cpuCycles, this.ppuCycles / 3, this.apuCycles);
    
    if (this.cpuCycles < targetCycles) {
      const diff = targetCycles - this.cpuCycles;
      this.cpuClock.addCycles(diff);
      this.cpuCycles = targetCycles;
    }
    
    if (this.ppuCycles / 3 < targetCycles) {
      const diff = Math.floor((targetCycles - this.ppuCycles / 3) * 3);
      for (let i = 0; i < diff; i++) {
        this.ppuClock.step();
      }
      this.ppuCycles += diff;
    }
    
    if (this.apuCycles < targetCycles) {
      this.apuCycles = targetCycles;
    }
  }
}
