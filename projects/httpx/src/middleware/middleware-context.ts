import { Request } from '../http/request';
import { Response } from '../http/response';

export class MiddlewareContext {
  private readonly request: Request;
  private readonly response: Response;
  private readonly state: Map<string, unknown>;
  private readonly params: Record<string, string>;
  private readonly query: Record<string, string>;
  private readonly body: unknown;

  constructor(request: Request, response: Response) {
    this.request = request;
    this.response = response;
    this.state = new Map<string, unknown>();
    this.params = {};
    this.query = {};
    this.body = undefined;
  }

  get<T>(key: string): T | undefined {
    return this.state.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): MiddlewareContext {
    const newContext = this.clone();
    (newContext as any).state.set(key, value);
    return newContext;
  }

  has(key: string): boolean {
    return this.state.has(key);
  }

  delete(key: string): MiddlewareContext {
    const newContext = this.clone();
    (newContext as any).state.delete(key);
    return newContext;
  }

  merge(values: Record<string, unknown>): MiddlewareContext {
    const newContext = this.clone();
    Object.entries(values).forEach(([key, value]) => {
      (newContext as any).state.set(key, value);
    });
    return newContext;
  }

  clear(): MiddlewareContext {
    const newContext = this.clone();
    (newContext as any).state.clear();
    return newContext;
  }

  getRequest(): Request {
    return this.request;
  }

  getResponse(): Response {
    return this.response;
  }

  setResponse(response: Response): MiddlewareContext {
    const newContext = this.clone();
    (newContext as any).response = response;
    return newContext;
  }

  getParams(): Record<string, string> {
    return { ...this.params };
  }

  setParams(params: Record<string, string>): MiddlewareContext {
    const newContext = this.clone();
    (newContext as any).params = { ...params };
    return newContext;
  }

  getQuery(): Record<string, string> {
    return { ...this.query };
  }

  setQuery(query: Record<string, string>): MiddlewareContext {
    const newContext = this.clone();
    (newContext as any).query = { ...query };
    return newContext;
  }

  getBody<T>(): T {
    return this.body as T;
  }

  setBody<T>(body: T): MiddlewareContext {
    const newContext = this.clone();
    (newContext as any).body = body;
    return newContext;
  }

  clone(): MiddlewareContext {
    const cloned = new MiddlewareContext(this.request, this.response);
    (cloned as any).state = new Map(this.state);
    (cloned as any).params = { ...this.params };
    (cloned as any).query = { ...this.query };
    (cloned as any).body = this.body;
    return cloned;
  }

  toJSON(): object {
    const stateObj: Record<string, unknown> = {};
    this.state.forEach((value, key) => {
      stateObj[key] = value;
    });

    return {
      state: stateObj,
      params: this.params,
      query: this.query,
      body: this.body
    };
  }
}
