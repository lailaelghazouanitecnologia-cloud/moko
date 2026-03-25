/**
 * Commands — CLI command implementations.
 * Each command maps to a user action (add, list, done, etc.)
 * and returns a CommandResult for uniform handling.
 */

import {
  CommandResult, TaskFilter, TaskId, TaskStatus, Priority,
  CreateTaskInput, UpdateTaskInput, SortSpec,
} from './types';
import { TaskStore } from './task-store';

/** Parsed command from CLI arguments. */
export type ParsedCommand =
  | { readonly cmd: 'add'; readonly title: string; readonly priority?: Priority; readonly tags?: string[]; readonly due?: string }
  | { readonly cmd: 'list'; readonly filter?: TaskFilter; readonly sort?: SortSpec }
  | { readonly cmd: 'done'; readonly id: string }
  | { readonly cmd: 'start'; readonly id: string }
  | { readonly cmd: 'cancel'; readonly id: string }
  | { readonly cmd: 'delete'; readonly id: string }
  | { readonly cmd: 'show'; readonly id: string }
  | { readonly cmd: 'edit'; readonly id: string; readonly updates: UpdateTaskInput }
  | { readonly cmd: 'tag'; readonly id: string; readonly tags: string[] }
  | { readonly cmd: 'stats' }
  | { readonly cmd: 'help' };

/** Execute commands against the task store. */
export class CommandExecutor {
  private readonly store: TaskStore;

  constructor(store: TaskStore) {
    this.store = store;
  }

  /** Execute a parsed command and return the result. */
  execute(command: ParsedCommand): CommandResult {
    switch (command.cmd) {
      case 'add': return this.add(command);
      case 'list': return this.list(command);
      case 'done': return this.setStatus(command.id, 'completed');
      case 'start': return this.setStatus(command.id, 'in_progress');
      case 'cancel': return this.setStatus(command.id, 'cancelled');
      case 'delete': return this.deleteTask(command.id);
      case 'show': return this.show(command.id);
      case 'edit': return this.edit(command.id, command.updates);
      case 'tag': return this.addTags(command.id, command.tags);
      case 'stats': return this.stats();
      case 'help': return this.help();
    }
  }

  /** Add a new task. */
  private add(cmd: Extract<ParsedCommand, { cmd: 'add' }>): CommandResult {
    const input: CreateTaskInput = {
      title: cmd.title,
      priority: cmd.priority,
      tags: cmd.tags,
      dueDate: cmd.due ? this.parseDate(cmd.due) : undefined,
    };

    try {
      const task = this.store.create(input);
      return {
        kind: 'success',
        message: `Created task ${task.id}: "${task.title}" [${task.priority}]`,
      };
    } catch (error) {
      return {
        kind: 'error',
        error: error instanceof TypeError ? error.message : 'Failed to create task',
        code: 'CREATE_FAILED',
      };
    }
  }

  /** List tasks with optional filter. */
  private list(cmd: Extract<ParsedCommand, { cmd: 'list' }>): CommandResult {
    const tasks = this.store.list(cmd.filter, cmd.sort);
    return {
      kind: 'list',
      tasks,
      total: this.store.count(cmd.filter),
    };
  }

  /** Change task status. */
  private setStatus(idInput: string, status: TaskStatus): CommandResult {
    const task = this.resolveTask(idInput);
    if (!task) {
      return { kind: 'error', error: `Task not found: ${idInput}`, code: 'NOT_FOUND' };
    }

    const updated = this.store.update(task.id, { status });
    if (!updated) {
      return { kind: 'error', error: 'Update failed', code: 'UPDATE_FAILED' };
    }

    const verbs: Record<TaskStatus, string> = {
      completed: 'completed',
      in_progress: 'started',
      cancelled: 'cancelled',
      pending: 'reset to pending',
    };

    return {
      kind: 'success',
      message: `Task ${updated.id} ${verbs[status]}: "${updated.title}"`,
    };
  }

  /** Delete a task. */
  private deleteTask(idInput: string): CommandResult {
    const task = this.resolveTask(idInput);
    if (!task) {
      return { kind: 'error', error: `Task not found: ${idInput}`, code: 'NOT_FOUND' };
    }

    this.store.delete(task.id);
    return {
      kind: 'success',
      message: `Deleted task ${task.id}: "${task.title}"`,
    };
  }

  /** Show task details. */
  private show(idInput: string): CommandResult {
    const task = this.resolveTask(idInput);
    if (!task) {
      return { kind: 'error', error: `Task not found: ${idInput}`, code: 'NOT_FOUND' };
    }
    return { kind: 'detail', task };
  }

  /** Edit task properties. */
  private edit(idInput: string, updates: UpdateTaskInput): CommandResult {
    const task = this.resolveTask(idInput);
    if (!task) {
      return { kind: 'error', error: `Task not found: ${idInput}`, code: 'NOT_FOUND' };
    }

    const updated = this.store.update(task.id, updates);
    if (!updated) {
      return { kind: 'error', error: 'Update failed', code: 'UPDATE_FAILED' };
    }

    return {
      kind: 'success',
      message: `Updated task ${updated.id}: "${updated.title}"`,
    };
  }

  /** Add tags to a task. */
  private addTags(idInput: string, newTags: string[]): CommandResult {
    const task = this.resolveTask(idInput);
    if (!task) {
      return { kind: 'error', error: `Task not found: ${idInput}`, code: 'NOT_FOUND' };
    }

    const existingTags = new Set(task.tags);
    for (const tag of newTags) {
      existingTags.add(tag);
    }

    const updated = this.store.update(task.id, { tags: Array.from(existingTags) });
    if (!updated) {
      return { kind: 'error', error: 'Update failed', code: 'UPDATE_FAILED' };
    }

    return {
      kind: 'success',
      message: `Tags updated for ${updated.id}: ${updated.tags.map(t => `#${t}`).join(' ')}`,
    };
  }

  /** Show statistics. */
  private stats(): CommandResult {
    const summary = this.store.stats();
    const lines = [
      `Total: ${summary.total}`,
      `Pending: ${summary.byStatus.pending}, In Progress: ${summary.byStatus.in_progress}`,
      `Completed: ${summary.byStatus.completed}, Cancelled: ${summary.byStatus.cancelled}`,
    ];
    return { kind: 'success', message: lines.join('\n') };
  }

  /** Show help. */
  private help(): CommandResult {
    return {
      kind: 'success',
      message: [
        'Todo CLI — Task Management',
        '',
        'Commands:',
        '  add <title> [-p priority] [-t tag1,tag2] [--due date]',
        '  list [-s status] [-p priority] [-t tag] [--search text]',
        '  done <id>        Mark task as completed',
        '  start <id>       Mark task as in-progress',
        '  cancel <id>      Cancel a task',
        '  delete <id>      Remove a task permanently',
        '  show <id>        Show task details',
        '  edit <id> [--title text] [--priority p] [--due date]',
        '  tag <id> <tags>  Add tags to a task',
        '  stats            Show task statistics',
        '  help             Show this help',
        '',
        'Priorities: critical, high, medium, low',
        'Statuses: pending, in_progress, completed, cancelled',
      ].join('\n'),
    };
  }

  // ── Private helpers ────────────────────────────────────────

  /** Resolve a task by full or partial ID. */
  private resolveTask(idInput: string): ReturnType<TaskStore['get']> {
    // Try exact match first
    const exact = this.store.get(idInput as TaskId);
    if (exact) return exact;

    // Try partial match
    return this.store.findByPartialId(idInput);
  }

  /** Parse a date string into a Date object. */
  private parseDate(input: string): Date {
    // Support: "tomorrow", "next week", "2024-03-15", "Mar 15"
    const lower = input.toLowerCase().trim();

    if (lower === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(23, 59, 59, 0);
      return d;
    }

    if (lower === 'next week') {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(23, 59, 59, 0);
      return d;
    }

    const parsed = new Date(input);
    if (isNaN(parsed.getTime())) {
      throw new RangeError(`Invalid date: ${input}`);
    }
    return parsed;
  }
}
