import { ApiError } from './api-error';

export interface Middleware {
  readonly name: string;
  readonly priority: number;

  process(context: unknown, next: () => Promise<void>): Promise<void>;
  before(context: unknown): Promise<void>;
  after(context: unknown): Promise<void>;
  onError(error: ApiError, context: unknown): Promise<void>;
  supports(context: unknown): boolean;
}
