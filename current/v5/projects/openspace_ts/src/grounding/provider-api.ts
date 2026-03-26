import { UITool } from './ui-tool';

export interface ProviderAPI {
  readonly backendId: string;
  readonly capabilities: Set<string>;

  connect(config: Record<string, unknown>): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<UITool[]>;
  executeTool(toolId: string, params: Record<string, unknown>): Promise<unknown>;
  healthCheck(): Promise<boolean>;
  getLogs(limit?: number): Promise<ReadonlyArray<string>>;
}
