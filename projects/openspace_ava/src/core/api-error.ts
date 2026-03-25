export class ApiError {
  readonly code: string;
   readonly message: string;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status: number = 500,
    details: Record<string, unknown> = {}
  ) {
    if (!Number.isInteger(status) || status < 0 || status > 999) {
      throw new RangeError('status must be an integer between 0 and 999');
    }

    this.code = code;
    this.message = message;
    this.status = status;
    this.details = details;
  }

  toJSON(): { code: string; message: string; status: number; details: Record<string, unknown> } {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details
    };
  }

  toString(): string {
    return `ApiError: ${this.code} (${this.status}) - ${this.message}`;
  }

  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }

  getDetail(key: string): unknown {
    return this.details[key];
  }
}
