import { Engine } from './engine';
import { LocalEngine } from './local-engine';
import { AssistantsEngine } from './assistants-engine';

export interface EngineConfigOptions {
  type: 'local' | 'assistants';
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class EngineConfig {
  private _type: 'local' | 'assistants';
  private _apiKey?: string;
  private _baseUrl?: string;
  private _timeout: number;
  private _maxRetries: number;
  private _model?: string;
  private _temperature?: number;
  private _maxTokens?: number;

  constructor(options: EngineConfigOptions) {
    this._type = options.type;
    this._apiKey = options.apiKey;
    this._baseUrl = options.baseUrl;
    this._timeout = options.timeout ?? 30000;
    this._maxRetries = options.maxRetries ?? 3;
    this._model = options.model;
    this._temperature = options.temperature;
    this._maxTokens = options.maxTokens;

    this.validate();
  }

  get type(): 'local' | 'assistants' {
    return this._type;
  }

  get apiKey(): string | undefined {
    return this._apiKey;
  }

  get baseUrl(): string | undefined {
    return this._baseUrl;
  }

  get timeout(): number {
    return this._timeout;
  }

  get maxRetries(): number {
    return this._maxRetries;
  }

  get model(): string | undefined {
    return this._model;
  }

  get temperature(): number | undefined {
    return this._temperature;
  }

  get maxTokens(): number | undefined {
    return this._maxTokens;
  }

  validate(): void {
    if (this._type === 'assistants' && !this._apiKey) {
      throw new Error('API key is required for assistants engine');
    }

    if (this._timeout <= 0) {
      throw new Error('Timeout must be positive');
    }

    if (this._maxRetries < 0) {
      throw new Error('Max retries cannot be negative');
    }

    if (this._temperature !== undefined && (this._temperature < 0 || this._temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }

    if (this._maxTokens !== undefined && this._maxTokens <= 0) {
      throw new Error('Max tokens must be positive');
    }
  }

  toJSON(): EngineConfigOptions {
    return {
      type: this._type,
      apiKey: this._apiKey,
      baseUrl: this._baseUrl,
      timeout: this._timeout,
      maxRetries: this._maxRetries,
      model: this._model,
      temperature: this._temperature,
      maxTokens: this._maxTokens
    };
  }

  static fromJSON(json: EngineConfigOptions): EngineConfig {
    return new EngineConfig(json);
  }

  createEngine(): Engine {
    switch (this._type) {
      case 'local':
        return new LocalEngine(this);
      case 'assistants':
        return new AssistantsEngine(this);
      default:
        throw new Error(`Unknown engine type: ${this._type}`);
    }
  }
}
