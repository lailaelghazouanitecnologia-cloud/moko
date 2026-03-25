export class MCPInstallationFailedError extends Error {
  private readonly command: string;
  private readonly exitCode: number;
  private readonly output: string;
  private readonly isRetryable: boolean;

  constructor(
    message: string,
    command: string,
    exitCode?: number,
    output?: string,
    isRetryable: boolean = false
  ) {
    if (exitCode !== undefined && !Number.isInteger(exitCode)) {
      throw new RangeError('exitCode must be an integer');
    }
    if (output !== undefined && typeof output !== 'string') {
      throw new TypeError('output must be a string');
    }

    super(message);
    this.name = 'MCPInstallationFailedError';
    this.command = command;
    this.exitCode = exitCode ?? -1;
    this.output = output ?? '';
    this.isRetryable = isRetryable;
  }

  /** Returns the command that failed. */
  getCommand(): string {
    return this.command;
  }

  /** Returns the process exit code. */
  getExitCode(): number {
    return this.exitCode;
  }

  /** Returns the captured output. */
  getOutput(): string {
    return this.output;
  }

  /** Indicates whether the operation may be retried. */
  isRetryableError(): boolean {
    return this.isRetryable;
  }

  /** Returns a concise string representation. */
  override toString(): string {
    return `${this.name}: ${this.message} (command: ${this.command}, exitCode: ${this.exitCode})`;
  }

  /** Serializes the error to a plain object. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      command: this.command,
      exitCode: this.exitCode,
      output: this.output,
      isRetryable: this.isRetryable,
    };
  }
}
