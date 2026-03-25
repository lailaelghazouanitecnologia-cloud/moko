/**
 * CLI — argument parser and application entry point.
 * Parses process.argv into ParsedCommand and runs through CommandExecutor.
 */

import { join } from 'path';
import { homedir } from 'os';
import { TaskStore } from './task-store';
import { CommandExecutor, ParsedCommand } from './commands';
import { Formatter } from './formatter';
import { AppConfig, Priority, TaskFilter, TaskStatus, UpdateTaskInput, SortSpec } from './types';

/** Default application configuration. */
const DEFAULT_CONFIG: AppConfig = {
  dataDir: join(homedir(), '.todo-cli'),
  defaultPriority: 'medium',
  defaultSort: { field: 'priority', direction: 'asc' },
  colorEnabled: process.stdout.isTTY ?? false,
  dateFormat: 'short',
};

/** Parse command-line arguments into a ParsedCommand. */
function parseArgs(args: ReadonlyArray<string>): ParsedCommand {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === 'help' || subcommand === '--help') {
    return { cmd: 'help' };
  }

  switch (subcommand) {
    case 'add':
      return parseAddCommand(rest);
    case 'list':
    case 'ls':
      return parseListCommand(rest);
    case 'done':
    case 'complete':
      return parseIdCommand('done', rest);
    case 'start':
      return parseIdCommand('start', rest);
    case 'cancel':
      return parseIdCommand('cancel', rest);
    case 'delete':
    case 'rm':
      return parseIdCommand('delete', rest);
    case 'show':
    case 'info':
      return parseIdCommand('show', rest);
    case 'edit':
      return parseEditCommand(rest);
    case 'tag':
      return parseTagCommand(rest);
    case 'stats':
      return { cmd: 'stats' };
    default:
      // Treat unknown as implicit "add" if it looks like a title
      return parseAddCommand([subcommand, ...rest]);
  }
}

/** Parse "add" command arguments. */
function parseAddCommand(args: string[]): ParsedCommand {
  const titleParts: string[] = [];
  let priority: Priority | undefined;
  let tags: string[] | undefined;
  let due: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-p':
      case '--priority':
        priority = validatePriority(args[++i]);
        break;
      case '-t':
      case '--tags':
        tags = args[++i]?.split(',').map(t => t.trim()).filter(Boolean);
        break;
      case '--due':
        due = args[++i];
        break;
      default:
        titleParts.push(arg);
    }
  }

  return {
    cmd: 'add',
    title: titleParts.join(' '),
    priority,
    tags,
    due,
  };
}

/** Parse "list" command arguments. */
function parseListCommand(args: string[]): ParsedCommand {
  const filter: TaskFilter = {};
  let sort: SortSpec | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-s':
      case '--status':
        filter.status = args[++i] as TaskStatus;
        break;
      case '-p':
      case '--priority':
        filter.priority = validatePriority(args[++i]);
        break;
      case '-t':
      case '--tag':
        filter.tag = args[++i];
        break;
      case '--search':
        filter.search = args[++i];
        break;
      case '--sort': {
        const field = args[++i] as 'priority' | 'created' | 'due' | 'status';
        const direction = args[i + 1] === 'desc' ? (i++, 'desc' as const) : 'asc' as const;
        sort = { field, direction };
        break;
      }
      case '--all':
        // No filter — show everything including completed
        break;
      default:
        // Treat as search query
        filter.search = args.slice(i).join(' ');
        i = args.length;
    }
  }

  // Default: hide completed/cancelled unless explicitly filtered
  if (!filter.status) {
    // Show only pending and in_progress by default
    // (handled in list display, not here)
  }

  return { cmd: 'list', filter, sort };
}

/** Parse commands that take a task ID. */
function parseIdCommand(cmd: 'done' | 'start' | 'cancel' | 'delete' | 'show', args: string[]): ParsedCommand {
  const id = args[0];
  if (!id) {
    return { cmd: 'help' };
  }
  return { cmd, id };
}

/** Parse "edit" command. */
function parseEditCommand(args: string[]): ParsedCommand {
  const id = args[0];
  if (!id) return { cmd: 'help' };

  const updates: UpdateTaskInput = {};
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--title':
        (updates as Record<string, unknown>).title = args[++i];
        break;
      case '--priority':
      case '-p':
        (updates as Record<string, unknown>).priority = validatePriority(args[++i]);
        break;
      case '--due':
        (updates as Record<string, unknown>).dueDate = new Date(args[++i]);
        break;
      case '--status':
      case '-s':
        (updates as Record<string, unknown>).status = args[++i] as TaskStatus;
        break;
    }
  }

  return { cmd: 'edit', id, updates };
}

/** Parse "tag" command. */
function parseTagCommand(args: string[]): ParsedCommand {
  const id = args[0];
  if (!id) return { cmd: 'help' };
  const tags = args.slice(1).flatMap(t => t.split(',').map(s => s.trim()).filter(Boolean));
  return { cmd: 'tag', id, tags };
}

/** Validate and return a priority value. */
function validatePriority(input: string | undefined): Priority {
  const valid: ReadonlyArray<Priority> = ['critical', 'high', 'medium', 'low'];
  if (input && valid.includes(input as Priority)) {
    return input as Priority;
  }
  // Support shorthand
  const shortcuts: Readonly<Record<string, Priority>> = {
    c: 'critical', h: 'high', m: 'medium', l: 'low',
    crit: 'critical', hi: 'high', med: 'medium', lo: 'low',
  };
  return shortcuts[input?.toLowerCase() ?? ''] ?? 'medium';
}

/** Application entry point. */
export function main(argv: ReadonlyArray<string> = process.argv.slice(2)): void {
  const config = DEFAULT_CONFIG;
  const dataFile = join(config.dataDir, 'tasks.json');

  const store = new TaskStore(dataFile);
  const executor = new CommandExecutor(store);
  const formatter = new Formatter(config);

  const command = parseArgs([...argv]);
  const result = executor.execute(command);

  console.log(formatter.formatResult(result));
}

// Run if executed directly
main();
