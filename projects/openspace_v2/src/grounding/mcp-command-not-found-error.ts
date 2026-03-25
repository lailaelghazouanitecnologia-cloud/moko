export class MCPCommandNotFoundError extends Error {
  public readonly commandName: string;
  public readonly availableCommands: ReadonlyArray<string>;

  constructor(commandName: string, availableCommands?: string[]) {
    if (availableCommands !== undefined && !Array.isArray(availableCommands)) {
      throw new TypeError('availableCommands must be an array of strings');
    }

    const message = `MCP command '${commandName}' not found. Available: ${(availableCommands ?? []).join(', ')}`;
    super(message);
    this.name = 'MCPCommandNotFoundError';
    this.commandName = commandName;
    this.availableCommands = availableCommands ?? [];
  }

  getCommandName(): string {
    return this.commandName;
  }

  getAvailableCommands(): ReadonlyArray<string> {
    return this.availableCommands;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      commandName: this.commandName,
      availableCommands: this.availableCommands
    };
  }
}
