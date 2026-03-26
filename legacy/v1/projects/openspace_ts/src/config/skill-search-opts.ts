export class SkillSearchOpts {
  readonly maxResults: number;
  readonly minScore: number;
  readonly cosineThreshold: number;
  readonly bm25Weight: number;
  readonly vectorWeight: number;
  readonly enableRerank: boolean;
  readonly rerankTopK: number;
  readonly rerankPrompt: string;
  readonly hybridAlpha: number;
  readonly timeoutMs: number;
  readonly maxRetries: number;

  constructor(opts: {
    maxResults?: number;
    minScore?: number;
    cosineThreshold?: number;
    bm25Weight?: number;
    vectorWeight?: number;
    enableRerank?: boolean;
    rerankTopK?: number;
    rerankPrompt?: string;
    hybridAlpha?: number;
    timeoutMs?: number;
    maxRetries?: number;
  }) {
    this.maxResults = opts.maxResults ?? 10;
    this.minScore = opts.minScore ?? 0.7;
    this.cosineThreshold = opts.cosineThreshold ?? 0.75;
    this.bm25Weight = opts.bm25Weight ?? 0.4;
    this.vectorWeight = opts.vectorWeight ?? 0.6;
    this.enableRerank = opts.enableRerank ?? false;
    this.rerankTopK = opts.rerankTopK ?? 5;
    this.rerankPrompt = opts.rerankPrompt ?? 'Select the most relevant skills for the query';
    this.hybridAlpha = opts.hybridAlpha ?? 0.5;
    this.timeoutMs = opts.timeoutMs ?? 30000;
    this.maxRetries = opts.maxRetries ?? 2;
  }

  validate(): void {
    if (this.maxResults <= 0) throw new RangeError('maxResults must be positive');
    if (this.minScore < 0 || this.minScore > 1) throw new RangeError('minScore must be in [0,1]');
    if (this.cosineThreshold < 0 || this.cosineThreshold > 1) throw new RangeError('cosineThreshold must be in [0,1]');
    if (this.bm25Weight < 0 || this.bm25Weight > 1) throw new RangeError('bm25Weight must be in [0,1]');
    if (this.vectorWeight < 0 || this.vectorWeight > 1) throw new RangeError('vectorWeight must be in [0,1]');
    if (Math.abs(this.bm25Weight + this.vectorWeight - 1) > 1e-6) throw new RangeError('bm25Weight + vectorWeight must equal 1');
    if (this.rerankTopK <= 0) throw new RangeError('rerankTopK must be positive');
    if (this.hybridAlpha < 0 || this.hybridAlpha > 1) throw new RangeError('hybridAlpha must be in [0,1]');
    if (this.timeoutMs <= 0) throw new RangeError('timeoutMs must be positive');
    if (this.maxRetries < 0) throw new RangeError('maxRetries must be non-negative');
  }

  toJSON(): Record<string, unknown> {
    return {
      maxResults: this.maxResults,
      minScore: this.minScore,
      cosineThreshold: this.cosineThreshold,
      bm25Weight: this.bm25Weight,
      vectorWeight: this.vectorWeight,
      enableRerank: this.enableRerank,
      rerankTopK: this.rerankTopK,
      rerankPrompt: this.rerankPrompt,
      hybridAlpha: this.hybridAlpha,
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
    };
  }

  static fromJSON(data: Record<string, unknown>): SkillSearchOpts {
    return new SkillSearchOpts({
      maxResults: typeof data.maxResults === 'number' ? data.maxResults : undefined,
      minScore: typeof data.minScore === 'number' ? data.minScore : undefined,
      cosineThreshold: typeof data.cosineThreshold === 'number' ? data.cosineThreshold : undefined,
      bm25Weight: typeof data.bm25Weight === 'number' ? data.bm25Weight : undefined,
      vectorWeight: typeof data.vectorWeight === 'number' ? data.vectorWeight : undefined,
      enableRerank: typeof data.enableRerank === 'boolean' ? data.enableRerank : undefined,
      rerankTopK: typeof data.rerankTopK === 'number' ? data.rerankTopK : undefined,
      rerankPrompt: typeof data.rerankPrompt === 'string' ? data.rerankPrompt : undefined,
      hybridAlpha: typeof data.hybridAlpha === 'number' ? data.hybridAlpha : undefined,
      timeoutMs: typeof data.timeoutMs === 'number' ? data.timeoutMs : undefined,
      maxRetries: typeof data.maxRetries === 'number' ? data.maxRetries : undefined,
    });
  }

  merge(other: Partial<SkillSearchOpts>): SkillSearchOpts {
    return new SkillSearchOpts({
      maxResults: other.maxResults ?? this.maxResults,
      minScore: other.minScore ?? this.minScore,
      cosineThreshold: other.cosineThreshold ?? this.cosineThreshold,
      bm25Weight: other.bm25Weight ?? this.bm25Weight,
      vectorWeight: other.vectorWeight ?? this.vectorWeight,
      enableRerank: other.enableRerank ?? this.enableRerank,
      rerankTopK: other.rerankTopK ?? this.rerankTopK,
      rerankPrompt: other.rerankPrompt ?? this.rerankPrompt,
      hybridAlpha: other.hybridAlpha ?? this.hybridAlpha,
      timeoutMs: other.timeoutMs ?? this.timeoutMs,
      maxRetries: other.maxRetries ?? this.maxRetries,
    });
  }
}
