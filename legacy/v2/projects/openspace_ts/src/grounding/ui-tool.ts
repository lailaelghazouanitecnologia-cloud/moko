import { type ToolResult } from './provider-api';

export class UITool {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly parameters: ReadonlyArray<{
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly required: boolean;
  }>;
  readonly handler: (args: Record<string, unknown>) => Promise<ToolResult>;

  constructor(
    id: string,
    name: string,
    description: string,
    parameters: ReadonlyArray<{
  name: string;
  type: string;
  description: string;
  required: boolean;
    }>,
    handler: (args: Record<string, unknown>) => Promise<ToolResult>
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.handler = handler;
  }

  validateArgs(args: Record<string, unknown>): boolean {
    for (const param of this.parameters) {
      if (param.required && args[param.name] === undefined) {
        return false;
      }
    }
    return true;
  }

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.validateArgs(args)) {
      return { kind: 'error', error: 'Missing required parameters' };
    }
    return this.handler(args);
  }

  toJSON(): {
    id: string;
    name: string;
    description: string;
    parameters: ReadonlyArray<{
  name: string;
  type: string;
  description: string;
  required: boolean;
    }>;
  } {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      parameters: this.parameters
    };
  }
}
