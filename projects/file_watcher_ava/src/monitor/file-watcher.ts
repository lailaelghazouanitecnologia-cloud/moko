import { type EventEmitterCallback }  from  './types';

export class FileWatcher {
  private readonly path: string;
  private enabled: boolean;
  private readonly listeners: Map<string, EventEmitterCallback[]>;

  constructor(path: string) {
  if (path.length === 0) {
      throw new RangeError('path cannot be empty');
  }
    this.path = path;
    this.enabled = false;
    this.listeners = new Map();
  }

  start(): void {
    this.enabled = true;
  }

  stop(): void {
    this.enabled = false;
  }

  on(event: string, callback: EventEmitterCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventEmitterCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args));
    }
  }

  /**
   * Check if the file has been modified.
   * @returns Always false in this implementation.
   */
  isModified(): boolean {
    return false;
  }
}
