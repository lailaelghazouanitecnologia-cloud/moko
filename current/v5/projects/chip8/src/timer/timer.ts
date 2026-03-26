import { ITimer } from './itimer';
import { ICpu } from '../cpu';

export class Timer implements ITimer {
  private readonly cpu: ICpu;
  private intervalId: number | null = null;

  constructor(cpu: ICpu) {
    this.cpu = cpu;
  }

  public get isRunning(): boolean {
    return this.intervalId !== null;
  }

  public start(): void {
    if (this.intervalId !== null) {
      return;
    }
    this.intervalId = window.setInterval(() => this.tick(), 1000 / 60);
  }

  public stop(): void {
    if (this.intervalId === null) {
      return;
    }
    window.clearInterval(this.intervalId);
    this.intervalId = null;
  }

  public tick(): void {
    this.cpu.updateTimers();
  }
}
