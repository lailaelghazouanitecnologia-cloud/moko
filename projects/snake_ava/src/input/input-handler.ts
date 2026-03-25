import { KeyMapper } from './key-mapper';

export class InputHandler {
  private readonly keyMapper: KeyMapper;
  private readonly queue: string[];
  private enabled: boolean;

  constructor(keyMapper: KeyMapper) {
    this.keyMapper = keyMapper;
    this.queue = [];
    this.enabled = false;
  }

  start(): void {
    if (this.enabled) return;
    this.enabled = true;
    window.addEventListener('keydown', this.handleKeyDown);
  }

  stop(): void {
    if (!this.enabled) return;
    this.enabled = false;
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  poll(): string | undefined {
    return this.queue.shift();
  }

  peek(): string | undefined {
    return this.queue[0];
  }

  clear(): void {
    this.queue.length = 0;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    enabled ? this.start() : this.stop();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    const command = this.keyMapper.commandFor(event.key);
    if (command) {
      this.queue.push(command);
    }
  };
}
