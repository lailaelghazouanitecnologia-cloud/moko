export interface Middleware {
  readonly name: string;
  process(req: Request, res: Response, next: NextFunction): void;
  match(path: string): boolean;
  priority(): number;
  errorHandler(err: ApiError, req: Request, res: Response, next: NextFunction): void;
  teardown(): void;
}
