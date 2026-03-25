/**
 * Formatter — renders tasks and results for terminal display.
 * Supports colored and plain-text output modes.
 */

import { Task, TaskStatus, Priority, CommandResult, AppConfig } from './types';

/** ANSI color codes for terminal output. */
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const;

/** Priority display configuration. */
const PRIORITY_DISPLAY: Readonly<Record<Priority, { icon: string; color: string }>> = {
  critical: { icon: '!!!', color: COLORS.red },
  high: { icon: '!! ', color: COLORS.yellow },
  medium: { icon: '!  ', color: COLORS.blue },
  low: { icon: '·  ', color: COLORS.gray },
};

/** Status display configuration. */
const STATUS_DISPLAY: Readonly<Record<TaskStatus, { icon: string; color: string }>> = {
  pending: { icon: '○', color: COLORS.gray },
  in_progress: { icon: '◐', color: COLORS.cyan },
  completed: { icon: '●', color: COLORS.green },
  cancelled: { icon: '✗', color: COLORS.red },
};

/** Formats tasks and command results for terminal display. */
export class Formatter {
  private readonly useColor: boolean;

  constructor(config: Pick<AppConfig, 'colorEnabled'>) {
    this.useColor = config.colorEnabled;
  }

  /** Format a command result for display. */
  formatResult(result: CommandResult): string {
    switch (result.kind) {
      case 'success':
        return this.colorize(COLORS.green, `✓ ${result.message}`);
      case 'error':
        return this.colorize(COLORS.red, `✗ ${result.error}`);
      case 'list':
        return this.formatTaskList(result.tasks, result.total);
      case 'detail':
        return this.formatTaskDetail(result.task);
    }
  }

  /** Format a list of tasks as a table. */
  formatTaskList(tasks: ReadonlyArray<Task>, total: number): string {
    if (tasks.length === 0) {
      return this.colorize(COLORS.dim, 'No tasks found.');
    }

    const lines: string[] = [];
    const header = this.formatHeader();
    const separator = '─'.repeat(72);

    lines.push(this.colorize(COLORS.bold, header));
    lines.push(this.colorize(COLORS.dim, separator));

    for (const task of tasks) {
      lines.push(this.formatTaskRow(task));
    }

    lines.push(this.colorize(COLORS.dim, separator));
    lines.push(this.colorize(COLORS.dim, `${total} task${total !== 1 ? 's' : ''} total`));

    return lines.join('\n');
  }

  /** Format a single task in detail view. */
  formatTaskDetail(task: Task): string {
    const lines: string[] = [];
    const status = STATUS_DISPLAY[task.status];
    const priority = PRIORITY_DISPLAY[task.priority];

    lines.push(this.colorize(COLORS.bold, `${status.icon} ${task.title}`));
    lines.push('');
    lines.push(`  ID:       ${this.colorize(COLORS.cyan, task.id)}`);
    lines.push(`  Status:   ${this.colorize(status.color, task.status)}`);
    lines.push(`  Priority: ${this.colorize(priority.color, `${priority.icon.trim()} ${task.priority}`)}`);

    if (task.description) {
      lines.push(`  Desc:     ${task.description}`);
    }

    if (task.tags.length > 0) {
      const tagStr = task.tags.map(t => this.colorize(COLORS.magenta, `#${t}`)).join(' ');
      lines.push(`  Tags:     ${tagStr}`);
    }

    lines.push(`  Created:  ${this.formatDate(task.createdAt)}`);
    lines.push(`  Updated:  ${this.formatDate(task.updatedAt)}`);

    if (task.dueDate) {
      const isOverdue = task.dueDate < new Date() && task.status !== 'completed';
      const dateStr = this.formatDate(task.dueDate);
      lines.push(`  Due:      ${isOverdue ? this.colorize(COLORS.red, dateStr + ' (OVERDUE)') : dateStr}`);
    }

    if (task.completedAt) {
      lines.push(`  Done:     ${this.formatDate(task.completedAt)}`);
    }

    return lines.join('\n');
  }

  /** Format summary statistics. */
  formatStats(stats: {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<Priority, number>;
  }): string {
    const lines: string[] = [];

    lines.push(this.colorize(COLORS.bold, '📊 Task Statistics'));
    lines.push('');
    lines.push(`  Total: ${stats.total}`);
    lines.push('');
    lines.push('  By Status:');
    for (const [status, count] of Object.entries(stats.byStatus)) {
      const display = STATUS_DISPLAY[status as TaskStatus];
      lines.push(`    ${display.icon} ${status}: ${count}`);
    }
    lines.push('');
    lines.push('  By Priority:');
    for (const [priority, count] of Object.entries(stats.byPriority)) {
      const display = PRIORITY_DISPLAY[priority as Priority];
      lines.push(`    ${display.icon.trim()} ${priority}: ${count}`);
    }

    return lines.join('\n');
  }

  // ── Private helpers ────────────────────────────────────────

  private formatHeader(): string {
    return `${'ID'.padEnd(10)} ${'PRI'.padEnd(4)} ${'STATUS'.padEnd(12)} TITLE`;
  }

  private formatTaskRow(task: Task): string {
    const status = STATUS_DISPLAY[task.status];
    const priority = PRIORITY_DISPLAY[task.priority];

    const id = this.colorize(COLORS.cyan, task.id.padEnd(10));
    const pri = this.colorize(priority.color, priority.icon.trim().padEnd(4));
    const stat = this.colorize(status.color, `${status.icon} ${task.status}`.padEnd(12));
    const title = task.status === 'completed'
      ? this.colorize(COLORS.dim, task.title)
      : task.title;

    const tags = task.tags.length > 0
      ? ' ' + task.tags.map(t => this.colorize(COLORS.magenta, `#${t}`)).join(' ')
      : '';

    const due = task.dueDate && task.status !== 'completed'
      ? ` ${this.colorize(COLORS.dim, `[due: ${this.formatShortDate(task.dueDate)}]`)}`
      : '';

    return `${id} ${pri} ${stat} ${title}${tags}${due}`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatShortDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private colorize(color: string, text: string): string {
    if (!this.useColor) return text;
    return `${color}${text}${COLORS.reset}`;
  }
}
