export interface APIProvider {
  readonly endpoint: string;
  readonly authToken: string;
  readonly timeout: number;
  readonly name: string;
  readonly isHealthy: boolean;
  readonly rateLimit: number;

  initialize(config: Record<string, unknown>): Promise<void>;
  sendRequest(payload: unknown): Promise<unknown>;
  validateConfig(config: Record<string, unknown>): boolean;
  checkHealth(): Promise<boolean>;
  handleError(error: unknown): void;
}
