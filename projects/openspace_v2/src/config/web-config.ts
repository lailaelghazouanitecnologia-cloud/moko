import { ConfigMixin } from './config-mixin';
import { BackendConfig } from './backend-config';

/**
 * Web backend configuration for AI Deep Research.
 * Manages settings such as enabled state, timeout, and retry limits.
 */
export class WebConfig extends BackendConfig {
  constructor(config: Record<string, unknown> = {}) {
    super(config);
  }

  static fromJSON(json: Record<string, unknown>): WebConfig {
    return new WebConfig(json);
  }

  toJSON(): Record<string, unknown> {
    return { ...this };
  }

  validate():
    | { readonly valid: true }
    | { readonly valid: false; readonly errors: ReadonlyArray<string> } {
    const errors: string[] = [];

    if (typeof this.enabled !== 'boolean') {
      errors.push('enabled must be a boolean');
    }

    if (typeof this.timeout !== 'number' || this.timeout <= 0) {
      errors.push('timeout must be a positive number (seconds)');
    }

    if (!Number.isInteger(this.max_retries) || this.max_retries < 0) {
      errors.push('max_retries must be a non-negative integer');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  clone(): WebConfig {
    return new WebConfig(this.toJSON());
  }

  /**
   * Merges another partial configuration into this instance.
   * @param partial - A partial configuration object to merge.
   * @returns This instance for method chaining.
   * @throws {TypeError} If the argument is not a plain object.
   */
  merge(partial: Record<string, unknown>): this {
    Object.assign(this, partial);
    return this;
  }
}
