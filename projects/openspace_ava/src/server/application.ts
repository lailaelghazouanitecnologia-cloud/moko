import { ApiError, AppConfig, Middleware } from '../core';
import { ResponseBuilder, RouteHandler, Router } from '../routes';
import { Server } from './server';

export class Application {
  private readonly config: AppConfig;
  private readonly router: Router;
  private readonly middlewares: Array<Middleware>;
  private server: Server | null = null;

  constructor(config: AppConfig) {
    this.config = config;
    this.router = new Router();
    this.middlewares = [];
  }

  getConfig(): AppConfig {
    return this.config;
  }

  getRouter(): Router {
    return this.router;
  }

  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => a.priority - b.priority);
  }

  route(path: string, handler: RouteHandler): void {
    this.router.routes.set(path, handler);
  }

  async start(port?: number, host?: string): Promise<void> {
    this.server = new Server(port ?? 3000, host ?? '0.0.0.0');
    this.server.attach(this);
    this.middlewares.forEach(mw => this.server?.use(mw));
    await this.server.start();
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.stop();
      this.server = null;
    }
  }

  handleRequest(path: string, method: string): ResponseBuilder {
    const handler = this.router.resolve(path, method);
    if (!handler) {
      return new ResponseBuilder().status(404).json({ error: 'Not Found' });
    }
    return new ResponseBuilder().status(200);
  }

  addMiddleware(middleware: Middleware): void {
    this.use(middleware);
  }

  removeMiddleware(name: string): boolean {
    const idx = this.middlewares.findIndex(m => m.name === name);
    if (idx === -1) return false;
    this.middlewares.splice(idx, 1);
    return true;
  }

  listMiddlewares(): ReadonlyArray<Middleware> {
    return this.middlewares;
  }

  getStatus(): 'running' | 'stopped' {
    return this.server ? 'running' : 'stopped';
  }

  getPort(): number {
    return this.server?.port ?? 3000;
  }

  getHost(): string {
    return this.server?.host ?? '0.0.0.0';
  }

  configure(newConfig: Partial<AppConfig>): void {
    Object.assign(this.config, newConfig);
  }

  reset(): void {
    this.middlewares.length = 0;
    this.router.routes.clear();
  }
}
