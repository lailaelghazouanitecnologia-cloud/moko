import { Logger } from '../utils';

type SystemInfo = Record<string, unknown>;
type Size = { width: number; height: number };
type Point = { x: number; y: number };

export class SystemInfoClient {
  private readonly base_url: string;
  private readonly timeout: number;
  private cache: System | null = null;

  constructor(base_url: string | null = null, timeout: number = 10) {
    if (timeout <= 0) throw new RangeError('timeout must be positive');
    this.base_url = (base_url ?? 'http://localhost:8080').replace(/\/$/, '');
    this.timeout = timeout;
  }

  async get_system_info(use_cache: boolean = true): Promise<Sys> {
    if (use_cache && this.cache) return this.cache;
    const res = await fetch(`${this.base_url}/system/info`, { signal: this.timeoutSignal() });
    if (!res.ok) throw new Error(`system info: ${res.status}`);
    const data = await res.json() as SystemInfo;
    if (use_cache) this.cache = data;
    return data;
  }

  async get_screen_size(): Size {
    const res = await fetch(`${this.base_url}/system/screen_size`, { signal: this.timeoutSignal() });
    if (!res.ok) throw new Error(`screen size: ${res.status}`);
    return await res.json() as Size;
  }

  async get_cursor_position(): Point {
    const res = await fetch(`${this.base_url}/system/cursor`, { signal: this.timeoutSignal() });
    if (!res.ok) throw new Error(`cursor position: ${<any>res.status}`);
    return await res.json() as Point;
  }

  clear_cache(): void {
    this.cache = null;
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  private timeoutSignal(): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.timeout * 1000);
    return controller.signal;
  }
}
