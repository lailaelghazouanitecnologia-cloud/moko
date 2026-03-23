import { Route } from './route';
import { RouteNode } from './route-node';
import { RouteMatch } from './route-match';
import { Request, Response, RequestHandler, ParamHandler, Middleware } from './types';

export class Router {
  private root: RouteNode = new RouteNode();
  private middleware: Middleware[] = [];
  private routes: Map<string, Route> = new Map();

  get(path: string, ...handlers: RequestHandler[]): Router {
    return this.addRoute('GET', path, handlers);
  }

  post(path: string, ...handlers: RequestHandler[]): Router {
    return this.addRoute('POST', path, handlers);
  }

  put(path: string, ...handlers: RequestHandler[]): Router {
    return this.addRoute('PUT', path, handlers);
  }

  delete(path: string, ...handlers: RequestHandler[]): Router {
    return this.addRoute('DELETE', path, handlers);
  }

  patch(path: string, ...handlers: RequestHandler[]): Router {
    return this.addRoute('PATCH', path, handlers);
  }

  head(path: string, ...handlers: RequestHandler[]): Router {
    return this.addRoute('HEAD', path, handlers);
  }

  options(path: string, ...handlers: RequestHandler[]): Router {
    return this.addRoute('OPTIONS', path, handlers);
  }

  use(path: string | RequestHandler, handler?: RequestHandler): Router {
    if (typeof path === 'function') {
      this.middleware.push({ path: '*', handler: path });
    } else if (handler) {
      this.middleware.push({ path: path as string, handler });
    }
    return this;
  }

  route(path: string): Route {
    const route = new Route(path);
    this.routes.set(path, route);
    return route;
  }

  find(method: string, pathname: string): RouteMatch | null {
    return this.root.find(method, pathname);
  }

  async handle(req: Request, res: Response): Promise<void> {
    // Apply global middleware
    for (const mw of this.middleware) {
      if (mw.path === '*' || mw.path === req.path) {
        await new Promise<void>((resolve, reject) => {
          const next = (err?: Error) => {
            if (err) reject(err);
            else resolve();
          };
          mw.handler(req, res, next);
        });
      }
    }

    const match = this.find(req.method, req.path);
    if (!match) {
      res.status(404).send('Not Found');
      return;
    }

    req.params = match.params;

    // Execute route handlers
    for (const handler of match.handlers) {
      await new Promise<void>((resolve, reject) => {
        const next = (err?: Error) => {
          if (err) reject(err);
          else resolve();
        };
        handler(req, res, next);
      });
    }
  }

  param(name: string, handler: ParamHandler): Router {
    this.root.addParamHandler(name, handler);
    return this;
  }

  all(path: string, ...handlers: RequestHandler[]): Router {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    for (const method of methods) {
      this.addRoute(method, path, handlers);
    }
    return this;
  }

  private addRoute(method: string, path: string, handlers: RequestHandler[]): Router {
    this.addRoute(method, path, handlers);
    return this;
  }

  addRoute(method: string, path: string, handlers: RequestHandler[]): void {
    const key = `${method}:${path}`;
    const route = new Route(path);
    route.setHandlers(handlers);
    this.routes.set(key, route);
    this.root.addRoute(method, path, handlers);
  }

  buildRouteTree(): void {
    this.root.build();
  }
}
