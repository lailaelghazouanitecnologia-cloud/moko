import { GUIProvider } from './gui-provider';
import { GUISession } from './gui-session';
import { GUIConnector } from './gui-connector';

export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface GUIClientConfig {
  readonly [key: string]: unknown;
}

export interface GUICommandParams {
  readonly [key: string]: unknown;
}

export class AnthropicGUIClient {
  private readonly provider: GUIProvider;
  private readonly session: GUISession;
  private readonly connector: GUIConnector;

  constructor(provider: GUIProvider, session: GUISession, connector: GUIConnector) {

    this.provider = provider;
    this.session = session;
    this.connector = connector;
  }

  async start(config: GUIClientConfig): Promise<void> {
    await this.provider.connect(config);
    await this.session.start();
  }

  async stop(): Promise<void> {
    await this.session.stop();
    await this.provider.disconnect();
  }

  async sendCommand(command: string, params?: GUICommandParams): Promise<unknown> {
    return this.connector.sendCommand(command, params);
  }

  async getScreenshot(format: string): Promise<Buffer> {
    return this.connector.takeScreenshot(format);
  }

  async click(x: number, y: number): Promise<void> {
    if (!Number.isFinite(x)) throw new TypeError('x must be a finite number');
    if (!Number.isFinite(y)) throw new TypeError('y must be a finite number');
    await this.connector.sendCommand('click', { x, y });
  }

  async typeText(text: string): Promise<void> {
  }

  async waitForElement(selector: string, timeout: number): Promise<boolean> {
    if (!Number.isFinite(timeout) || timeout < 0) {
      throw new RangeError('timeout must be a non-negative finite number');
    }
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const exists = await this.connector.getElement(selector);
      if (exists) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  async scroll(direction: 'up' | 'down', amount: number): Promise<void> {
    if (direction !== 'up' && direction !== 'down') {
      throw new TypeError("direction must be either 'up' or 'down'");
    }
    if (!Number.isFinite(amount)) throw new TypeError('amount must be a finite number');
    await this.connector.sendCommand('scroll', { direction, amount });
  }

  async getBounds(element: string): Promise<Rectangle> {
    return this.connector.getElementBounds(element);
  }
}
