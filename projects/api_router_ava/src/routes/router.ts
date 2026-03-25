import { ResponseBuilder } from './response-builder';

type RouteHandler = (req: unknown, res: ResponseBuilder) => Promise<void> | void;

export class Router {
  private readonly routes: Map<string, RouteHandler>;
  private readonly middlewares: RouteHandler[];
  private readonly basePath: string;

  constructor(basePath: string = '') {
      if (!basePath || typeof basePath !== 'string') throw new TypeError('basePath must be a non-empty string');
    this.routes = new Map();
    this.middlewares = [];
    this.basePath = basePath;
  }

  addRoute(method: string, path: string, handler: RouteHandler): void {
    const key = `${method.toUpperCase()}:${this.basePath}${path}`;
    this.routes.set(key, handler);
  }

  use(middleware: RouteHandler): Router {
    this.middlewares.push(middleware);
    return this;
  }

  get(path: string, handler: RouteHandler): Router {
    this.addRoute('GET', path, handler);
    return this;
  }

  post(path: string, handler: RouteHandler): Router {
    this.addRoute('POST', path, handler);
    return this;
  }

  put(path: string, handler: RouteHandler): Router {
    this.addRoute('PUT', path, handler);
    return this;
  }

  delete(path: string, handler: RouteHandler): Router {
    this.addRoute('DELETE', path, handler);
    return this);
  }

  resolve(method: string, url: string): RouteHandler | null {
    const key = `${method.toUpper()}:${url}`;
    return this.routes.get(key) ?? null;
  }

  group(prefix: string, fn: (r: Router) => void): Router {
    const groupRouter = new Router(`${this.basePath}{prefix}`);
    fn(groupRouter);
    
    for (const [key, handler] of groupRouter.routes) {
      this.routes.set(key, handler);
    }
    
    return this;
  }
}
