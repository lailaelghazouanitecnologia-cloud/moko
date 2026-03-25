import { ConfigMixin } from './config-mixin';

export type SearchMode = 'semantic' | 'keyword' | 'hy';

export interface ToolSearchConfigInput {
  readonly embedding_model?: unknown;
  readonly max_tools?: unknown;
  readonly search_mode?: unknown;
  readonly enable_llm_filter?: unknown;
  readonly llm_filter_threshold?: unknown;
  readonly enable_cache_persistence?: unknown;
  readonly cache_dir?: unknown;
}

export class ToolSearchConfig extends ConfigMixin {
  readonly embedding_model: string;
  readonly max_tools: number;
  readonly search_mode: SearchMode;
  readonly enable_llm_filter: boolean;
  readonly llm_filter_threshold: number;
  readonly enable_cache_persistence: boolean;
  readonly cache_dir: string | null;

  constructor(config: ToolSearchConfigInput) {
    super();
    this.embedding_model = this.parseString(config.embedding_model, 'embedding_model') ?? 'text-ada-002';
    this.max_tools = this.parsePositiveInt(config.max_tools, 'max_tools') ?? 10;
    this.search_mode = ToolSearchConfig.validateSearchMode(config.search_mode);
    this.enable_llm_filter = this.parseBoolean(config.enable_llm_filter, 'enable_llm_filter') ?? false;
    this.llm_filter_threshold = this.parseUnitInterval(config.llm_filter_threshold, 'llm_filter_threshold') ?? 0.7;
    this.enable_cache_persistence = this.parseBoolean(config.enable_cache_persistence, 'enable_cache_persistence') ?? true;
    this.cache_dir = this.parseNullableString(config.cache_dir, 'cache_dir');
  }

  static validateSearchMode(value: unknown): SearchMode {
    if (value === 'semantic' || value === 'keyword' || value === 'hy') {
      return value;
    }
    throw new RangeError(`Invalid search_mode: must be 'semantic', 'keyword', or 'hy'`);
  }

  static fromJSON(json: Record<string, unknown>): ToolSearchConfig {
    return new ToolSearchConfig(json);
  }

  toJSON(): Record<string, unknown> {
    return {
      embedding_model: this.embedding_model,
      max_tools: this.max_tools,
      search_mode: this.search_mode,
      enable_llm_filter: this.enable_llm_filter,
      llm_filter_threshold: this.llm_filter_threshold,
      enable_cache_persistence: this.enable_cache_persistence,
      cache_dir: this.cache_dir,
    };
  }

  private parseString(value: unknown, field: string): string | undefined {
    if (value == null) return undefined;
    if (typeof value === 'string') return value;
    throw new TypeError(`${field} must be a string`);
  }

  private parseNullableString(value: unknown, field: string): string | null {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    throw new TypeError(`${field} must be a string or null`);
  }

  private parsePositiveInt(value: unknown, field: string): number | undefined {
    if (value == null) return undefined;
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
    throw new TypeError(`${field} must be a positive integer`);
  }

  private parseBoolean(value: unknown, field: string): boolean | undefined {
    if (value == null) return undefined;
    if (typeof value === 'boolean') return value;
    throw new TypeError(`${field} must be a boolean`);
  }

  private parseUnitInterval(value: unknown, field: string): number | undefined {
    if (value == null) return undefined;
    if (typeof value === 'number' && value >= 0 && value <= 1) return value;
    throw new TypeError(`${field} must be a number between 0 and 1`);
  }
}
