import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

export class CliConfig {
  private configPath: string;
  private settings: Map<string, any>;

  constructor(configPath?: string) {
    this.configPath = configPath || join(homedir(), '.roska', 'config.json');
    this.settings = new Map<string, any>();
  }

  async load(): Promise<void> {
    try {
      if (existsSync(this.configPath)) {
        const data = await fs.readFile(this.configPath, 'utf-8');
        const parsed = JSON.parse(data);
        this.settings = new Map(Object.entries(parsed));
      } else {
        this.reset();
      }
    } catch (error) {
      this.reset();
    }
  }

  async save(): Promise<void> {
    const dir = dirname(this.configPath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
    const data = Object.fromEntries(this.settings);
    await fs.writeFile(this.configPath, JSON.stringify(data, null, 2));
  }

  get(key: string, defaultValue?: any): any {
    return this.settings.get(key) ?? defaultValue;
  }

  set(key: string, value: any): void {
    this.settings.set(key, value);
  }

  getDefaultBranch(): string {
    return this.get('defaultBranch', 'main');
  }

  getDefaultPath(): string {
    return this.get('defaultPath', join(homedir(), 'worktrees'));
  }

  getColorEnabled(): boolean {
    return this.get('colorEnabled', true);
  }

  setColorEnabled(enabled: boolean): void {
    this.set('colorEnabled', enabled);
  }

  getVerbose(): boolean {
    return this.get('verbose', false);
  }

  setVerbose(verbose: boolean): void {
    this.set('verbose', verbose);
  }

  getAliases(): Map<string, string> {
    const aliases = this.get('aliases', {});
    return new Map(Object.entries(aliases));
  }

  addAlias(command: string, alias: string): void {
    const aliases = Object.fromEntries(this.getAliases());
    aliases[command] = alias;
    this.set('aliases', aliases);
  }

  removeAlias(command: string): void {
    const aliases = Object.fromEntries(this.getAliases());
    delete aliases[command];
    this.set('aliases', aliases);
  }

  reset(): void {
    this.settings.clear();
    this.set('defaultBranch', 'main');
    this.set('defaultPath', join(homedir(), 'worktrees'));
    this.set('colorEnabled', true);
    this.set('verbose', false);
    this.set('aliases', {});
  }
}
