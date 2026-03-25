type Handler = (req: unknown, res: ResponseBuilder) => Promise<void> | void;
type ErrorHandler = (error: ApiError, req: unknown, res: ResponseBuilder) => Promise<void> | void;
type AppConfig = { port?: number; host?: string };

interface Server {
  listen(port: number, host: string, callback: () => void): void;
  close(callback: () => void): void;
}

export class Application {
  private server: Server;
  private middleware: Middleware[];
  private port: number;
  private host: string;
  private readonly router: Router;
  private errorHandler?: ErrorHandler;

  constructor(server: Server) {
    this.server = server;
    this.middleware = [];
    this.port = 3000;
    this.host = 'localhost';
    this.router = new Router();
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, () => {
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  route(path: string, handler: Handler): void {
    this.router.addRoute(path, handler);
  }

  async listen(port?: number, host?: string): Promise<void> {
    if (port !== undefined) {
      this.port = port;
    }
    if (host !== undefined) {
      this.host = host;
    }
    await this.start();
  }

  configure(config: AppConfig): void {
    if (config.port !== undefined) {
      this.port = config.port;
    }
    if (config.host !== undefined) {
      this.host = config.host;
    }
  }

  error(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }
}
