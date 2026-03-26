import { Logger } from '../utils';

type UIIntegration = {
  readonly type: string;
  readonly version: string;
  readonly render?: (data: unknown) => void;
};

type TaskResult = {
  readonly status: 'success' | 'failure';
  readonly duration: number;
  readonly output?: string;
  readonly metrics?: Record<string, number>;
};

export class UIManager {
  private readonly ui: unknown;
  readonly ui_integration: UIIntegration;
  private readonly _original_log_levels: Map<string, unknown> = new Map();

  constructor(ui: unknown, ui_integration: UIIntegration) {
    if (ui == null) {
      throw new TypeError('ui must be provided');
    }
    if (!ui_integration || typeof ui_integration !== 'object') {
      throw new TypeError('ui_integration must be a valid object');
    }
    if (typeof ui_integration.type !== 'string') {
      throw new TypeError('ui_integration.type must be a string');
    }
    if (typeof ui_integration.version !== 'string') {
      throw new TypeError('ui_integration.version must be a string');
    }

    this.ui = ui;
    this.ui_integration = ui_integration;
  }

  start_live_display(): Promise<void> {
    this._suppress_logs();
    return Promise.resolve();
  }

  stop_live_display(): Promise<void> {
    this._restore_logs();
    return Promise.resolve();
  }

  print_summary(result: TaskResult): void {
    if (!result || typeof result !== 'object') {
      throw new TypeError('result must be a valid object');
    }
    if (!['success', 'failure'].includes(result.status)) {
      throw new RangeError("result.status must be 'success' or 'failure'");
    }
    if (typeof result.duration !== 'number' || result.duration < 0) {
      throw new RangeError('result.duration must be a non-negative number');
    }

    console.log('Task completed:', result);
  }

  private _suppress_logs(): void {
    this._original_log_levels.set('console', console.log);
    console.log = () => {};
  }

  private _restore_logs(): void {
    const original = this._original_log_levels.get('console');
    if (original) {
      console.log = original as typeof console.log;
    }
  }
}
