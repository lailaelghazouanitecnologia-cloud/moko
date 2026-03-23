import { Tool } from './tool';
import { FunctionCall } from './function-call';
import { ToolResult } from './tool-result';
import * as fs from 'fs';
import * as path from 'path';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private handlers: Map<string, Function> = new Map();

  register(tool: Tool, handler: Function): void {
    this.tools.set(tool.name, tool);
    this.handlers.set(tool.name, handler);
  }

  unregister(name: string): boolean {
    const hadTool = this.tools.has(name);
    this.tools.delete(name);
    this.handlers.delete(name);
    return hadTool;
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getHandler(name: string): Function | undefined {
    return this.handlers.get(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  clear(): void {
    this.tools.clear();
    this.handlers.clear();
  }

  async loadFromDirectory(dir: string): Promise<void> {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        await this.loadFromDirectory(filePath);
      } else if (file.endsWith('.js') || file.endsWith('.ts')) {
        const module = await import(filePath);
        if (module.default && typeof module.default === 'object' && module.default.name && module.default.handler) {
          this.register(module.default, module.default.handler);
        }
      }
    }
  }

  validateCall(call: FunctionCall): boolean {
    const tool = this.tools.get(call.name);
    if (!tool) return false;
    if (!tool.parameters) return true;
    const params = tool.parameters.properties || {};
    for (const [key, value] of Object.entries(call.arguments)) {
      const param = params[key];
      if (!param) return false;
      if (param.required && value === undefined) return false;
      if (param.type && typeof value !== param.type) return false;
    }
    return true;
  }

  async execute(call: FunctionCall): Promise<ToolResult> {
    const handler = this.handlers.get(call.name);
    if (!handler) {
      return { success: false, error: `Tool ${call.name} not found` };
    }
    if (!this.validateCall(call)) {
      return { success: false, error: `Invalid parameters for tool ${call.name}` };
    }
    try {
      const result = await handler(call.arguments);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  toOpenAPISchema(): object[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || { type: 'object', properties: {} }
      }
    }));
  }
}
