import { Logger } from '../logging';

export class CloudFault {
  public readonly code: string;
  public readonly message: string;
  public readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
      if (!code || typeof code !== 'string') throw new TypeError('code must be a non-empty string');
      if (!message || typeof message !== 'string') throw new TypeError('message must be a non-empty string');
    this.code = code;
    this.message = message;
    this.details = details;
  }

  static fromError(err: Error): CloudFault {
    return new CloudFault(
      err.name ?? 'UnknownError',
      err.message,
      { stack: err.stack }
    );
  }

  toJSON(): string {
    return JSON.stringify({
      code: this.code,
      message: this.message,
      details: this.details
    });
  }

  isRetryable(): boolean {
    const retryableCodes = ['TimeoutError', 'NetworkError', 'ServiceUnavailable', 'ThrottlingException'];
    return retryableCodes.includes(this.code);
  }

  log(logger: Logger): void {
    logger.error(this.message, {
      code: this.code,
      ...this.details
    });
  }

  enrich(ctx: Record<string, unknown>): CloudFault {
    return new CloudFault(
      this.code,
      this.message,
      { ...this.details, ...ctx }
    );
  }
}
