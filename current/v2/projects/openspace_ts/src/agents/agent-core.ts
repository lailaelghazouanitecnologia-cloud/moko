import { type AgentCoreState } from './agent-state';
import { type AgentCorePool } from './agent-pool';
import { type GroundedAgentCore } from './grounded-agent';
import { type GroundingClient } from './grounding-client';
import { type Recording } from './recording-manager';
import type { ToolResult } from './tool-result';
import type { Action } from './action';

export class AgentCore {
  readonly id: string;
  private state: AgentCoreState;
  private readonly pool: AgentCorePool;
  private grounding: GroundedAgentCore | null = null;
  private readonly recording: Recording;

  constructor(id: string, pool: AgentCorePool, recording: Recording) {
      if (!id || typeof id !== 'string') throw new TypeError('id must be a non-empty string');
    this.id = id;
    this.pool = pool;
    this.recording = recording;
    this.state = new AgentCoreState();
  }

  async start(): Promise<void> {
    await this.state.initialize();
  }

  async stop(): Promise<void> {
    await this.state.reset();
  }

  async execute(query: string): Promise<ToolResult> {
    if (this.grounding) {
      return this.grounding.execute(query);
    }
    return { type: 'error', message: 'No grounding client attached' };
  }

  pause(): void {
    this.state.updateStatus('paused');
  }

  resume(): void {
    this.state.updateStatus('active');
  }

  async reset(): Promise<void> {
    this.state = new AgentCoreState();
    await this.state.initialize();
  }

  attachGrounding(client: GroundingClient): void {
    this.grounding = new GroundedAgentCore(this, client, this.recording);
  }

  detachGrounding(): void {
    this.grounding = null;
  }

  recordAction(action: Action): Promise<void> {
    return this.recording.recordAction(this.id, action);
  }
}
