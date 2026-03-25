import { GUIConnector } from './gui-connector';
import { GUIAgentTool } from './gui-agent-tool';

export interface ToolResult {
  /** Whether the action succeeded. */
  readonly success: boolean;
  /** Optional data returned by the action. */
  readonly data?: unknown;
  /** Optional error message if the action failed. */
  readonly error?: string;
}

/**
 * Manages a single GUI automation session.
 */
export class GUISession {
  /** Unique identifier for this session. */
  public readonly sessionId: string;
  /** Connector used to interact with the GUI. */
  private readonly connector: GUIConnector;
  /** Whether the session is currently active. */
  public isActive: boolean;
  /** Time when the session was created. */
  public readonly startTime: Date;
  /** Time when the session was stopped, or null if still active. */
  public endTime: Date | null;

  /**
   * Creates a new GUI session.
   * @param sessionId - Unique identifier for this session.
   * @param connector - Connector to interact with the GUI.
   */
  constructor(sessionId: string, connector: GUIConnector) {
    this.sessionId = sessionId;
    this.connector = connector;
    this.isActive = false;
    this.startTime = new Date();
    this.endTime = null;
  }

  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('Session already active');
    }
    await this.connector.connect({ sessionId: this.sessionId });
    this.isActive = true;
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      throw new Error('Session not active');
    }
    await this.connector.disconnect();
    this.isActive = false;
    this.endTime = new Date();
  }

  async captureState(): Promise<Record<string, unknown>> {
    if (!this.isActive) {
      throw new Error('Session not active');
    }
    const state = await this.connector.sendCommand('captureState');
    return state as Record<string, unknown>;
  }

  async executeAction(action: GUIAgentTool): Promise<ToolResult> {
    if (!this.isActive) {
      throw new Error('Session not active');
    }
    try {
      const result = await action.start();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getElement(selector: string): Promise<unknown> {
    if (!this.isActive) {
      throw new Error('Session not active');
    }
    return await this.connector.sendCommand('getElement', { selector });
  }

  async listWindows(): Promise<string[]> {
    if (!this.isActive) {
      throw new Error('Session not active');
    }
    const windows = await this.connector.sendCommand('listWindows');
    return windows as string[];
  }

  async focusWindow(windowId: string): Promise<void> {
    if (!this.isActive) {
      throw new Error('Session not active');
    }
    await this.connector.sendCommand('focusWindow', { windowId });
  }

  async takeScreenshot(): Promise<Buffer> {
    if (!this.isActive) {
      throw new Error('Session not active');
    }
    return await this.connector.takeScreenshot();
  }

  async getLogs(): Promise<string[]> {
    if (!this.isActive) {
      throw new Error('Session not active');
    }
    const logs = await this.connector.sendCommand('getLogs');
    return logs as string[];
  }
}
