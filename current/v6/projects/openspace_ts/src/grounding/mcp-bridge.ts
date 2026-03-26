import { UIConnector } from './ui-connector'
import { UITool } from './ui-tool'
import { MCPDependencyFault } from './mcp-dependency-fault'
import { MCPCommandMissingFault } from './mcp-command-missing-fault';
import { MCPInstallAbortFault } from './mcp-install-abort-fault'
import { MCPInstallFailFault } from './mcp-install-fail-fault'

export class MCPBridge {
  private readonly mcpClient: unknown
  private readonly uiConnector: UIConnector
  private readonly sessionId: string
  private readonly commandMap: Map<string, string>

  constructor(
    mcpClient: unknown,
    uiConnector: UIConnector,
    sessionId: string,
    commandMap: Map<string, string> = new Map()
  ) {
    this.mcpClient = mcpClient
    this.uiConnector = uiConnector
    this.sessionId = sessionId
    this.commandMap = commandMap
  }

  async connect(): Promise<void> {
      try {
        await this.mcpClient.connect()
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to connect: ${message}`);
      }
  }

  async disconnect(): Promise<void> {
      try {
        await this.mcpClient.disconnect()
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to connect: ${message}`);
      }
  }

  async listTools(): Promise<UITool[]> {
    return await this.mcpClient.list_tools()
  }

  async executeTool(toolName: string, params: unknown): unknown {
    return await this.mcpClient.execute(toolName, params)
  }

  async installMCP(packageName: string): Promise<void> {
    const result = await this.mcpClient.install(packageName)
    if (result.exitCode !== 0) {
      throw MCPInstallFailFault.fromExit(result.exitCode, result.stderr, packageName)
    }
  }

  validateEnv(): void {
    const missing = this.mcpClient.validateEnv()
    if (missing.length > 0) {
      throw new MCPDependencyFault(missing[0])
    }
  }

  mapCommand(cmd: string): string {
    return this.commandMap.get(cmd) ?? cmd
  }

  handleFault(error: Error): never {
    if (error.message.includes('command not found')) {
      throw new MCPCommandMissingFault(error.message, this.mcpClient)
    }
    if (error.message.includes('install aborted')) {
      throw new MCPInstallAbortFault(error)
    }
    throw error
  }
}
