import { UIConnector } from './ui-connector'
import { UITool } from './ui-tool'

type BackendType = 'anthropic' | 'local' | 'mcp'

type ToolResult = { kind: 'success'; value: unknown } | { kind: 'error'; error: string }

type RecordingManager = unknown

export class UISession {
  private readonly sessionId: string
  private readonly backendType: BackendType
  private readonly connector: UIConnector
  private readonly tools: Map<string, UITool>
  private isActive: boolean
  private recorder: RecordingManager | undefined

  constructor(
    sessionId: string,
    backendType: BackendType,
    connector: UIConnector
  ) {
    if (!['anthropic', 'local', 'mcp'].includes(backendType)) {
      throw new TypeError('backendType must be a valid BackendType')
    }

    this.sessionId = sessionId
    this.backendType = backendType
    this.connector = connector
    this.tools = new Map()
    this.isActive = false
  }

  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('Session is already active')
    }
    await this.connector.connect()
    this.isActive = true
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      throw new Error('Session is not active')
    }
    await this.connector.disconnect()
    this.isActive = false
  }

  async executeTool(toolId: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(toolId)
    if (!tool) {
      return { kind: 'error', error: `Tool not found: ${toolId}` }
    }
    try {
      const result = await tool.run(args)
      return { kind: 'success', value: result }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { kind: 'error', error: message }
    }
  }

  async listTools(): Promise<string[]> {
    return Array.from(this.tools.keys())
  }

  async takeScreenshot(): Promise<Buffer> {
    if (!this.isActive) {
      throw new Error('Cannot take screenshot: session is not active')
    }
    return await this.connector.captureScreen()
  }

  async getLogs(): Promise<string[]> {
    return await this.connector.getLogs()
  }

  attachRecording(recorder: RecordingManager): void {
    if (recorder == null) {
      throw new TypeError('recorder must be defined and non-null')
    }
    this.recorder = recorder
  }
}
