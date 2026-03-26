import { Map as ReadlineMap } from 'readline';
import { AgentCore } from './agent-core';
import { AgentState } from './agent-state';

/**
 * Manages creation, re-use, and destruction of `AgentPool` instances.
 * Supports a fixed upper bound and idle-time based pruning.
 */
export class AgentPool {
  private readonly agents = new Map<string, AgentCore>();
  private readonly pool = new WeakMap<Agent, number>();
  private readonly state: AgentState = AgentState.READY;
  private readonly maxPoolSize: number;
  private readonly idleTimeoutMs: number;

  constructor(maxPoolSize: number = 10, idleTimeoutMs: number = 60_000) {
    if (!Number.isInteger(maxPoolSize) || maxPoolSize <= 0) {
      throw new RangeError('maxPoolSize must be a positive integer');
    }
    if (!Number.isInteger(idleTimeoutMs) || (idleTimeoutMs < 0)) {
      throw new RangeError('idleTimeoutMs must be a non-negative integer');
  }
    this.maxPool = maxPoolSize;
    this.idleTimeout = idleTimeoutMs;
  }

  async acquire(id: string): Promise<AgentCore> {

    let agent = this.agents.get(id);
    if (!agent) {
      if (this.agents.size >= this.maxPoolSize) {
        throw new RangeError('Pool size limit exceeded');
      }
      agent = new Agent(id, this, new Recording());
      await agent.start();
      this.agents.set(id, agent);
    }
    this.pool.set(agent, Date.now());
    return agent;
  }

  async release(agent: AgentCore): Promise<void> {
    this.pool.delete(agent);
  }

  async spawn(config: unknown): Promise<Agent> {
    const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return this.acquire(id);
  }

  async retire(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (agent) {
      await agent.stop();
      this.agents.delete(id);
    }
  }

  list(): Agent[] {
    return Array.from(this.agents.values());
  }

  async prune(): Promise<number> {
    const now = Date.now();
    const toRemove: string[] = [];
    for (const [id, agent] of this.agents) {
      const lastUsed = this.pool.get(agent);
      if (lastUsed && now - lastUsed > this.idleTimeout) {
        toRemove.push(id);
      }
    }
    await Promise.all(toRemove.map(id => this.retire(id)));
    return toRemove.length;
  }

  async reset(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (agent) {
      await agent.reset();
    }
  }
}
