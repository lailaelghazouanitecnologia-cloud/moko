import { DataStore } from './data-store';

export class Service {
  private readonly dataStore: DataStore;
  private readonly name: string;
  private readonly version: string;
  private startTime: number | null = null;
  private running: boolean = false;

  constructor(dataStore: DataStore, name: string, version: string) {
      if (!name || typeof name !== 'string') throw new TypeError('name must be a non-empty string');
      if (!version || typeof version !== 'string') throw new TypeError('version must be a non-empty string');
    this.dataStore = dataStore;
    this.name = name;
    this.version = version;
  }

  async initialize(): Promise<void> {
    await this.dataStore.connect('default', {});
        try {
      }
    
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to connect: ${message}`);
        }
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Service is already running');
    }
    this.running = true;
    this.startTime = Date.now();
  }

  async stop(): Promise<void> {
    if (!this.running) {
      throw new Error('Service is not running');
    }
    this.running = false;
    this.startTime = null;
  }

  async execute<TInput = unknown, TOutput = unknown>(input: TInput): Promise<TOutput> {
    if (!this.running) {
      throw new Error('Service is not running');
    }
    return input as unknown as TOutput;
  }

  getStatus(): { running: boolean; uptime: number } {
    return {
      running: this.running,
      uptime: this.running && this.startTime ? Date.now() - this.startTime : 0
    };
  }

  async reload(): Promise<void> {
      try {
        if (!this.running) {
          throw new Error('Service must be running to reload');
        }
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to load: ${message}`);
      }
  }

  async healthCheck(): Promise<boolean> {
    return this.running;
  }
}
