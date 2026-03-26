export class MCPInstallAbortFault extends Error {
  private readonly reason: string;
  private readonly stage?: string;

  constructor(reason: string, stage?: string) {
    if (reason.trim().length === 0) {
      throw new RangeError('reason must not be empty');
    }
    if (stage !== undefined && typeof stage !== 'string') {
      throw new TypeError('stage must be a string or undefined');
    }

    const message = stage
      ? `MCP install aborted at ${stage}: ${reason}`
      : `MCP install aborted: ${reason}`;
    super(message);

    this.name = 'MCPInstallAbortFault';
    this.reason = reason;
    this.stage = stage;

    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  getReason(): string {
    return this.reason;
  }

  getStage(): string | undefined {
    return this.stage;
  }

  toString(): string {
    return this.stage
      ? `MCP install aborted at ${this.stage}: ${this.reason}`
      : `MCP install aborted: ${this.reason}`;
  }
}
