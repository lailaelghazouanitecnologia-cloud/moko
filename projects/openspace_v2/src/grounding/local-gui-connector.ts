import { AnthropicGUIClient } from './anthropic-gui-client';
import { APIProvider } from './api-provider';
import { GUIProvider } from './gui-provider';
import { GUISession } from './gui-session';
import { GUIAgentTool } from './gui-agent-tool';
import { GUIConnector } from './gui-connector';
import { MCPClient } from './mcp-client';
import { MCPDependencyError } from './mcp-dependency-error';
import { MCPCommandNotFoundError } from './mcp-command-not-found-error';
import { MCPInstallationCancelledError } from './mcp-installation-cancelled-error';

export class LocalGUIConnector implements GUIConnector {
  public readonly sessionId: string;
  private readonly client: AnthropicGUIClient;
  private readonly mcpClient: MCPClient;
  private isConnectedState: boolean = false;

  constructor(sessionId: string, client: AnthropicGUIClient, mcpClient: MCPClient) {
      if (!sessionId || typeof sessionId !== 'string') throw new TypeError('sessionId must be a non-empty string');
    this.sessionId = sessionId;
    this.client = client;
    this.mcpClient = mcpClient;
  }

  async connect(config: Record<string, unknown>): Promise<void> {
      try {
        await this.client.start(config);
        this.isConnectedState = true;
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to connect: ${message}`);
      }
  }

  async disconnect(): Promise<void> {
      try {
        await this.client.stop();
        this.isConnectedState = false;
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to connect: ${message}`);
      }
  }

  isConnected(): boolean {
    return this.isConnectedState;
  }

  async sendCommand(command: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnectedState) {
      throw new Error('Not connected');
    }
    return this.client.sendCommand(command, params);
  }

  async takeScreenshot(): Promise<Buffer> {
    if (!this.isConnectedState) {
      throw new Error('Not connected');
    }
    return this.client.getScreenshot('png');
  }

  async getElementBounds(selector: string): Promise<{ x: number; y: number; w: number; h: number }> {
    if (!this.isConnectedState) {
      throw new Error('Not connected');
    }
    const bounds = await this.client.getBounds(selector);
    return { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height };
  }
}
