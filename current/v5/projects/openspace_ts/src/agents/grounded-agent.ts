import { AgentCore } from './agent-core';
import { AgentState } from './agent-state';
import { AgentPool } from './agent-pool';
import { GroundingClient } from '../grounding/grounding-client';
import { BaseTool } from '../tools/base-tool';
import { ToolResult } from '../tools/tool-result';
import { RecordingManager } from '../recording/recording-manager';
import { RecordingViewer } from '../recording/recording-viewer';
import { OpenSpaceConfig } from '../config/open-space-config';

export class GroundedAgent {
  private readonly agentCore: AgentCore;
  private readonly groundingClient: GroundingClient;
  private readonly toolCache = new Map<string, BaseTool>();
  private readonly recordingManager: RecordingManager;

  constructor(
    agentCore: AgentCore,
    groundingClient: GroundingClient,
    recordingManager: RecordingManager
  ) {
    this.agentCore = agentCore;
    this.groundingClient = groundingClient;
    this.recordingManager = recordingManager;
  }

  async initialize(): Promise<void> {
    await this.groundingClient.connect();
    const tools = await this.groundingClient.listTools();
    tools.forEach(tool => this.toolCache.set(tool.id, tool));
  }

  async execute(query: string): Promise<ToolResult> {
    const tools = await this.searchTools(query);
    if (tools.length === 0) {
      return { kind: 'error', error: 'No suitable tools found' };
    }
    const tool = tools[0];
    return await tool.execute(query);
  }

  async searchTools(query: string): Promise<BaseTool[]> {
    const allTools = Array.from(this.toolCache.values());
    const scored = await Promise.all(
      allTools.map(async tool => ({
        tool,
        score: await this.groundingClient.scoreRelevance(query, tool)
      }))
    );
    return scored
      .filter(({ score }) => score > 0.5)
      .sort((a, b) => b.score - a.score)
      .map(({ tool }) => tool);
  }

  async applyPatch(patch: string, targetDir: string): Promise<boolean> {
    return await this.groundingClient.applyPatch(patch, targetDir);
  }

  async startRecording(sessionId: string): Promise<void> {
    await this.recordingManager.start(sessionId);
  }

  async stopRecording(sessionId: string): Promise<RecordingViewer> {
    return await this.recordingManager.stop(sessionId);
  }

  async resolveHostConfig(): Promise<OpenSpaceConfig> {
    return await this.groundingClient.resolveConfig();
  }

  async listGroundedSkills(): Promise<string[]> {
    const tools = Array.from(this.toolCache.values());
    return tools.map(tool => tool.name);
  }

  async refreshSkills(): Promise<void> {
    this.toolCache.clear();
    const tools = await this.groundingClient.listTools();
    tools.forEach(tool => this.toolCache.set(tool.id, tool));
  }
}
