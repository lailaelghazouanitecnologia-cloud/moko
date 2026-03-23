import { MiddlewareContext } from './middleware-context';

export type NextFunction = () => Promise<void>;

export interface Middleware {
  execute(context: MiddlewareContext, next: NextFunction): Promise<void>;
}
