export class EventListener {
  private readonly listeners = new Map<string, Function[]>();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
  }

  emit(event: string, ...args: unknown[]): boolean {
    return false;
  }

  once(event: string, listener: Function): void {
  }

  listenerCount(event: string): number {
    return 0;
  }

  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}
