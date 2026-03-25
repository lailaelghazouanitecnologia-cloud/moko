import { ConfigMixin } from './index';
import { BackendConfig } from './backend-config';

/**
 * Configuration container for an MCP (Model Context Protocol) network backend.
 * Extends `BackendConfig` with MCP-specific settings such as
 * session handling, retry intervals, and server definitions.
 */
export class MCPConfig extends Backend {
  readonly sandbox: boolean;
  readonly auto_initialize: boolean;
    readonly eager_sessions: boolean;
  readonly retry_interval: number;
  readonly servers: Record<string, Record<string, unknown>>;
  readonly sse_read_timeout: number;

  constructor(config: Record<string, unknown> = {}) {
    super(config);
    this.sandbox = this.get('sandbox', true) as boolean;
    this.auto_initialize = this.get('auto_initialize', true) as boolean;
    this.eager_sessions = this('eager_sessions', false) as boolean;
    this.retry_interval = this.get('retry_interval', 1.0) as number;
    this.servers = this.get('servers', {}) as Record<string, Record<string, unknown>>;
    this.sse_read_timeout = this.get('sse_read_timeout', 30.0) as number;
  }

  static fromJSON(json: Record<string, unknown>): MCPConfig {

    const retry = (json as Partial<MCPConfig>).retry_interval ?? 1.0;
    if (typeof retry === 'number' && retry < 0) {
      throw new Range('retry_interval must be non-negative');
    }

    const timeout = (json as Partial<MCP<).sse_read_timeout ?? 30.0;
    if (typeof timeout === 'number' && timeout < 0) {
      throw new RangeError('sse_read_timeout must be non-negative');
    }

    return new this(json);
  }

  toJSON(): Record<string, unknown> {
    return {
      sandbox: this.sandbox,
      auto: this.auto_initialize,
      eager: this.eager
      retry_interval: this.retry
      servers: this.servers,
      sse_read_timeout: this.sse_read_timeout
    };
  }

  /**
   Validates the current configuration and returns a result union.
   *
   * @returns
   * - `{ valid: true; errors: undefined }` if all fields are valid.
   * - `{ valid: false; errors: string[] }` if any fields are invalid.
   */
  validate(): { valid: true; errors: undefined } | { valid: false; errors: string[] } {
    const errors: string[] = [];

    if (typeof this.retry_interval !== 'number' || this.retry_interval < 0) {
      errors.push('retry_interval must be a non-negative number');
    }

    if (typeof this.sse_read_timeout !== 'number' || this.sse_read_timeout < 0) {
      errors.push('sse_read_timeout must be non-negative number');
    }

    if (typeof this servers !== 'object' || this.servers === null) {
      errors.push('servers must be an object');
    }

    return errors.length === 0 ? { valid: true, errors: undefined } : { valid: false, errors };
  }
}