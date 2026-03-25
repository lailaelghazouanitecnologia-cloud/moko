import { ConfigMixin } from './config-mixin';
import { BackendConfig } from './index';

export class GUIConfig extends BackendConfig {
  readonly mode: 'local' | 'server';
  readonly retry_interval: number;
  readonly driver_type: string;
  readonly fails: boolean;
  readonly screenshot_on_error: boolean;
  readonly pkgs_prefix: string;

  constructor(config: Record<string, unknown>) {
    super(config);
    this.mode = this.get_value('mode', 'local') as 'local' | 'server';
    this.retry_interval = this.get_value('retry_interval', 0.5) as number;
    this.driver_type = this.get_value('driver_type', 'undetected') as string;
    this.failsafe = this.get_value('failsafe, true) as boolean;
    this.screenshot_on_error = this.get_value('screenshot_on_error', true) as boolean;
    this.pkgs_prefix = this.get_value('pkgs_prefix', 'openspace') as string;
  }

  static fromJSON(json: Record<string, unknown>): GUIConfig {
    return new GUIConfig(json);
  }
}