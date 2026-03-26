import { Result } from './result';
import { ValidationError } from './validation-error';

export interface Config {
  env: string;
  debug: boolean;
  timeout: number;

  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  merge(partial: Partial<Config>): Config;
  validate(): Result<ValidationError[]>;
}
