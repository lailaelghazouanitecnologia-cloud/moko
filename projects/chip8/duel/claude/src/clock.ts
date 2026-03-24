import { CPU } from './cpu';
import { Timer } from './timer';

export class Clock {
  private cpu: CPU;
  private delayTimer: Timer;
  private soundTimer: Timer;
  private cpuInterval: NodeJS.Timeout | null = null;
  private timerInterval: NodeJS.Timeout | null = null;
  private running = false;

  constructor(cpu: CPU, delayTimer: Timer, soundTimer: Timer) {
    this.cpu = cpu;
    this.delayTimer = delayTimer;
    this.soundTimer = soundTimer;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    this.cpuInterval = setInterval(() => {
      if (!this.cpu.isHalted()) {
        this.cpu.tick();
      }
    }, 2);

    this.timerInterval = setInterval(() => {
      this.delayTimer.tick();
      this.soundTimer.tick();
    }, 1000 / 60);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.cpuInterval) {
      clearInterval(this.cpuInterval);
      this.cpuInterval = null;
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}
