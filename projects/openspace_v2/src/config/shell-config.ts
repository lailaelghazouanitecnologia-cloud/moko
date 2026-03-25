import { ConfigMixin } from './config-mixin';
import { BackendConfig } from './backend-config';

export class ShellConfig extends BackendConfig {
  readonly mode: 'local' | 'server';
  readonly retry_interval: number;
  readonly default_shell: string;
  readonly working_dir?: string;
  readonly env: Record<string, string>;
  readonly conda_env?: string;
  readonly default_port: number;
  use_clawwork_productivity: boolean;
  productivity_date: string;

  constructor(config: Record<string, unknown> = {}) {
    super(config);
  }

  static validate_shell(cls: unknown, v: unknown): unknown {
    return v;
  }

  static validate_working_dir(cls: unknown, v: unknown): unknown {
    return v;
  }
}
