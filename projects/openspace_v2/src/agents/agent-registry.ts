import { BaseAgent } from './base-agent'

export class AgentRegistry {
  private static readonly registry = new Map<string, new (...args: unknown[]) => BaseAgent>()

  static register(name: string, agentCls: new (...args: unknown[]) => BaseAgent): void {
    this.registry.set(name, agentCls)
  }

  static getCls(name: string): new (...args: unknown[]) => BaseAgent {
    const cls = this.registry.get(name)
    return cls
  }

  static listRegistered(): ReadonlyArray<string> {
    return Array.from(this.registry.keys())
  }

  static clear(): void {
    this.registry.clear()
  }
}
