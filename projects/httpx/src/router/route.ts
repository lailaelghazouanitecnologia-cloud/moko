import { Router } from './router';
import { RequestHandler, ParamHandler } from './types';

export class Route {
  path: string;
  handlers: RequestHandler[] = [];
  router: Router;

  constructor(path: string, router: Router) {
    this.path = path;
    this.router = router;
  }

  get(...handlers: RequestHandler[]): Route {
    this.router.addRoute('GET', this.path, handlers);
    return this;
  }

  post(...handlers: RequestHandler[]): Route {
    this.router.addRoute('POST', this.path, handlers);
    return this;
  }

  put(...handlers: RequestHandler[]): Route {
    this.router.addRoute('PUT', this.path, handlers);
    return this;
  }

  delete(...handlers: RequestHandler[]): Route {
    this.router.addRoute('DELETE', this.path, handlers);
    return this;
  }

  patch(...handlers: RequestHandler[]): Route {
    this.router.addRoute('PATCH', this.path, handlers);
    return this;
  }

  head(...handlers: RequestHandler[]): Route {
    this.router.addRoute('HEAD', this.path, handlers);
    return this;
  }

  options(...handlers: RequestHandler[]): Route {
    this.router.addRoute('OPTIONS', this.path, handlers);
    return this;
  }

  all(...handlers: RequestHandler[]): Route {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    methods.forEach(method => {
      this.router.addRoute(method, this.path, handlers);
    });
    return this;
  }

  middleware(...handlers: RequestHandler[]): Route {
    this.handlers.unshift(...handlers);
    return this;
  }

  param(name: string, handler: ParamHandler): Route {
    this.router.addParamHandler(this.path, name, handler);
    return this;
  }

  build(): void {
    // Route handlers are already registered via method calls
    // This method exists for API compatibility
  }

  clone(): Route {
    const cloned = new Route(this.path, this.router);
    cloned.handlers = [...this.handlers];
    return cloned;
  }
}
