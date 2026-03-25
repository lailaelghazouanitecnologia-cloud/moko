import { ConfigMixin } from './config-mixin';

/**
 * Base backend configuration.
 * Extends ConfigMixin to provide typed access to backend-specific settings.
 */
export class BackendConfig extends ConfigMixin {
  readonly enabled: boolean;
  readonly timeout: number;
  readonly max_retries: number;

  constructor(config: Record<string, unknown> = {}) {
    super(config);
    this.enabled = this.get_value('enabled', true) as boolean;
    this.timeout = this.get_value('timeout', 30) as number;
    this.max_retries = this.get_value('max_retries', 3) as number;
  }

  validate(): { success: true } | { success: false; errors: string[] } {
    const errors: string[] = [];

    if (typeof this.enabled !== 'boolean') {
      errors.push('enabled must be a boolean');
    }

    if (typeof this.timeout !== 'number' || this.timeout <= 0 || !Number.isFinite(this.timeout)) {
      errors.push('timeout must be a positive finite number');
    }

    if (typeof this.max_retries !== 'number' || this.max_retries < 0 || !Number.isInteger(this.max_retries)) {
      errors.push('max_retries must be a non-negative integer');
    }

    return errors.length === 0 ? { success: true } : { success: false, errors };
  }

  toJSON(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      timeout: this.timeout,
      max_retries: this.max_retries,
    };
  }

  static fromJSON(json: Record<string, unknown>): BackendConfig {
    return new BackendConfig(json);
  }

  clone(): BackendConfig {
    return new BackendConfig(this.toJSON());
  }
}
