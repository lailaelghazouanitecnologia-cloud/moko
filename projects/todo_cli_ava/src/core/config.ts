import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Application configuration manager
 */
export class Config {
  env: string = 'development';
  port: number = 3000;
  debug: boolean = false;

  private store: Record<string, unknown> = {};

  static readonly DEFAULT_PATH: string = './config.json';

  /**
   * Load config from file
   * @param path - Path to the config file (defaults to Config.DEFAULT_PATH)
   * @returns Config instance
   * @throws Error if file not found or JSON parsing fails
   */
  static load(path: string = Config.DEFAULT_PATH): Config {
    const resolvedPath = resolve(path);
    if (!existsSync(resolvedPath)) {
      throw new Error(`Config file not found: ${resolvedPath}`);
    }
    const raw = readFileSync(resolvedPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const cfg = new Config();
    cfg.store = parsed;
    if (typeof parsed.env === 'string') cfg.env = parsed.env;
    if (typeof parsed.port === 'number') cfg.port = parsed.port;
    if (typeof parsed.debug === 'boolean') cfg.debug = parsed.debug;
    return cfg;
  }

  /**
   * Validate configuration values
   * @returns true if all values are valid, false otherwise
   */
  validate(): boolean {
    if (!['development', 'production', 'test'].includes(this.env)) return false;
    if (!Number.isInteger(this.port) || this.port < 1 || this.port > 65535) return false;
    return true;
  }

  /**
   * Get config value
   * @param key - Key to retrieve
   * @returns Value associated with the key, or undefined if not found
   */
  get(key: string): unknown {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('Key must be a non-empty string');
    }
    return this.store[key];
  }

  /**
   * Set config value
   * @param key - Key to set
   * @param value - Value to associate with the key
   */
  set(key: string, value: unknown): void {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('Key must be a non-empty string');
    }
    this.store[key] = value;
  }

  /**
   * Check if a key exists in the store
   * @param key - Key to check
   * @returns true if the key exists, false otherwise
   */
  has(key: string): boolean {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('Key must be a non-empty string');
    }
    return Object.prototype.hasOwnProperty.call(this.store, key);
  }

  /**
   * Remove a key from the store
   * @param key - Key to remove
   * @returns true if the key existed and was removed, false otherwise
   */
  remove(key: string): boolean {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('Key must be a non-empty string');
    }
    if (this.has(key)) {
      delete this.store[key];
      return true;
    }
    return false;
  }

  /**
   * Clear all keys from the store
   */
  clear(): void {
    this.store = {};
  }

  /**
   * Get all keys in the store
   * @returns Array of keys
   */
  keys(): string[] {
    return Object.keys(this.store);
  }

  /**
   * Get the number of keys in the store
   * @returns Number of keys
   */
  size(): number {
    return this.keys().length;
  }

  /**
   * Serialize the current config to a plain object
   * @returns Plain object representation of the config
   */
  toObject(): Record<string, unknown> {
    return {
      env: this.env,
      port: this.port,
      debug: this.debug,
      ...this.store
    };
  }

  /**
   * Create a deep clone of the current config
   * @returns New Config instance with cloned data
   */
  clone(): Config {
    const cloned = new Config();
    cloned.env = this.env;
    cloned.port = this.port;
    cloned.debug = this.debug;
    cloned.store = JSON.parse(JSON.stringify(this.store));
    return cloned;
  }

  /**
   * Merge another config into this one
   * @param other - Config to merge
   */
  merge(other: Config): void {
    if (!(other instanceof Config)) {
      throw new Error('Argument must be an instance of Config');
    }
    this.env = other.env;
    this.port = other.port;
    this.debug = other.debug;
    this.store = { ...this.store, ...other.store };
  }
}
