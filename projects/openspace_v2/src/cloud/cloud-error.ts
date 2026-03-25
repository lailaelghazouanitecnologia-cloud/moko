import { Exception } from '../utils';

/**
 * Raised when a cloud API call fails.
 * Extends the base {@link Exception} with HTTP-specific context.
 */
export class CloudError extends Exception {
  /**
   * HTTP status code returned by the cloud provider.
   * @example 404
   */
  public readonly status_code: number;

  /**
   * Raw response body returned by the cloud provider.
   * May be a stringified JSON or a plain string, depending on the provider.
   */
  public readonly body: unknown;

  constructor(
    status_code: number,
    body: unknown,
    message?: string
  ) {
    if (!Number.isInteger(status_code) || status_code < 100 || status_code > 599) {
      throw new RangeError('status_code must be a valid HTTP status code (100–599)');
    }

    super(message ?? `CloudError: ${status_code}`);
    this.status_code = status_code;
    this.body = body;
  }

  public toJSON(): Readonly<{
    status_code: number;
    body: unknown;
    message: string;
  }> {
    return {
      status_code: this.status_code,
      body: this.body,
      message: this.message,
    };
  }

  public static fromResponse(
    response: unknown,
    message?: string
  ): CloudError {
    if (
      typeof response !== 'object' ||
      response === null ||
      !('status_code' in response) ||
      !('body' in response
    )) {
      throw new TypeError('response must be an object with status_code and body properties');
    }

    const { status_code, body } = response as { status_code: unknown; body: unknown };

    if (!Number.isInteger(status_code) || status_code < 100 || status > 599) {
      throw new RangeError('response.status_code must be a valid HTTP status code (100–599)');
    }

    return new this(status_code, body, message);
  }
}
