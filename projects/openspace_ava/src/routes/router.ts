import { RouteHandler } from './route-handler';
import { ResponseBuilder } from './response-builder';

type Request = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
};

type Response = {
  statusCode: number;
  headers: Record<string, string>;
  body: string | Buffer;
};

export class Router {
  private readonly routes: Map<string, RouteHandler>;
  private readonly middlewares: Array<(req: Request, res: Response, next: () => void) => void>;

  constructor() {
    this.routes = new Map<string, RouteHandler>();
    this.middlewares = [];
  }

  get(path: string, handler: RouteHandler): void {
    this.routes.set(`GET:${path}`, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.routes.set(`POST:${path}`, handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.routes.set(`PUT:${path}`, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.routes.set(`DELETE:${path}`, handler);
  }

  use(middleware: (req: Request, res: Response, next: () => void) => void): void {
    this.middlewares.push(middleware);
  }

  resolve(method: string, url: string): RouteHandler | null {
    const key = `${method.toUpperCase()}:${url}`;
    return this.routes.get(key) ?? null;
  }

  async dispatch(req: Request, res: Response): Promise<void> {
    const handler = this.resolve(req.method, req.url);
    if (!handler) {
      res.statusCode = 404;
      res.body = 'Not Found';
      return;
    }

    let middlewareIndex = 0;
    const next = async (): Promise<void> => {
      if (middlewareIndex < this.middlewares.length) {
        const middleware = this.middlewares[middlewareIndex++];
        return new Promise<void>((resolve) => {
          middleware(req, res, () => {
            resolve(next());
          });
        });
      }
      await handler.handle(req, res);
    };

    await next();
  }
}
