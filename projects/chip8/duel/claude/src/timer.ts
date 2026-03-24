import { u8 } from "./types";

export class Timer {
  private value: u8 = 0;
  private intervalId: number | null = null;
  private running: boolean = false;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.intervalId = window.setInterval(() => {
      if (this.value > 0) {
        this.value--;
      }
    }, 1000 / 60);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset(): void {
    this.stop();
    this.value = 0;
  }

  set(val: u8): void {
    this.value = val;
  }

  get(): u8 {
    return this.value;
  }

  isRunning(): boolean {
    return this.running;
  }
}
