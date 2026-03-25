import { Request, Response } from 'express';
import { Middleware } from '../core';

export interface RouteHandler {
  readonly path: string;
  readonly method: string;
  readonly middleware: ReadonlyArray<Function>;

  handle(req: Request, res: Response): Promise<void>;
  validate(req: Request): boolean;
  parseParams(req: Request): Record<string, string>;
  setMiddleware(fn: Function): void;
  getPath(): string;
}
