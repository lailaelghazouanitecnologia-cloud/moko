import { AnthropicUIClient } from './index';
import { ProviderAPI } from './provider-api';
import { UISession } from './ui-session';
import { LocalUIConnector } from './local-ui-connector';
import { MCPBridge } from './mcp-bridge';
import { MCPDependencyFault } from './mcp-dependency-fault';
import { MCPCommandMissingFault } from './mcp-command-missing-fault';
// UNRESOLVED:  import { MCPInstallAbortedFault } from './mcp-install-aborted-fault';
import { MCPInstallFailFault } from './mcp-install-fail-fault';
import { ProviderUI } from './provider-ui';
import { UITool } from './ui-tool';

export interface UIConnector {
  connect(): Promise<void>;
  disconnect(): void;
  listTools(): Promise<UITool[]>;
  executeTool(toolId: string, params: Record<string, unknown>): Promise<unknown>;
  healthCheck(): Promise<HealthResult>;
}

type HealthResult = { ok: true } | { ok: false; error: unknown };

export class LocalUIConnector implements UIConnector {
  private readonly bridge: MCPBridge;
  private readonly provider: ProviderAPI;
  private session: UISession | null = null;

  constructor(bridge: MCPBridge, provider: ProviderAPI) {
    this.bridge = bridge;
    this.provider = provider;
  }

  async connect(): Promise<void> {
    await this.bridge.connect();
    this.session = new UISession(this.provider);
  }

  disconnect(): void {
    this.bridge.disconnect();
    this.session = null;
  }

  listTools(): Promise<UITool[]> {
    if (!this.session) throw new RangeError('Not connected');
    return this.session.listTools();
  }

  executeTool(toolId: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.session) throw new RangeError('Not connected');
    return this.session.executeTool(toolId, params);
  }

  healthCheck(): Promise<HealthResult> {
    return this.bridge.healthCheck()
      .then(() => ({ ok: true }))
      .catch(error => ({ ok: false, error }));
  }
}
