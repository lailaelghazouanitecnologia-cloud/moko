import { AnthropicUIClient } from './anthropic-ui-client';
import { ProviderAPI } from './provider-api';
import { UISession } from './ui-session';
import { LocalUIConnector } from './local-ui-connector';
import { MCPBridge } from './mcp-bridge';
import { MCPDependencyFault } from './mcp-dependency-fault';
import { MCPCommandMissingFault } from './mcp-command-missing-fault';
import { MCPInstallAbortFault } from './mcp-install-abort-fault';
import { MCPInstallFailFault } from './mcp-install-fail-fault';
import { UITool } from './ui-tool';
import { UIConnector } from './ui-connector';

export class ProviderUI implements ProviderAPI {
  readonly backendId: string;
  readonly capabilities: Set<string>;
  private readonly connector: UIConnector;
  private session: UISession | undefined;
  private readonly bridge: MCPBridge | undefined;

  constructor(
    backendId: string,
    capabilities: Set<string>,
    connector: UIConnector,
    bridge?: MCPBridge
  ) {
    if (!connector || typeof connector.connect !== 'function') {
      throw new TypeError('connector must be a valid UIConnector');
    }
    this.backendId = backendId;
    this.capabilities = capabilities;
    this.connector = connector;
    this.bridge = bridge;
  }

  async connect(config: Record<string, unknown>): Promise<void> {
    if (this.session?.isActive) {
      throw new Error('Session already active');
    }
    this.session = new UISession(
      crypto.randomUUID(),
      'local',
      this.connector,
      new Map<string, UITool>()
    );
    await this.session.start();
    if (this.bridge) {
      await this.bridge.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.session?.isActive) {
      await this.session.stop();
    }
    if (this.bridge) {
      await this.bridge.disconnect();
    }
    this.session = undefined;
  }

  async listTools(): Promise<UITool[]> {
    if (!this.session?.isActive) {
      throw new Error('No active session');
    }
    const toolNames = await this.session.listTools();
    const tools: UITool[] = [];
    for (const name of toolNames) {
      const tool = this.session.tools.get(name);
      if (tool) {
        tools.push(tool);
      }
    }
    return tools;
  }

  async executeTool(toolId: string, params: Record<string, unknown>): Promise<ToolResult> {
    if (!this.session?.isActive) {
      throw new Error('No active session');
    }
    return this.session.executeTool(toolId, params);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.session?.isActive) {
      return false;
    }
    try {
      await this.session.takeScreenshot();
      return true;
    } catch {
      return false;
    }
  }

  async getLogs(limit?: number): Promise<string[]> {
    if (!this.session?.isActive) {
      throw new Error('No active session');
    }
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
      throw new RangeError('limit must be a non-negative integer');
    }
    const logs = await this.session.getLogs();
    return limit !== undefined ? logs.slice(-limit) : logs;
  }

  getSession(): UISession | undefined {
    return this.session;
  }

  getConnector(): UIConnector {
    return this.connector;
  }

  getBridge(): MCPBridge | undefined {
    return this.bridge;
  }
}

type ToolResult = { kind: 'ok'; value: unknown } | { kind: 'error'; error: string };
