type Result<T> = { kind: 'ok'; value: T } | { kind: 'error'; error: string };

export class Config {
  env: string;
  logLevel: string;
  apiUrl: string;
  timeout: number;
  retries: number;

  constructor(
    env: string,
    logLevel: string,
    apiUrl: string,
    timeout: number,
    retries: number
  ) {
    this.env = env;
    this.logLevel = logLevel;
    this.apiUrl = apiUrl;
    this.timeout = timeout;
    this.retries = retries;
  }

  static async load(path: string): Promise<Config> {
      try {
        const content = await readFile(path, 'utf-8');
        const parsed = JSON.parse(content) as Partial<Config>;
        return new Config(
          parsed.env ?? 'development',
          parsed.logLevel ?? 'info',
          parsed.apiUrl ?? 'http://localhost:3000',
          parsed.timeout ?? 5000,
          parsed.retries ?? 3
        );
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to load: ${message}`);
      }
  }

  validate(): Result<void> {
    if (!this.env) {
      return { kind: 'error', error: 'env is required' };
    }
    if (!this.logLevel) {
      return { kind: 'error', error: 'logLevel is required' };
    }
    if (!this.apiUrl) {
      return { kind: 'error', error: 'apiUrl is required' };
    }
    if (this.timeout <= 0) {
      return { kind: 'error', error: 'timeout must be positive' };
    }
    if (this.retries < 0) {
      return { kind: 'error', error: 'retries cannot be negative' };
    }
    return { kind: 'ok', value: undefined };
  }

  merge(partial: Partial<Config>): Config {
    return new Config(
      partial.env ?? this.env,
      partial.logLevel ?? this.logLevel,
      partial.apiUrl ?? this.apiUrl,
      partial.timeout ?? this.timeout,
      partial.retries ?? this.retries
    );
  }

  get<T>(key: string): T {
    const value = (this as unknown as Record<string, unknown>)[key];
    if (value === undefined) {
      throw new Error(`Config key '${key}' not found`);
    }
    return value as T;
  }

  set<T>(key: string, value: T): void {
    (this as unknown as Record<string, unknown>)[key] = value;
  }

  toJSON(): string {
    return JSON.stringify({
      env: this.env,
      logLevel: this.logLevel,
      apiUrl: this.apiUrl,
      timeout: this.timeout,
      retries: this.retries
    });
  }
}
