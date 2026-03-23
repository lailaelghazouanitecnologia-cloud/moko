import { EventEmitter } from './event-emitter';

export class Timer {
  private startTime: number = 0;
  private elapsedTime: number = 0;
  private running: boolean = false;
  private intervalId: number | null = null;
  private tickInterval: number = 1000; // Default 1 second
  private eventEmitter: EventEmitter;

  constructor(tickInterval: number = 1000) {
    this.tickInterval = tickInterval;
    this.eventEmitter = new EventEmitter();
  }

  start(): void {
    if (this.running) return;
    
    this.startTime = performance.now() - this.elapsedTime;
    this.running = true;
    
    this.intervalId = window.setInterval(() => {
      this.elapsedTime = performance.now() - this.startTime;
      this.eventEmitter.emit('tick', this.elapsedTime);
    }, this.tickInterval);
    
    this.eventEmitter.emit('start');
  }

  stop(): void {
    if (!this.running) return;
    
    this.running = false;
    
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.eventEmitter.emit('stop', this.elapsedTime);
  }

  reset(): void {
    const wasRunning = this.running;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.elapsedTime = 0;
    this.startTime = 0;
    
    this.eventEmitter.emit('reset');
    
    if (wasRunning) {
      this.start();
    }
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  isRunning(): boolean {
    return this.running;
  }

  setTickInterval(interval: number): void {
    this.tickInterval = interval;
    
    if (this.running) {
      this.stop();
      this.start();
    }
  }

  getTickInterval(): number {
    return this.tickInterval;
  }

  onTick(callback: (elapsedTime: number) => void): void {
    this.eventEmitter.on('tick', callback);
  }

  onStart(callback: () => void): void {
    this.eventEmitter.on('start', callback);
  }

  onStop(callback: (elapsedTime: number) => void): void {
    this.eventEmitter.on('stop', callback);
  }

  onReset(callback: () => void): void {
    this.eventEmitter.on('reset', callback);
  }

  destroy(): void {
    this.stop();
    this.eventEmitter.removeAllListeners();
  }
}
