import { Task, TaskStatus } from './task';
import { TaskRepository } from './task-repository';
import { TaskflowException } from '../core/taskflow-exception';

export interface CreateTaskDto {
  title: string;
  description?: string;
  dueDate?: Date;
  assigneeId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  dueDate?: Date | null;
  assigneeId?: string | null;
}

export interface TaskFilters {
  status?: TaskStatus;
  assigneeId?: string;
  overdue?: boolean;
}

/**
 * Orchestrates task-related business logic.
 */
export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  /**
   * Creates and persists a new task.
   * @param props Task creation properties.
   * @throws {TaskflowException} When validation fails or persistence errors occur.
   */
  async createTask(props: CreateTaskDto): Promise<Task> {
    this.validateCreateTaskDto(props);

    const task = Task.create({
      title: props.title.trim(),
      description: props.description?.trim() ?? '',
      status: TaskStatus.TODO,
      createdAt: new Date(),
      updatedAt: new Date(),
      assigneeId: props.assigneeId ?? undefined,
      dueDate: props.dueDate ?? undefined,
    });

    try {
      return await this.repository.save(task);
    } catch (err) {
      throw new TaskflowException('Failed to save task', 'PERSISTENCE_ERROR', { message: 'Failed to save task', cause: err });
    }
  }

  /**
   * Updates an existing task with the provided changes.
   * @param id Task identifier.
   * @param updates Partial updates to apply.
   * @throws {TaskflowException} When task not found or validation fails.
   */
  async updateTask(id: string, updates: UpdateTaskDto): Promise<Task> {
    if (!this.isValidId(id)) {
      throw new TaskflowException('Invalid task id', 'INVALID_INPUT', { id: 'Invalid task id' });
    }

    const task = await this.repository.findById(id);
    if (!task) {
      throw new TaskflowException('Task not found', 'NOT_FOUND', { id: 'Task not found' });
    }

    let updatedTask = task;

    if (updates.title !== undefined) {
      if (updates.title.trim().length === 0) {
        throw new TaskflowException('Title cannot be empty', 'INVALID_INPUT', { title: 'Title cannot be empty' });
      }
      updatedTask = updatedTask.updateTitle(updates.title.trim());
    }

    if (updates.description !== undefined) {
      updatedTask = updatedTask.updateDescription(updates.description.trim());
    }

    if (updates.dueDate !== undefined) {
      updatedTask = updatedTask.updateDueDate(updates.dueDate);
    }

    if (updates.assigneeId !== undefined) {
      updatedTask = updates.assigneeId ? updatedTask.assignTo(updates.assigneeId) : updatedTask.unassign();
    }

    try {
      return await this.repository.save(updatedTask);
    } catch (err) {
      throw new TaskflowException('Failed to update task', 'PERSISTENCE_ERROR', { message: 'Failed to update task', cause: err });
    }
  }

  /**
   * Changes the status of a task after validating the transition.
   * @param id Task identifier.
   * @param status Target status.
   * @throws {TaskflowException} When task not found or invalid transition.
   */
  async changeStatus(id: string, status: TaskStatus): Promise<Task> {
    if (!this.isValidId(id)) {
      throw new TaskflowException('Invalid task id', 'INVALID_INPUT', { id: 'Invalid task id' });
    }

    const task = await this.repository.findById(id);
    if (!task) {
      throw new TaskflowException('Task not found', 'NOT_FOUND', { id: 'Task not found' });
    }

    if (!task.canTransitionTo(status)) {
      throw new TaskflowException(`Cannot transition from ${task.status} to ${status}`, 'INVALID_TRANSITION', {
        from: task.status,
        to: status,
        message: `Cannot transition from ${task.status} to ${status}`,
      });
    }

    const updatedTask = task.updateStatus(status);

    try {
      return await this.repository.save(updatedTask);
    } catch (err) {
      throw new TaskflowException('Failed to change status', 'PERSISTENCE_ERROR', { message: 'Failed to change status', cause: err });
    }
  }

  /**
   * Assigns a task to a user.
   * @param taskId Task identifier.
   * @param userId User identifier.
   * @throws {TaskflowException} When task not found or persistence fails.
   */
  async assignTask(taskId: string, userId: string): Promise<Task> {
    if (!this.isValidId(taskId)) {
      throw new TaskflowException('Invalid task id', 'INVALID_INPUT', { taskId: 'Invalid task id' });
    }
    if (!this.isValidId(userId)) {
      throw new TaskflowException('Invalid user id', 'INVALID_INPUT', { userId: 'Invalid user id' });
    }

    const task = await this.repository.findById(taskId);
    if (!task) {
      throw new TaskflowException('Task not found', 'NOT_FOUND', { taskId: 'Task not found' });
    }

    const updatedTask = task.assignTo(userId);

    try {
      return await this.repository.save(updatedTask);
    } catch (err) {
      throw new TaskflowException('Failed to assign task', 'PERSISTENCE_ERROR', { message: 'Failed to assign task', cause: err });
    }
  }

  /**
   * Retrieves a single task by id.
   * @param id Task identifier.
   * @throws {TaskflowException} When task not found.
   */
  async getTask(id: string): Promise<Task> {
    if (!this.isValidId(id)) {
      throw new TaskflowException('Invalid task id', 'INVALID_INPUT', { id: 'Invalid task id' });
    }

    const task = await this.repository.findById(id);
    if (!task) {
      throw new TaskflowException('Task not found', 'NOT_FOUND', { id: 'Task not found' });
    }
    return task;
  }

  /**
   * Lists tasks applying optional filters.
   * @param filters Filtering criteria.
   * @returns Filtered list of tasks.
   */
  async listTasks(filters?: TaskFilters): Promise<Task[]> {
    let tasks: Task[];

    try {
      tasks = await this.repository.findAll(filters);
    } catch (err) {
      throw new TaskflowException('Failed to list tasks', 'PERSISTENCE_ERROR', { message: 'Failed to list tasks', cause: err });
    }

    if (filters?.overdue) {
      tasks = tasks.filter((task) => task.isOverdue());
    }

    return tasks;
  }

  /**
   * Deletes a task and performs cascade cleanup.
   * @param id Task identifier.
   * @throws {TaskflowException} When task not found or deletion fails.
   */
  async deleteTask(id: string): Promise<void> {
    if (!this.isValidId(id)) {
      throw new TaskflowException('Invalid task id', 'INVALID_INPUT', { id: 'Invalid task id' });
    }

    const task = await this.repository.findById(id);
    if (!task) {
      throw new TaskflowException('Task not found', 'NOT_FOUND', { id: 'Task not found' });
    }

    try {
      await this.repository.delete(id);
    } catch (err) {
      throw new TaskflowException('Failed to delete task', 'PERSISTENCE_ERROR', { message: 'Failed to delete task', cause: err });
    }
  }

  /**
   * Retrieves all overdue tasks.
   * @returns List of overdue tasks.
   */
  async getOverdueTasks(): Promise<Task[]> {
    let tasks: Task[];

    try {
      tasks = await this.repository.findAll();
    } catch (err) {
      throw new TaskflowException('Failed to fetch tasks', 'PERSISTENCE_ERROR', { message: 'Failed to fetch tasks', cause: err });
    }

    return tasks.filter((task) => task.isOverdue());
  }

  /**
   * Retrieves tasks assigned to a specific user.
   * @param userId User identifier.
   * @returns List of assigned tasks.
   * @throws {TaskflowException} When invalid user id or persistence fails.
   */
  async getUserTasks(userId: string): Promise<Task[]> {
    if (!this.isValidId(userId)) {
      throw new TaskflowException('Invalid user id', 'INVALID_INPUT', { userId: 'Invalid user id' });
    }

    try {
      return await this.repository.findByAssignee(userId);
    } catch (err) {
      throw new TaskflowException('Failed to fetch user tasks', 'PERSISTENCE_ERROR', { message: 'Failed to fetch user tasks', cause: err });
    }
  }

  /* ------------------------------------------------------------------ */
  /* -------------------------- PRIVATE HELPERS ------------------------ */
  /* ------------------------------------------------------------------ */

  private validateCreateTaskDto(props: CreateTaskDto): void {
    if (!props.title || typeof props.title !== 'string' || props.title.trim().length === 0) {
      throw new TaskflowException('Title is required and must be non-empty string', 'INVALID_INPUT', { title: 'Title is required and must be non-empty string' });
    }

    if (props.description !== undefined && typeof props.description !== 'string') {
      throw new TaskflowException('Description must be a string', 'INVALID_INPUT', { description: 'Description must be a string' });
    }

    if (props.dueDate !== undefined && !(props.dueDate instanceof Date)) {
      throw new TaskflowException('Due date must be a Date object', 'INVALID_INPUT', { dueDate: 'Due date must be a Date object' });
    }

    if (props.assigneeId !== undefined && !this.isValidId(props.assigneeId)) {
      throw new TaskflowException('Invalid assignee id', 'INVALID_INPUT', { assigneeId: 'Invalid assignee id' });
    }
  }

  private isValidId(id: string): boolean {
    return typeof id === 'string' && id.trim().length > 0;
  }
}
