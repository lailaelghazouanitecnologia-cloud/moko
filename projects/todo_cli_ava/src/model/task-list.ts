import { Task } from './task';

/**
 * Collection of tasks
 */
export class TaskList {
  public readonly id: string;
  public readonly name: string;
  private readonly tasks: Task[];

  constructor(id: string, name: string) {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new TypeError('id must be a non-empty string');
    }
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('name must be a non-empty string');
    }
    this.id = id;
    this.name = name;
    this.tasks = [];
  }

  /**
   * Append task
   * @param task - The task to add
   */
  public addTask(task: Task): void {
    if (!task || typeof task.id !== 'string') {
      throw new TypeError('task must be a valid Task instance');
    }
    this.tasks.push(task);
  }

  /**
   * Delete by id
   * @param taskId - The id of the task to remove
   * @returns true if removed, false if not found
   */
  public removeTask(taskId: string): boolean {
    if (typeof taskId !== 'string' || taskId.trim() === '') {
      throw new TypeError('taskId must be a non-empty string');
    }
    const index = this.tasks.findIndex(task => task.id === taskId);
    if (index === -1) {
      return false;
    }
    this.tasks.splice(index, 1);
    return true;
  }

  /**
   * Find by id
   * @param taskId - The id of the task to retrieve
   * @returns The task or undefined if not found
   */
  public getTask(taskId: string): Task | undefined {
    if (typeof taskId !== 'string' || taskId.trim() === '') {
      throw new TypeError('taskId must be a non-empty string');
    }
    return this.tasks.find(task => task.id === taskId);
  }

  /**
   * Return all
   * @returns A shallow copy of all tasks
   */
  public getAllTasks(): Task[] {
    return [...this.tasks];
  }

  /**
   * Filter completed
   * @returns All completed tasks
   */
  public getCompleted(): Task[] {
    return this.tasks.filter(task => task.completed);
  }

  /**
   * Filter pending
   * @returns All pending tasks
   */
  public getPending(): Task[] {
    return this.tasks.filter(task => !task.completed);
  }

  /**
   * Remove completed
   * @returns The number of tasks removed
   */
  public clearCompleted(): number {
    const initialLength = this.tasks.length;
    let i = 0;
    while (i < this.tasks.length) {
      if (this.tasks[i].completed) {
        this.tasks.splice(i, 1);
      } else {
        i++;
      }
    }
    return initialLength - this.tasks.length;
  }

  /**
   * Merge updates
   * @param taskId - The id of the task to update
   * @param updates - Partial task properties to merge
   * @returns true if updated, false if not found
   */
  public updateTask(taskId: string, updates: Partial<Task>): boolean {
    if (typeof taskId !== 'string' || taskId.trim() === '') {
      throw new TypeError('taskId must be a non-empty string');
    }
    if (!updates || typeof updates !== 'object') {
      throw new TypeError('updates must be a valid partial Task object');
    }
    const task = this.getTask(taskId);
    if (!task) {
      return false;
    }
    Object.assign(task, updates);
    return true;
  }
}
