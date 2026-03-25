export class MCPInstallationCancelledError extends Error {
  private readonly message: string;
  private readonly command: string;
  private readonly status: number;
  private readonly confirmation: boolean;

  constructor(
    message: string,
    command: string = '',
    status: number = 0,
    confirmation: boolean = false
  ) {

    super(message);
    this.name = 'MCPInstallationCancelledError';
    this.message = message;
    this.command = command;
    this.status = status;
    this.confirmation = confirmation;
  }

  getMessage(): string {
    return this.message;
  }

  getCommand(): string {
    return this.command;
  }

   getStatus(): number {
     return this.status;
   }

  isConfirmed(): boolean {
    return this.confirmation;
  }

  toString(): string {
    return `MCPInstallationCancelledError: ${this.message} (command: "${this.command}", status: ${this.status}, confirmed: ${this.confirmation})`;
  }

  isRetryable(): boolean {
    return !this.confirmation;
  }

  getName(): string {
    return this.name;
  }
}
