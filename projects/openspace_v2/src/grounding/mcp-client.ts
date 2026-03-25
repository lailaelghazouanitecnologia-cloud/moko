import { MCPDependencyError } from './mcp-dependency-error';
import { MCPCommandNotFoundError } from './mcp-command-not-found-error';
import { MCPInstallationCancelledError } from './mcp-installation-cancelled-error';
import { MCPInstallationFailedError } from './mcp-installation-failed-error';

interface MCPTransport {
  connect(config: Record<string, unknown>): Promise<void>;
  disconnect(): Promise<void>;
  send(message: Record<string, unknown>): Promise<unknown>;
  isConnected(): boolean;
}

interface MCPSession {
  initialize(params: { clientInfo: { name: string; version: string }; capabilities?: Record<string, unknown> }): Promise<void>;
  close(): Promise<void>;
  ping(): Promise<boolean>;
  listTools(): Promise<{ tools: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> }>;
  callTool(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text?: string }> }>;
}

export class MCPClient {
  private readonly serverName: string;
  private readonly transport: MCPTransport;
  private session: MCPSession | null = null;
  private readonly capabilities: Map<string, unknown> = new Map();

  constructor(serverName: string, transport: MCPTransport) {
    if (!transport || typeof transport.connect !== 'function') {
      throw new TypeError('transport must be a valid MCPTransport implementation');
    }
    this.serverName = serverName;
    this.transport = transport;
  }

  async connect(config: Record<string, unknown>): Promise<void> {
    await this.transport.connect(config);
    
    this.session = {
      initialize: async (params) => {
        const response = await this.transport.send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params
        });
        if (typeof response === 'object' && response !== null && 'result' in response) {
          return;
        }
        throw new Error('Failed to initialize session');
      },
      close: async () => {
        await this.transport.send({
          jsonrpc: '2.0',
          id: 1,
          method: 'shutdown'
        });
      },
      ping: async () => {
        const response = await this.transport.send({
          jsonrpc: '2.0',
          id: 1,
          method: 'ping'
        });
        return typeof response === 'object' && response !== null && 'result' in response;
      },
      listTools: async () => {
        const response = await this.transport.send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        });
        if (typeof response === 'object' && response !== null && 'result' in response && 'tools' in response.result) {
          return response.result as { tools: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> };
        }
        return { tools: [] };
      },
      callTool: async (name: string, args: Record<string, unknown>) => {
        const response = await this.transport.send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name, arguments: args }
        });
        if (typeof response === 'object' && response !== null && 'result' in response && 'content' in response.result) {
          return response.result as { content: Array<{ type: string; text?: string }> };
        }
        throw new Error('Tool call failed');
      }
    };

    await this.session.initialize({
      clientInfo: { name: 'mcp-client', version: '1.0.0' },
      capabilities: {}
    });
  }

  async disconnect(): Promise<void> {
    if (this.session) {
      await this.session.close();
      this.session = null;
    }
    await this.transport.disconnect();
  }

  async listTools(): Promise<string[]> {
    if (!this.session) {
      throw new Error('Not connected');
    }
    const result = await this.session.listTools();
    return result.tools.map(tool => tool.name);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.session) {
      throw new Error('Not connected');
    }
    const result = await this.session.callTool(name, args);
    return result.content;
  }

  async ping(): Promise<boolean> {
    if (!this.session) {
      return false;
    }
    return await this.session.ping();
  }

  getVersion(): string {
    return '1.0.0';
  }
}
