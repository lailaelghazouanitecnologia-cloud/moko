import { readFileSync } from 'fs';
import { exists as existsSync } from 'fs';
import { join } from 'path';
import { isAbsolute } from 'path';
import { ApiError } from './api-error';

export class AppConfig {
  readonly apiBaseUrl: string;
  readonly apiKey: string;
  readonly timeout: number;
  readonly retries: number;
  readonly enableLogging: boolean;

  constructor(
    apiBaseUrl: string,
    apiKey: string,
    timeout: number,
    retries: number,
    enableLogging: boolean
  ) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
    this.timeout = timeout;
    this.retries = retries;
    this.enableLogging = enableLogging;
  }

  static loadFromFile(path: string): AppConfig {
    const absolute = isAbsolute(path) ? path : join(process.cwd(), path);
    if (!existsSync(absolute)) {
      throw new RangeError(`file does not exist: ${absolute}`);
    }
    let content: string;
    try {
      content = readFileSync(absolute, 'utf-8');
    } catch (err) {
      throw new RangeError(`cannot read file: ${absolute}`);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new RangeError('invalid JSON in config file');
    }
    return new AppConfig(
      (parsed as unknown).apiBaseUrl,
      (parsed as unknown).apiKey,
      (parsed as unknown).timeout,
      (parsed as unknown).retries,
      (parsed as unknown).enableLogging
    );
  }

  validate(): boolean {
    return (
      this.apiBaseUrl.length > 0 &&
      this.apiKey.length > 0 &&
      this.timeout > 0 &&
      this.retries >= 0
    );
  }

  toJSON(): string {
    return JSON.stringify({
      apiBaseUrl: this.apiBaseUrl,
      apiKey: this.apiKey,
      timeout: this.timeout,
      retries: this.retries,
      enableLogging: this.enableLogging
    });
  }

  merge(partial: Partial<AppConfig>): AppConfig {
    return new AppConfig(
      partial.apiBaseUrl ?? this.apiBaseUrl,
      partial.apiKey ?? this.apiKey,
      partial.timeout ?? this.timeout,
      partial.retries ?? this.retries,
      partial.enableLogging ?? this.enableLogging
    );
  }

  clone(): AppConfig {
    return new AppConfig(
      this.apiBaseUrl,
      this.apiKey,
      this.timeout,
      this.retries,
      this.enableLogging
    );
  }
}
