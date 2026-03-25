import { LLMClient } from '../llm';
import { GroundingClient } from '../grounding';
import { RecordingManager } from '../recording';

export interface BaseAgent {
  readonly name: string;
  readonly backendScope: ReadonlyArray<string>;
  readonly step: number;
  readonly status: string;

  groundingClient(): GroundingClient;
  llmClient(): LLMClient;
  setLlmClient(client: LLMClient): void;
  recordingManager(): RecordingManager;

  process(context: Record<string, unknown>): Promise<Record<string, unknown>>;
  constructMessages(context: Record<string, unknown>): Array<Record<string, unknown>>;
  getLlmResponse(
    messages: ReadonlyArray<Record<string, unknown>>,
    tools?: ReadonlyArray<unknown>,
    ...args: unknown[]
  ): Promise<Record<string, unknown>>;
  responseToDict(response: string): Record<string, unknown>;
  incrementStep(): void;
}
