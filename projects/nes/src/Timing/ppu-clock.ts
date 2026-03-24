import { MasterClock } from './master-clock';
import { FrameSequencer } from './frame-sequencer';
import { CpuClock } from './cpu-clock';

export class PpuClock {
  private cycles: number = 0;
  private frameCycles: number = 0;
  private pixelX: number = 0;
  private pixelY: number = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.cycles = 0;
    this.frameCycles = 0;
    this.pixelX = 0;
    this.pixelY = 0;
  }

  step(): void {
    this.cycles++;
    this.frameCycles++;
    
    const cyclesPerPixel = 4;
    if (this.cycles % cyclesPerPixel === 0) {
      this.pixelX++;
      if (this.pixelX >= 341) {
        this.pixelX = 0;
        this.pixelY++;
        if (this.pixelY >= 262) {
          this.pixelY = 0;
          this.frameCycles = 0;
        }
      }
    }
  }

  stepPixel(): void {
    for (let i = 0; i < 4; i++) {
      this.step();
    }
  }

  getPixelX(): number {
    return this.pixelX;
  }

  getPixelY(): number {
    return this.pixelY;
  }

  getFrameCycle(): number {
    return this.frameCycles;
  }

  isPixelCycle(): boolean {
    return this.cycles % 4 === 0;
  }

  alignToPixel(): void {
    const remainder = this.cycles % 4;
    if (remainder !== 0) {
      const cyclesToAdd = 4 - remainder;
      for (let i = 0; i < cyclesToAdd; i++) {
        this.step();
      }
    }
  }
}
