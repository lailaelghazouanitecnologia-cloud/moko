export interface GroundingOpts {
  readonly maxRetries: number;
  readonly timeoutMs: number;
  readonly embeddingModel: string;
  readonly lexicalWeight: number;
  readonly vectorWeight: number;
}

export function validate(opts: GroundingOpts): boolean {
  return (
    opts.maxRetries >= 0 &&
    opts.timeoutMs > 0 &&
    opts.embeddingModel.length > 0 &&
    opts.lexicalWeight >= 0 &&
    opts.vectorWeight >= 0 &&
    Math.abs(opts.lexicalWeight + opts.vectorWeight - 1) < 1e-6
  );
}

export function merge(base: GroundingOpts, other: Partial<GroundingOpts>): GroundingOpts {
  return {
    maxRetries: other.maxRetries ?? base.maxRetries,
    timeoutMs: other.timeoutMs ?? base.timeoutMs,
    embeddingModel: other.embeddingModel ?? base.embeddingModel,
    lexicalWeight: other.lexicalWeight ?? base.lexicalWeight,
    vectorWeight: other.vectorWeight ?? base.vectorWeight,
  };
}

export function toEnv(opts: GroundingOpts): Record<string, string> {
  return {
    GROUNDING_MAX_RETRIES: opts.maxRetries.toString(),
    GROUNDING_TIMEOUT_MS: opts.timeoutMs.toString(),
    GROUNDING_EMBEDDING_MODEL: opts.embeddingModel,
    GROUNDING_LEXICAL_WEIGHT: opts.lexicalWeight.toString(),
    GROUNDING_VECTOR_WEIGHT: opts.vectorWeight.toString(),
  };
}
