interface Logger {
  error: (message: string | object) => void;
}

/**
 * Represents an HTTP error with additional metadata.
 */
export interface HttpError extends Error {
  name: string;
  statusCode: number;
  status: number;
  isOperational?: boolean;
}

/**
 * Centralized middleware for handling all application errors.
 * Maps custom and native errors to appropriate HTTP responses.
 */
export class GlobalExceptionHandler {
  private static readonly ERROR_CODES = new Map<string, number>([
    ['ValidationError', 400],
    ['UnauthorizedError', 401],
    ['ForbiddenError', 403],
    ['NotFoundError', 404],
    ['ConflictError', 409],
    ['InternalServerError', 500]
  ]);

  constructor(private readonly logger: Logger) {
    if (!logger || typeof logger.error !== 'function') {
      throw new TypeError('A valid Logger instance is required');
    }
  }

  /**
   * Express error-handling middleware.
   * Logs the error, maps it to an HTTP error, and sends a JSON response.
   *
   * @param err - The error object
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  handle(err: Error, req: any, res: any, next: any): void {
    if (!err || !(err instanceof Error)) {
      err = new Error('Unknown error');
    }

    const httpError = this.mapError(err);

    this.logger.error({
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (res.headersSent) {
      return next(err);
    }

    res.status(httpError.statusCode).json({
      error: {
        message: httpError.message,
        code: httpError.name,
        status: httpError.statusCode,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      }
    });
  }

  /**
   * Maps an Error instance to an HttpError with status code and operational flag.
   *
   * @param err - The error to map
   * @returns HttpError with enriched metadata
   */
  mapError(err: Error): HttpError {
    if (!err || !(err instanceof Error)) {
      throw new TypeError('Invalid error object provided');
    }

    const errorName = err.constructor.name;
    const statusCode = GlobalExceptionHandler.ERROR_CODES.get(errorName) || 500;

    const httpError: HttpError = Object.assign(new Error(err.message), {
      name: errorName,
      statusCode,
      status: statusCode,
      isOperational: GlobalExceptionHandler.isOperational(err)
    });

    return httpError;
  }

  /**
   * Determines whether an error is operational (client-induced) or programming-related.
   *
   * @param err - The error to check
   * @returns true if the error is operational
   */
  static isOperational(err: Error): boolean {
    if (!err || !(err instanceof Error)) {
      return false;
    }
    return err.name.endsWith('Error') &&
      !['InternalServerError', 'TypeError', 'RangeError', 'ReferenceError'].includes(err.name);
  }

  /**
   * Registers this handler as Express error middleware.
   *
   * @returns Express error-handling middleware function
   */
  public middleware(): (err: Error, req: any, res: any, next: any) => void {
    return this.handle.bind(this);
  }

  /**
   * Adds or updates a custom error code mapping.
   *
   * @param errorName - Constructor name of the error
   * @param statusCode - HTTP status code to map to
   */
  public static setErrorCode(errorName: string, statusCode: number): void {
    if (typeof errorName !== 'string' || !errorName) {
      throw new TypeError('errorName must be a non-empty string');
    }
    if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
      throw new RangeError('statusCode must be an integer between 100 and 599');
    }
    GlobalExceptionHandler.ERROR_CODES.set(errorName, statusCode);
  }

  /**
   * Removes a custom error code mapping.
   *
   * @param errorName - Constructor name of the error
   * @returns true if the mapping existed and was removed
   */
  public static removeErrorCode(errorName: string): boolean {
    if (typeof errorName !== 'string') {
      throw new TypeError('errorName must be a string');
    }
    return GlobalExceptionHandler.ERROR_CODES.delete(errorName);
  }

  /**
   * Retrieves the current error code mapping for a given error name.
   *
   * @param errorName - Constructor name of the error
   * @returns the mapped status code, or undefined if not found
   */
  public static getErrorCode(errorName: string): number | undefined {
    if (typeof errorName !== 'string') {
      throw new TypeError('errorName must be a string');
    }
    return GlobalExceptionHandler.ERROR_CODES.get(errorName);
  }
}
