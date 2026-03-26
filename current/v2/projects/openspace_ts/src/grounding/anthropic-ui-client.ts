import { ProviderUI } from './provider-ui';
import { UISession } from './ui-session';
import { UIConnector } from './ui-connector';
import { UITool } from './ui-tool';
import { ToolResult } from './tool-result';

/**
 * Anthropic grounding client for UI automation.
 * Orchestrates UI interactions through a session-based provider.
 */
export class AnthropicUIClient {
  private readonly provider: ProviderUI;
  private readonly session: UISession;
  private readonly connector: UIConnector;

  constructor(provider: ProviderUI, session: UISession, connector: UIConnector) {

    this.provider = provider;
    this.session = session;
    this.connector = connector;
  }

  async connect(): Promise<void> {
    await this.session.start();
  }

  async disconnect(): Promise<void> {
    await this.session.stop();
  }

  async executeTool(tool: UITool, args: Record<string, unknown>): Promise<ToolResult> {
    if (!tool || typeof tool.id !== 'string') throw new TypeError('tool must be a valid UITool');
    if (!args || typeof args !== 'object') throw new TypeError('args must be a Record<string, unknown>');

    return this.session.executeTool(tool.id, args);
  }

  async listTools(): Promise<ReadonlyArray<UITool>> {
    const toolIds = await this.session.listTools();
    const tools: UITool[] = [];
    for (const id of toolIds) {
      const tool = this.session.tools.get(id);
      if (tool) tools.push(tool);
    }
    return tools;
  }

  async takeScreenshot(name?: string): Promise<Buffer> {
    if (name !== undefined && typeof name !== 'string') throw new TypeError('name must be a string or undefined');

    const buffer = await this.session.takeScreenshot();
    if (name && this.connector && 'screenshot' in this.connector) {
      await (this.connector as { screenshot: (name: string) => Promise<void> }).screenshot(name);
    }
    return buffer;
  }

  async startRecording(outputDir: string): Promise<void> {
    if (!this.connector || !('startRecording' in this.connector)) {
      throw new Error('Recording not supported by this connector');
    }
    await (this.connector as { startRecording: (dir: string) => Promise<void> }).startRecording(outputDir);
  }

  async stopRecording(): Promise<string> {
    if (!this.connector || !('stopRecording' in this.connector)) {
      throw new Error('Recording not supported by this connector');
    }
    return await (this.connector as { stopRecording: () => Promise<string> }).stopRecording();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.session.getLogs();
      return true;
    } catch {
      return false;
    }
  }
}
