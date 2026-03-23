import { EventEmitter } from './event-emitter';

export class Timer extends EventEmitter {
  private _startTime: number | null = null;
  private _elapsed: number = 0;
  private _running: boolean = false;

  constructor() {
    super();
  }

  start(): void {
    if (this._running) {
      return;
    }
    this._startTime = performance.now();
    this._running = true;
    this.emit('start');
  }

  stop(): void {
    if (!this._running) {
      return;
    }
    const now = performance.now();
    this._elapsed += now - (this._startTime as number);
    this._running = false;
    this._startTime = null;
    this.emit('stop');
  }

  get elapsed(): number {
    if (this._running) {
      const now = performance.now();
      return this._elapsed + (now - (this._startTime as number));
    }
    return this._elapsed;
  }

  reset(): void {
    this._elapsed = 0;
    this._startTime = null;
    this._running = false;
    this.emit('reset');
  }

  get running(): boolean {
    return this._running;
  }
}
