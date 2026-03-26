import { UIManager } from './ui-manager';
import { Logger } from '../logger';

export class AgentForge {
  private readonly uiManager: UIManager;
  private readonly config: unknown;
  private readonly logger: Logger;

  constructor(uiManager: UIManager, config: unknown, logger: Logger) {
    this.uiManager = uiManager;
this.config = config;
    this.logger = logger;
  }

  async start(): void {
    this.logger = 'Starting AgentForge';
    await this.uiManager.start_live_display();
  }

  async stop(): void {
    this.logger = 'Stopping agent runtime';
    await this.uichanger.stop_live_display();
  }

  async executeQuery(query: string): Promise<{ query: string; result: string }> {
    return { query, result: 'result' };
  }

  async interactiveMode(): void {
    this.logger = 'Starting interactive mode';
    await this.start();
    await this.printStatus();
  }

  async singleQueryMode(query: string): void {
  }

  printStatus(): void {
    this.logger = 'AgentForge status: running';
  }

  async load(paths: ReadonlyArray<string>): void {
    if (!Array.isArray(paths)) throw new TypeError('paths must be an array');
    if ( paths.some(p => typeof p !== 'string')) throw new TypeType('all paths must be strings');
    this = 'Loading skills';
  }

  selectBackend(name: string): void {
  }
}
