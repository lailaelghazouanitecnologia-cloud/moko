import { v4 as uuid } from 'uuid';
import { Tool } from './tool';
import { Memory } from './memory';

export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  tools: Record<string, Tool>;
  memory: Memory;
  systemPrompt: string;
}

export class Agent {
  id: string;
  name: string;
  model: string;
  tools: Map<string, Tool>;
  memory: Memory;
  systemPrompt: string;

  constructor(config?: Partial<Agent>) {
    this.id = config?.id ?? uuid();
    this.name = config?.name ?? 'Agent';
    this.model = config?.model ?? 'gpt-4';
    this.tools = config?.tools ?? new Map();
    this.memory = config?.memory ?? new Memory();
    this.systemPrompt = config?.systemPrompt ?? '';
  }

  addTool(name: string, tool: Tool): void {
    this.tools.set(name, tool);
  }

  removeTool(name: string): boolean {
    return this.tools.delete(name);
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  async callTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }
    return tool.call(args);
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  updateSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  getMemory(): Memory {
    return this.memory;
  }

  clearMemory(): void {
    this.memory.clear();
  }

  clone(): Agent {
    const clonedTools = new Map<string, Tool>();
    for (const [key, tool] of this.tools) {
      clonedTools.set(key, tool.clone());
    }
    return new Agent({
      id: uuid(),
      name: this.name,
      model: this.model,
      tools: clonedTools,
      memory: this.memory.clone(),
      systemPrompt: this.systemPrompt
    });
  }

  toJSON(): AgentConfig {
    const toolsObj: Record<string, Tool> = {};
    for (const [key, tool] of this.tools) {
      toolsObj[key] = tool;
    }
    return {
      id: this.id,
      name: this.name,
      model: this.model,
      tools: toolsObj,
      memory: this.memory,
      systemPrompt: this.systemPrompt
    };
  }

  static fromJSON(config: AgentConfig): Agent {
    const toolsMap = new Map<string, Tool>();
    for (const [key, tool] of Object.entries(config.tools)) {
      toolsMap.set(key, tool);
    }
    return new Agent({
      id: config.id,
      name: config.name,
      model: config.model,
      tools: toolsMap,
      memory: config.memory,
      systemPrompt: config.systemPrompt
    });
  }
}
