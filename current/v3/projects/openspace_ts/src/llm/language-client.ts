import { EventEmitter } from '../events';
import { Logger } from '../logging';

type RequestId = string & { readonly __brand: 'RequestId' };
type ModelId = string & { readonly __brand: 'ModelId' };

interface LanguageRequest {
  readonly id: RequestId;
  readonly prompt: string;
  readonly model: ModelId;
  readonly timeoutMs: number;
  readonly timestamp: number;
}

interface LanguageResponse {
  readonly id: RequestId;
  readonly rawText: string;
  readonly model: ModelId;
  consumedTokens: number;
  readonly timestamp: number;
}

type RequestStatus = 'pending' | 'processing' | 'completed' | 'error' | 'timeout';

type RequestRecord = {
  readonly request: LanguageRequest;
  response: LanguageResponse | null;
  status: RequestStatus;
  errorMessage?: string;
};

type ClientConfig = {
  readonly endpoint: URL;
  readonly maxConcurrency: number;

  readonly defaultTimeoutMs: number;
  readonly retryAttempts: number;
  readonly retryDelayMs: number;
};

type Client = {
  readonly config: ClientConfig;
  isHealthy(): boolean;
  send(request: LanguageRequest): Promise<LanguageResponse>;
};

type ClientPool = {
  readonly clients: ReadonlyArray<Client>;
  readonly currentIndex: number;
  readonly failureCount: Record<string, number>;
};

type RequestResult = { kind: 'success'; value: LanguageResponse } | { kind: 'error'; error: string };

type PoolResult = { kind: 'success'; value: ClientPool } | { kind: 'error'; error: string };

export class LanguageClient extends EventEmitter {
  private readonly logger: Logger;
  private pool: ClientPool | null = null;
  private readonly pendingRequests: Map<RequestId, RequestRecord> = new Map();
  private readonly activeRequests: Map<RequestId, RequestRecord> = new Map();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  this.on('requestCompleted', (id: RequestId) => this.handleRequestCompleted(id));
  }

  initialize(configs: ReadonlyArray<ClientConfig>): PoolResult {
    if (configs.length === 0) {
      return { kind: 'error', error: 'No client configurations provided' };
    }

    const clients = configs.map(c => this.createClient(c));
    const failureCount: Record<string, number> = {};
    for (const c of clients) failureCount[c.config.endpoint.href] = 0;

    this.pool = { clients, currentIndex: 0, failureCount: failureCount };
    this.logger.info(`Initialized pool with ${clients.length} clients`);
    return { kind: 'success', value: this.pool };
  }

  async sendRequest(prompt: string, model: ModelId, timeoutMs?: number): Promise<RequestResult> {
    if (!this.pool) return { kind: 'error', error: 'Pool not initialized' };

    const id: RequestId = (Math.random().toString(36).slice(2)) as RequestId;
    timeoutMs = timeoutMs ?? this.pool.clients[0]?.config.defaultTimeoutMs ?? 30000;
    const request: LanguageRequest = { id, prompt, model, timeoutMs, timestamp: Date.now() };

    const record: RequestRecord = { request, response: null, status: 'pending' };
    this.pendingRequests.set(id, record);

    this.logger.info(`Enqueued request ${id} for model ${model}`);
    return this.processRequest(id);
  }

  getPendingRequests(): ReadonlyArray<LanguageRequest> {
    return Array.from(this.pendingRequests.values()).map(r => r.request);
  }

  getActiveRequests(): ReadonlyArray<LanguageRequest> {
    return Array.from(this.activeRequests.values()).map(r => r.request);
  }

  getCompletedRequests(): ReadonlyArray<LanguageRequest> {
    const completed: LanguageRequest[] = [];
    for (const record of this.activeRequests.values()) {
      if (record.status === 'completed') completed.push(record.request);
    }
    return completed;
  }

  getFailedRequests(): ReadonlyArray<LanguageRequest> {
    const failed: LanguageRequest[] = [];
    for (const record of this.activeRequests.values()) {
      if (record.status === 'error' || record.status === 'timeout') failed.push(record.request);
    }
    return failed;
  }

  reset(): void {
    this.pendingRequests.clear();
 this.activeRequests.clear();
    this.pool = null;
    this.logger.info('LanguageClient reset');
  }

  private createClient(config: ClientConfig): Client {
    return {
      config,
      isHealthy: () => true,
      send: (req) => this.sendToEndpoint(req, config)
    };
  }

  private async sendToEndpoint(request: LanguageRequest, config: ClientConfig): Promise<LanguageResponse> {
    const response: LanguageResponse = {
      id: request.id,
      rawText: 'sample response',
      model: request.model,
      consumedTokens: 0,
      timestamp: Date.now()
    };
    return new Promise<LanguageResponse>(resolve => setTimeout(() => resolve(response), 10));
  }

  private async processRequest(id: RequestId): Promise<RequestResult> {
    const record = this.pendingRequests.get(id);
    if (!record) return { kind: 'error', error: 'Request not found' };

    this.pendingRequests.delete(id);
    this.activeRequests.set(id, { ...record, status: 'processing' });

    const client = this.pool?.clients[this.pool.currentIndex];
    if (!client) return { kind: 'error', error: 'No client available' };

    try {
      const response = await client.send(record.request);
      this.activeRequests.set(id, { ...record, response, status: 'completed' });
      this.emit('requestCompleted', id);
      return { kind: 'success', value: response };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.activeRequests.set(id, { ...record, errorMessage: msg, status: 'error' });
      return { kind: 'error', error: msg };
    }
  }

  private handleRequestCompleted(id: RequestId): void {
    this.activeRequests.delete(id);
  }
}
