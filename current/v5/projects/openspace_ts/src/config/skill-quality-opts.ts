export class SkillQualityOpts {
  readonly minScore: number;
  readonly maxResults: number;
  readonly cosineThreshold: number;
  readonly bm25Weight: number;
  readonly vectorWeight: number;
  readonly enableRerank: boolean;
  readonly rerankTopK: number;
  readonly rerankPrompt: string;

  constructor(opts: {
    minScore?: number;
    maxResults?: number;
    cosineThreshold?: number;
    bm25Weight?: number;
    vectorWeight?: number;
    enableRerank?: boolean;
    rerankTopK?: number;
    rerankPrompt?: string;
  }) {
    this.minScore = opts.minScore ?? 0.5;
    this.maxResults = opts.maxResults ?? 100;
    this.cosineThreshold = opts.cosineThreshold ?? 0.7;
    this.bm25Weight = opts.bm25Weight ?? 0.4;
    this.vectorWeight = opts.vectorWeight ?? 0.6;
    this.enableRerank = opts.enableRerank ?? false;
    this.rerankTopK = opts.rerankTopK ?? 10;
    this.rerankPrompt = opts.rerankPrompt ?? 'Re-rank the top candidates based on relevance.';
  }

  validate(): void {
    if (this.minScore < 0 || this.minScore > 1) {
      throw new RangeError('minScore must be between 0 and 1');
    }
    if (this.maxResults <= 0) {
      throw new RangeError('maxResults must be positive');
    }
    if (this.cosineThreshold < 0 || this.cosineThreshold > 1) {
      throw new RangeError('cosineThreshold must be between 0 and 1');
    }
    if (this.bm25Weight < 0 || this.bm25Weight > 1) {
      throw new RangeError('bm25Weight must be between 0 and 1');
    }
    if (this.vectorWeight < 0 || this.vectorWeight > 1) {
      throw new RangeError('vectorWeight must be between 0 and 1');
    }
    if (Math.abs(this.bm25Weight + this.vectorWeight - 1) > 0.01) {
      throw new RangeError('bm25Weight + vectorWeight must sum to 1');
    }
    if (this.rerankTopK <= 0) {
      throw new RangeError('rerankTopK must be positive');
    }
    if (this.rerankPrompt.trim().length === 0) {
      throw new TypeError('rerankPrompt must not be empty');
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      minScore: this.minScore,
      maxResults: this.maxResults,
      cosineThreshold: this.cosineThreshold,
      bm25Weight: this.bm25Weight,
      vectorWeight: this.vectorWeight,
      enableRerank: this.enableRerank,
      rerankTopK: this.rerankTopK,
      rerankPrompt: this.rerankPrompt,
    };
  }

  static fromJSON(data: Record<string, unknown>): SkillQualityOpts {
    return new SkillQualityOpts({
      minScore: typeof data.minScore === 'number' ? data.minScore : undefined,
      maxResults: typeof data.maxResults === 'number' ? data.maxResults : undefined,
      cosineThreshold: typeof data.cosineThreshold === 'number' ? data.cosineThreshold : undefined,
      bm25Weight: typeof data.bm25Weight === 'number' ? data.bm25Weight : undefined,
      vectorWeight: typeof data.vectorWeight === 'number' ? data.vectorWeight : undefined,
      enableRerank: typeof data.enableRerank === 'boolean' ? data.enableRerank : undefined,
      rerankTopK: typeof data.rerankTopK === 'number' ? data.rerankTopK : undefined,
      rerankPrompt: typeof data.rerankPrompt === 'string' ? data.rerankPrompt : undefined,
    });
  }
}
