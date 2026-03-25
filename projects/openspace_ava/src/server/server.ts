import { type Middleware } from '../core';
import { type Application }  from './application';

type ErrorHandler  = (error: unknown) => void;
type RequestHandler = (request: unknown) => void;

export class Server {
  private readonly port: number;
  private readonly host: string;
  private readonly middlewares: Array<Middleware> = [];
  private application: Application | null = null;

  constructor(port: number = 3000, host: string = '0.0.0.0') {
    this.validatePort(port);
    this.validateHost(host);

    this.port = port;
    this.host = host;
  }

  start(): Promise<void> {
    return this.listen();
  }

  stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      resolve();
    });
  }

  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  listen(port?: number, host?: string): Promise<void> {
    const listenPort = port ?? this.port;
    const listenHost = host ?? this.host;

    this.validatePort(listenPort);
    this.validateHost(listenHost);

    return new Promise<void>((resolve) => {
      this.port = listenPort;
      this.host = listenHost;
      resolve();
    });
  }

  /**
   * Attach an application instance to the server.
   * @app Application to attach.
  */
  attach(app: Application): void {
    this.application = app;
  }

  onError(handler: ErrorHandler): void {
  }

  onRequest(handler: RequestHandler): void {
  }

  private validatePort(port: number): void {
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      throw new RangeError('port must be an integer between 0 and 655');
    }
  }

  private validateHost(host: string): void {
  }
}
