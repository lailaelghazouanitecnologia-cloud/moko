/**
 * Core types for the Todo CLI application.
 * Uses discriminated unions for task state and priority.
 */

/** Priority levels with semantic ordering. */
export type Priority = 'critical' | 'high' | 'medium' | 'low';

/** Task lifecycle states. */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/** Unique identifier for tasks. */
export type TaskId = string & { readonly __brand: 'TaskId' };

/** Sorting criteria for task lists. */
export type SortField = 'priority' | 'created' | 'due' | 'status';
export type SortDirection = 'asc' | 'desc';

/** Filter specification for querying tasks (mutable for CLI building). */
export interface TaskFilter {
  status?: TaskStatus;
  priority?: Priority;
  tag?: string;
  search?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

/** Sort specification. */
export interface SortSpec {
  readonly field: SortField;
  readonly direction: SortDirection;
}

/** Core task data. */
export interface Task {
  readonly id: TaskId;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly priority: Priority;
  readonly tags: ReadonlyArray<string>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly dueDate: Date | null;
  readonly completedAt: Date | null;
}

/** Input for creating a new task. */
export interface CreateTaskInput {
  readonly title: string;
  readonly description?: string;
  readonly priority?: Priority;
  readonly tags?: ReadonlyArray<string>;
  readonly dueDate?: Date;
}

/** Input for updating an existing task. */
export interface UpdateTaskInput {
  readonly title?: string;
  readonly description?: string;
  readonly status?: TaskStatus;
  readonly priority?: Priority;
  readonly tags?: ReadonlyArray<string>;
  readonly dueDate?: Date | null;
}

/** Result of a command execution. */
export type CommandResult =
  | { readonly kind: 'success'; readonly message: string }
  | { readonly kind: 'error'; readonly error: string; readonly code: string }
  | { readonly kind: 'list'; readonly tasks: ReadonlyArray<Task>; readonly total: number }
  | { readonly kind: 'detail'; readonly task: Task };

/** Application configuration. */
export interface AppConfig {
  readonly dataDir: string;
  readonly defaultPriority: Priority;
  readonly defaultSort: SortSpec;
  readonly colorEnabled: boolean;
  readonly dateFormat: string;
}

/** Priority weight for sorting. */
export const PRIORITY_WEIGHT: Readonly<Record<Priority, number>> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
