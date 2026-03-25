export interface ParsedCommand {
  command: string;
  options: Record<string, unknown>;
  args: string[];
}
