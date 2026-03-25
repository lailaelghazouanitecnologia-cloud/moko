import { Config } from '../core';
import { Repository } from '../store';

type TaskId = string & { readonly __brand: 'TaskId' };
type TaskStatus = 'pending' | 'completed' | 'archived';
type TaskPriority = 'low' | 'medium' | 'high';

interface Task {
  readonly id: TaskId;
  readonly title: string;
  readonly description?: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly dueDate?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class CommandExecutor {
  private readonly repository: Repository;
  private readonly config: Config;

  constructor(repository: Repository, config: Config) {
    this.repository = repository;
    this.config = config;
  }

  executeAdd(title: string, priority?: number): void {
    const taskPriority = this.validatePriority(priority ?? 1) ? 'medium' : 'low';
    const now = new Date();
    const task: Task = {
      id: `task-${Date.now()}` as TaskId,
      title,
      status: 'pending',
      priority: taskPriority,
      createdAt: now,
      updatedAt: now
    };
    this.repository.add(task);
  }

  executeRemove(id: string): void {
    this.repository.remove(id);
  }

  executeList(): void {
    const tasks = this.repository.findAll();
    tasks.forEach(task => {
      console.log(`${task.id}: ${task.title} [${task.status}] (${task.priority})`);
    });
  }

  executeFilterByStatus(status: string): void {
    if (!this.validateStatus(status)) return;
    const tasks = this.repository.findAll().filter(task => task.status === status);
    tasks.forEach(task => {
      console.log(`${task.id}: ${task.title} [${task.status}]`);
    });
  }

  executeSortByPriority(): void {
    const tasks = this.repository.findAll().sort((a, b) => {
      const priorityOrder: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    tasks.forEach(task => {
      console.log(`${task.id}: ${task.title} (${task.priority})`);
    });
  }

  executeSortByDate(): void {
    const tasks = this.repository.findAll().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    tasks.forEach(task => {
      console.log(`${task.id}: ${task.title} (${task.createdAt.toISOString()})`);
    });
  }

  executeUpdate(id: string, updates: Partial<Task>): void {
    this.repository.update(id, updates);
  }

  validatePriority(priority: number): boolean {
    return priority >= 1 && priority <= 3;
  }

  validateStatus(status: string): boolean {
    return ['pending', 'completed', 'archived'].includes(status);
  }
}
