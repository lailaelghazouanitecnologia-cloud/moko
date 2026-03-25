import { OpenSpaceUI } from './open-space-ui';

export class UILoggingHandler {
  private readonly ui: OpenSpaceUI;

  constructor(ui: OpenSpaceUI) {
    this.ui = ui;
  }

  emit(record: unknown): void {
    const level = (record as { levelname?: string })?.levelname ?? 'info';
    const message = (record as { getMessage?: () => string })?.getMessage?.() ?? 'unknown message';
    this.ui.add_log(message, level.toLowerCase());
  }
}
