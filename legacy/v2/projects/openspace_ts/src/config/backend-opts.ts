export interface BackendOpts {
  readonly backendType: BackendType;
  readonly endpoint: string;
  readonly apiKey: string;
  readonly timeout: number;
  readonly maxRetries: number;
}

export type BackendType = 'openai' | 'anthropic' | 'local';

export function createBackendOpts(
  backendType: BackendType,
  endpoint: string,
  apiKey: string,
  timeout: number,
  maxRetries: number
): BackendOpts {
  return { backendType, endpoint, apiKey, timeout, maxRetries };
}

export function validate(opts: BackendOpts): boolean {
  return (
    opts.endpoint.length > 0 &&
    opts.apiKey.length > 0 &&
    opts.timeout > 0 &&
    opts.maxRetries >= 0
  );
}

export function toJSON(opts: BackendOpts): Record<string, unknown> {
  return {
    backendType: opts.backendType,
    endpoint: opts.endpoint,
    apiKey: opts.apiKey,
    timeout: opts.timeout,
    maxRetries: opts.maxRetries,
  };
}

export function merge(
  opts: BackendOpts,
  other: Partial<BackendOpts>
): BackendOpts {
  return {
    backendType: other.backendType ?? opts.backendType,
    endpoint: other.endpoint ?? opts.endpoint,
    apiKey: other.apiKey ?? opts.apiKey,
    timeout: other.timeout ?? opts.timeout,
    maxRetries: other.maxRetries ?? opts.maxRetries,
  };
}
