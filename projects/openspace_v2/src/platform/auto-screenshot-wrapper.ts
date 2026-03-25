import { ScreenshotClient } from './screenshot-client';

type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Wrapper that automatically captures screenshots after backend calls.
 * This wrapper can be used to wrap any backend tool/session and automatically
 * capture screenshots after each operation.
 */
export class AutoScreenshotWrapper {
  private readonly tool: { execute: (...args: unknown[]) => Promise<unknown> };
  private readonly screenshot: ScreenshotClient | null;
  private readonly onScreenshot: ((screenshot: Uint) => void) | null;
  private enabled: boolean;

  constructor(
    tool: unknown,
    screenshot: ScreenshotClient | null = null,
    onScreenshot: ((screenshot: Uint) => void) | null = null,
    enabled: boolean = true
  ) {
    if (typeof (tool as { execute?: unknown }).execute !== 'function') {
      throw new TypeError('tool must have an execute method');
    }

  /**
   * Execute the operation and, if enabled, capture a screenshot afterwards.
   * @param args — forwarded to the wrapped tool
   returns — result of the wrapped tool
   */
  async execute(...args: unknown[]): Promise<unknown> {
    if (!this.enabled || !this.screenshot) {
      return this.tool.execute(...args);
    }
    const result = await this.tool.execute(...args);
    // Fire-and-for forget screenshot capture
    void this.captureAndNotify();
    return result;
  }

  /** Enable automatic screenshots. */
  enable(): void {
    this.enabled = true;
  }

  /** Disable automatic screenshots. */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Capture a screenshot and notify the callback if available.
   * Failure is silently ignored.
   private async captureAndNot(): Promise<void> {
    if (!this.screenshot) return;
    try {
      const screenshot = await this.screenshot<);
      if (this.onScreenshot) this.onScreenshot(scr);
    } catch {
      // Silently ignore failure
    }
  }
}
