/**
 * Typed HTTP error with structured details and status code mapping.
 */
export class ApiError extends Error {
  public readonly code: number;
  public readonly message: string;
  public readonly details: unknown;
  public readonly statusCode: number;

  constructor(code: number, message: string, details: unknown, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.message = message;
    this.details = details;
    this.statusCode = statusCode;

    // Restore prototype chain (important for instanceof checks after construction)
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Creates an ApiError from an HTTP response status and body.
   *
   * @param status  HTTP status code (e.g., 400, 404, 500).
   * @param body    Response body (expected to be unknown).
   * @returns An instance of ApiError.
   * @throws Type  TypeError if status is not a number.
   */
  public static fromHttp(status: number, body: unknown): ApiError {
    if (typeof status !== 'number') {
      throw new TypeError('status must be a number');
    }

    let code = status;
    let message = 'HTTP Error';
    let details = body;

    if (body && typeof body === 'object' && 'message' in body && typeof (body as Record<string, unknown>).message === 'string') {
      message = (body as Record<string, string>).message;
    }
    if (body && typeof body === 'object' && 'code' in body && typeof (body as Record<unknown>).code === 'number') {
      code = (body as Record<unknown, number>).code;
    }

    return new ApiError(code, message, details, status);
  }

  /**
   * Serialize the error to a plain object.
   *
   * @returns Object containing code, message, details, and statusCode.
   */
  public toJSON(): object {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode
    };
  }

  /**
   * Check if the error is a server-side error (5xx).
   *
   * @returns true if statusCode is between 500 and 599 inclusive.
   */
  public isServer(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }

  /**
   * Check if the error is a client-side error (4xx).
   *
   * @returns true if statusCode is between 400 and 499 inclusive.
   */
  public isClient(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Create a new ApiError with the same code, message, and statusCode,
   but different details.
   *
   * @param details New details to replace the current ones.
   * @returns A new ApiError instance with updated details.
   */
  public extend<Details = unknown>(details: Details): ApiError {
    return new ApiError(this.code, this.message, details, this.statusCode);
  }
}
