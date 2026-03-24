import { Task } from './task';
import { TaskStatus } from './task-status';
import { TaskflowException } from '../core/taskflow-exception';

/**
 * Filters for querying tasks.
 */
export interface TaskFilters {
  status?: TaskStatus;
  assigneeId?: string;
  projectId?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  createdBefore?: Date;
  createdAfter?: Date;
  /**
   * Maximum number of results to return.
   * @default all matching tasks
   */
  limit?: number;
  /**
   * Number of results to skip (for pagination).
   * @default 0
   */
  offset?: number;
}

/**
 * Persistence interface for tasks.
 */
export interface TaskRepository {
  /**
   * Create or update a task.
   * @param task - The task to save.
   * @returns The saved task.
   * @throws {TaskflowException} TASK_DELETED if the task was previously deleted.
   */
  save(task: Task): Promise<Task>;

  /**
   * Find a task by its ID.
   * @param id - The task ID.
   * @returns The task or null if not found or deleted.
   */
  findById(id: string): Promise<Task | null>;

  /**
   * Find all tasks with optional filters and pagination.
   * @param filters - Optional filters and pagination options.
   * @returns Array of tasks matching the filters.
   */
  findAll(filters?: TaskFilters): Promise<Task[]>;

  /**
   * Soft-delete a task.
   * @param id - The task ID.
   * @throws {TaskflowException} TASK_NOT_FOUND if the task does not exist.
   */
  delete(id: string): Promise<void>;

  /**
   * Find tasks by status.
   * @param status - The status to filter by.
   * @returns Array of tasks with the given status.
   */
  findByStatus(status: TaskStatus): Promise<Task[]>;

  /**
   * Find tasks assigned to a user.
   * @param userId - The assignee's user ID.
   * @returns Array of tasks assigned to the user.
   */
  findByAssignee(userId: string): Promise<Task[]>;
}

/**
 * In-memory implementation of TaskRepository for development/testing.
 */
export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks: Map<string, Task> = new Map();
  private readonly deletedTasks: Set<string> = new Set();

  /**
   * Create or update a task.
   * @param task - The task to save.
   * @returns The saved task.
   * @throws {TaskflowException} TASK_DELETED if the task was previously deleted.
   */
  async save(task: Task): Promise<Task> {
    this.validateTask(task);
    if (this.deletedTasks.has(task.id)) {
      throw new TaskflowException('TASK_DELETED', 'TASK_DELETED', { taskId: task.id });
    }
    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * Find a task by its ID.
   * @param id - The task ID.
   * @returns The task or null if not found or deleted.
   */
  async findById(id: string): Promise<Task | null> {
    this.validateId(id);
    if (this.deletedTasks.has(id)) {
      return null;
    }
    return this.tasks.get(id) ?? null;
  }

  /**
   * Find all tasks with optional filters and pagination.
   * @param filters - Optional filters and pagination options.
   * @returns Array of tasks matching the filters.
   */
  async findAll(filters?: TaskFilters): Promise<Task[]> {
    this.validateFilters(filters);
    let results = Array.from(this.tasks.values()).filter(
      (task) => !this.deletedTasks.has(task.id)
    );

    if (filters?.status !== undefined) {
      results = results.filter((task) => task.status === filters.status);
    }

    if (filters?.assigneeId !== undefined) {
      results = results.filter((task) => task.assigneeId === filters.assigneeId);
    }

    if (filters?.projectId !== undefined) {
      results = results.filter(
        (task) => (task as any).projectId === filters.projectId
      );
    }

    if (filters?.dueBefore !== undefined) {
      results = results.filter(
        (task) => task.dueDate !== null && task.dueDate <= filters.dueBefore!
      );
    }

    if (filters?.dueAfter !== undefined) {
      results = results.filter(
        (task) => task.dueDate !== null && task.dueDate >= filters.dueAfter!
      );
    }

    if (filters?.createdBefore !== undefined) {
      results = results.filter((task) => task.createdAt <= filters.createdBefore!);
    }

    if (filters?.createdAfter !== undefined) {
      results = results.filter((task) => task.createdAt >= filters.createdAfter!);
    }

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? results.length;

    return results.slice(offset, offset + limit);
  }

  /**
   * Soft-delete a task.
   * @param id - The task ID.
   * @throws {TaskflowException} TASK_NOT_FOUND if the task does not exist.
   */
  async delete(id: string): Promise<void> {
    this.validateId(id);
    if (!this.tasks.has(id)) {
      throw new TaskflowException('TASK_NOT_FOUND', 'TASK_NOT_FOUND', { taskId: id });
    }
    this.deletedTasks.add(id);
  }

  /**
   * Find tasks by status.
   * @param status - The status to filter by.
   * @returns Array of tasks with the given status.
   */
  async findByStatus(status: TaskStatus): Promise<Task[]> {
    this.validateStatus(status);
    return Array.from(this.tasks.values()).filter(
      (task) => !this.deletedTasks.has(task.id) && task.status === status
    );
  }

  /**
   * Find tasks assigned to a user.
   * @param userId - The assignee's user ID.
   * @returns Array of tasks assigned to the user.
   */
  async findByAssignee(userId: string): Promise<Task[]> {
    this.validateId(userId);
    return Array.from(this.tasks.values()).filter(
      (task) => !this.deletedTasks.has(task.id) && task.assigneeId === userId
    );
  }

  /* ------------------------------------------------------------------ */
  /* Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  private validateTask(task: Task): void {
    if (!task || typeof task !== 'object') {
      throw new TaskflowException('INVALID_TASK', 'INVALID_TASK');
    }
    if (!task.id || typeof task.id !== 'string' || !task.id.trim()) {
      throw new TaskflowException('INVALID_TASK_ID', 'INVALID_TASK_ID');
    }
  }

  private validateId(id: string): void {
    if (typeof id !== 'string' || !id.trim()) {
      throw new TaskflowException('INVALID_ID', 'INVALID_ID');
    }
  }

  private validateStatus(status: TaskStatus): void {
    const validStatuses: TaskStatus[] = [
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.DONE,
      TaskStatus.CANCELLED,
    ];
    if (!validStatuses.includes(status)) {
      throw new TaskflowException('INVALID_STATUS', 'INVALID_STATUS', { status });
    }
  }

  private validateFilters(filters?: TaskFilters): void {
    if (!filters) return;
    const {
      limit,
      offset,
      dueBefore,
      dueAfter,
      createdBefore,
      createdAfter,
    } = filters;

    if (limit !== undefined && (typeof limit !== 'number' || limit < 0)) {
      throw new TaskflowException('INVALID_LIMIT', 'INVALID_LIMIT');
    }
    if (offset !== undefined && (typeof offset !== 'number' || offset < 0)) {
      throw new TaskflowException('INVALID_OFFSET', 'INVALID_OFFSET');
    }
    if (
      dueBefore !== undefined &&
      !(dueBefore instanceof Date) &&
      !this.isValidDate(dueBefore)
    ) {
      throw new TaskflowException('INVALID_DATE', 'INVALID_DATE', { field: 'dueBefore' });
    }
    if (
      dueAfter !== undefined &&
      !(dueAfter instanceof Date) &&
      !this.isValidDate(dueAfter)
    ) {
      throw new TaskflowException('INVALID_DATE', 'INVALID_DATE', { field: 'dueAfter' });
    }
    if (
      createdBefore !== undefined &&
      !(createdBefore instanceof Date) &&
      !this.isValidDate(createdBefore)
    ) {
      throw new TaskflowException('INVALID_DATE', 'INVALID_DATE', { field: 'createdBefore' });
    }
    if (
      createdAfter !== undefined &&
      !(createdAfter instanceof Date) &&
      !this.isValidDate(createdAfter)
    ) {
      throw new TaskflowException('INVALID_DATE', 'INVALID_DATE', { field: 'createdAfter' });
    }
  }

  private isValidDate(value: unknown): boolean {
    return value instanceof Date && !isNaN(value.getTime());
  }
}
