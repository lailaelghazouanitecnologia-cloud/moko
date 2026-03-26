export class MCPCommandMissingFault extends Error {
  private readonly command: string;
  private readonly provider: string;

  constructor(command: string, provider: string) {
    if (command.length === 0) {
      throw new RangeError('command cannot be empty');
    }
    if (provider.length === 0) {
      throw new RangeError('provider cannot be empty');
    }

    super(`MCP command '${command}' not found in provider '${provider}'`);
    this.name = 'MCPCommandMissingFault';
    this.command = command;
    this.provider = provider;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPCommandMissingFault);
    }
  }

  getCommand(): string {
    return this.command;
  }

  getProvider(): string {
    return this.provider;
  }

  toString(): string {
    return `MCPCommandMissingFault: Command '${this.command}' not available from provider '${this.provider}'`;
  }
}
