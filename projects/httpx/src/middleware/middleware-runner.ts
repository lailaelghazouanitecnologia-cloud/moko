import { Middleware } from './middleware';
import { MiddlewareStack } from './middleware-stack';
import { MiddlewareContext } from './middleware-context';

export type RequestHandler = (context: MiddlewareContext) => Promise<void> | void;
export type ErrorHandler = (error: Error, context: MiddlewareContext) => Promise<void> | void;

export class MiddlewareRunner {
  private stack: MiddlewareStack;
  private customErrorHandler: ErrorHandler | null = null;

  constructor(stack?: MiddlewareStack) {
    this.stack = stack ? stack.clone() : new MiddlewareStack();
  }

  async run(context: MiddlewareContext): Promise<void> {
    const middlewares = this.stack.getAll();
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= middlewares.length) return;
      const middleware = middlewares[index++];
      try {
        await middleware(context, next);
      } catch (error) {
        await this.errorHandler(error as Error, context);
      }
    };

    try {
      await next();
    } catch (error) {
      await this.errorHandler(error as Error, context);
    }
  }

  async runUntil(context: MiddlewareContext, predicate: (ctx: MiddlewareContext) => boolean): Promise<void> {
    const middlewares = this.stack.getAll();
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= middlewares.length || predicate(context)) return;
      const middleware = middlewares[index++];
      try {
        await middleware(context, next);
      } catch (error) {
        await this.errorHandler(error as Error, context);
      }
    };

    try {
      await next();
    } catch (error) {
      await this.errorHandler(error as Error, context);
    }
  }

  async runWhile(context: MiddlewareContext, predicate: (ctx: MiddlewareContext) => boolean): Promise<void> {
    const middlewares = this.stack.getAll();
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= middlewares.length || !predicate(context)) return;
      const middleware = middlewares[index++];
      try {
        await middleware(context, next);
      } catch (error) {
        await this.errorHandler(error as Error, context);
      }
    };

    try {
      await next();
    } catch (error) {
      await this.errorHandler(error as Error, context);
    }
  }

  compose(middlewares: Middleware[]): Middleware {
    return async (context: MiddlewareContext, next: () => Promise<void>): Promise<void> => {
      let index = 0;

      const dispatch = async (i: number): Promise<void> => {
        if (i >= middlewares.length) return next();
        const middleware = middlewares[i];
        await middleware(context, () => dispatch(i + 1));
      };

      await dispatch(0);
    };
  }

  wrap(handler: RequestHandler): Middleware {
    return async (context: MiddlewareContext, next: () => Promise<void>): Promise<void> => {
      const result = handler(context);
      if (result instanceof Promise) {
        await result;
      }
      await next();
    };
  }

  async errorHandler(error: Error, context: MiddlewareContext): Promise<void> {
    if (this.customErrorHandler) {
      const result = this.customErrorHandler(error, context);
      if (result instanceof Promise) {
        await result;
      }
    } else {
      throw error;
    }
  }

  setErrorHandler(handler: ErrorHandler): void {
    this.customErrorHandler = handler;
  }

  getStack(): MiddlewareStack {
    return this.stack;
  }

  setStack(stack: MiddlewareStack): void {
    this.stack = stack.clone();
  }

  add(middleware: Middleware): void {
    this.stack.add(middleware);
  }

  addBefore(target: Middleware, middleware: Middleware): void {
    this.stack.addBefore(target, middleware);
  }

  addAfter(target: Middleware, middleware: Middleware): void {
    this.stack.addAfter(target, middleware);
  }

  remove(middleware: Middleware): boolean {
    return this.stack.remove(middleware);
  }

  clear(): void {
    this.stack.clear();
  }

  clone(): MiddlewareRunner {
    return new MiddlewareRunner(this.stack);
  }
}
