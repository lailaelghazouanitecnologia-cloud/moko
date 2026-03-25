type CommandExecutor = (args: ArgMap) => Promise<Result<unknown>>;
import { Result } from '../core';
import { ValidationError } from '../core';
type ValidatorFn = (cmd: ParsedCommand) => ValidationResult;
type ValidationResult = { kind: 'ok' } | { kind: 'error'; error: string };
type ArgMap = ReadonlyMap<string, string>;

interface ParsedCommand {
  readonly name: string;
  readonly args: ArgMap;
  readonly raw: string;
}

export class CommandParser {
  private readonly registry = new Map<string, CommandExecutor>();
  private readonly validators = new Map<string, ValidatorFn>();
  private readonly aliases = new Map<string, string>();

  parse(input: string): ParsedCommand {
    const tokens = input.trim().split(/\s+/);
    if (tokens.length === 0) {
      throw new ValidationError('input', 'Empty command', 'empty_command', input);
    }

    const rawName = tokens[0];
    const name = this.resolveAlias(rawName);
    const args = this.parseArgs(tokens.slice(1));

    return {
      name,
      args,
      raw: input
    };
  }

  register(name: string, executor: CommandExecutor): void {
    this.registry.set(name, executor);
  }

  validate(cmd: ParsedCommand): ValidationResult {
    const validator = this.validators.get(cmd.name);
    if (!validator) {
      return { kind: 'ok' };
    }
    return validator(cmd);
  }

  resolveAlias(token: string): string {
    return this.aliases.get(token) ?? token;
  }

  buildHelp(cmd?: string): string {
    if (cmd) {
      const executor = this.registry.get(cmd);
      if (!executor) {
        return `No help available for unknown command: ${cmd}`;
      }
      return `Usage: ${cmd} [options...]`;
    }

    const commands = Array.from(this.registry.keys()).sort();
    return `Available commands:\n${commands.map(c => `  ${c}`).join('\n')}`;
  }

  parseArgs(tokens: ReadonlyArray<string>): ArgMap {
    const args = new Map<string, string>();
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.startsWith('--')) {
        const key = token.slice(2);
        const value = tokens[i + 1] && !tokens[i + 1].startsWith('--') ? tokens[i + 1] : 'true';
        args.set(key, value);
        if (value !== 'true') {
          i++;
        }
      } else if (token.startsWith('-')) {
        const key = token.slice(1);
        const value = tokens[i + 1] && !tokens[i + 1].startsWith('-') ? tokens[i + 1] : 'true';
        args.set(key, value);
        if (value !== 'true') {
          i++;
        }
      }
    }
    return args;
  }
}
