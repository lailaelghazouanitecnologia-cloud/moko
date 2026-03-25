import { EventEmitter } from 'events';

interface Task {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  data: any;
  retryCount: number;
  maxRetries: number;
}

interface SchedulerConfig {
  maxConcurrent: number;
  retryDelay: number;
  maxRetries: number;
  checkInterval: number;
}

interface TaskFilter {
  status?: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
  type?: string;
  priority?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

interface SystemStatus {
  isRunning: boolean;
  queueLength: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  uptime: number;
}

/**
 * Orchestrates and schedules autonomous research tasks.
 * Extends EventEmitter to emit lifecycle events.
 */
export class TaskScheduler extends EventEmitter {
  private queue: Task[] = [];
  private active: Map<string, Task> = new Map();
  private config: SchedulerConfig;
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private startTime: number = 0;

  constructor(config?: Partial<SchedulerConfig>) {
    super();
    this.config = {
      maxConcurrent: 5,
      retryDelay: 5000,
      maxRetries: 3,
      checkInterval: 1000,
      ...config
    };
    this.validateConfig(this.config);
  }

  /**
   * Schedules a new task for execution.
   * @param task - The task to schedule.
   * @returns The unique identifier of the scheduled task.
   * @throws {Error} If task validation fails.
   */
  schedule(task: Task): string {
    this.validateTask(task);
    if (!task.id) {
      task.id = this.generateTaskId();
    }
    task.status = 'queued';
    task.createdAt = new Date();
    task.retryCount = 0;
    task.maxRetries = task.maxRetries ?? this.config.maxRetries;

    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);

    this.emit('task:scheduled', task);
    return task.id;
  }

  /**
   * Cancels a queued task.
   * @param id - The ID of the task to cancel.
   * @returns True if the task was found and removed, false otherwise.
   */
  cancel(id: string): boolean {
    if (typeof id !== 'string' || !id.trim()) {
      this.emit('error', new Error('Invalid task ID provided to cancel'));
      return false;
    }
    const queueIndex = this.queue.findIndex(t => t.id === id);
    if (queueIndex !== -1) {
      const task = this.queue.splice(queueIndex, 1)[0];
      this.emit('task:cancelled', task);
      return true;
    }
    return false;
  }

  /**
   * Pauses an active task.
   * @param id - The ID of the task to pause.
   */
  pause(id: string): void {
    if (typeof id !== 'string' || !id.trim()) {
      this.emit('error', new Error('Invalid task ID provided to pause'));
      return;
    }
    const task = this.active.get(id);
    if (task && task.status === 'running') {
      task.status = 'paused';
      this.emit('task:paused', task);
    }
  }

  /**
   * Resumes a paused task.
   * @param id - The ID of the task to resume.
   */
  resume(id: string): void {
    if (typeof id !== 'string' || !id.trim()) {
      this.emit('error', new Error('Invalid task ID provided to resume'));
      return;
    }
    const task = this.active.get(id);
    if (task && task.status === 'paused') {
      task.status = 'running';
      this.emit('task:resumed', task);
    }
  }

  /**
   * Lists tasks filtered by the provided criteria.
   * @param filter - Optional filter criteria.
   * @returns Array of tasks matching the filter.
   */
  list(filter?: TaskFilter): Task[] {
    let tasks: Task[] = [];

    if (!filter) {
      tasks = [...this.queue, ...Array.from(this.active.values())];
    } else {
      const allTasks = [...this.queue, ...Array.from(this.active.values())];

      tasks = allTasks.filter(task => {
        if (filter.status && task.status !== filter.status) return false;
        if (filter.type && task.type !== filter.type) return false;
        if (filter.priority !== undefined && task.priority !== filter.priority) return false;
        if (filter.createdAfter && task.createdAt < filter.createdAfter) return false;
        if (filter.createdBefore && task.createdAt > filter.createdBefore) return false;
        return true;
      });
    }

    return tasks;
  }

  /**
   * Starts the scheduler loop.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.checkInterval = setInterval(() => this.processQueue(), this.config.checkInterval);

    this.emit('scheduler:started');
  }

  /**
   * Gracefully stops the scheduler.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    await this.waitForActiveTasks();

    this.emit('scheduler:stopped');
  }

  /**
   * Returns the current system status.
   * @returns System status snapshot.
   */
  status(): SystemStatus {
    const completed = Array.from(this.active.values()).filter(t => t.status === 'completed').length;
    const failed = Array.from(this.active).filter(([, task]) => task.status === 'failed').length;

    return {
      isRunning: this.isRunning,
      queueLength: this.queue.length,
      activeCount: this.active.size,
      completedCount: completed,
      failedCount: failed,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Retries a failed task.
   * @param id - The ID of the failed task.
   * @returns True if retry was initiated, false otherwise.
   */
  retry(id: string): boolean {
    if (typeof id !== 'string' || !id.trim()) {
      this.emit('error', new Error('Invalid task ID provided to retry'));
      return false;
    }
    const task = this.active.get(id);
    if (task && task.status === 'failed' && task.retryCount < task.maxRetries) {
      task.status = 'queued';
      task.retryCount++;
      this.active.delete(id);
      this.queue.push(task);
      this.queue.sort((a, b) => b.priority - a.priority);

      this.emit('task:retried', task);
      return true;
    }
    return false;
  }

  /* ------------------------------------------------------------------ */
  /* -------------------------- PRIVATE METHODS ----------------------- */
  /* ------------------------------------------------------------------ */

  /**
   * Validates the scheduler configuration.
   */
  private validateConfig(config: SchedulerConfig): void {
    if (
      config.maxConcurrent <= 0 ||
      config.retryDelay < 0 ||
      config.maxRetries < 0 ||
      config.checkInterval <= 0
    ) {
      throw new Error('Invalid scheduler configuration');
    }
  }

  /**
   * Validates a task before scheduling.
   */
  private validateTask(task: Task): void {
    if (!task || typeof task !== 'object') {
      throw new Error('Task must be a valid object');
    }
    if (typeof task.type !== 'string' || !task.type.trim()) {
      throw new Error('Task type must be a non-empty string');
    }
    if (typeof task.priority !== 'number' || task.priority < 0) {
      throw new Error('Task priority must be a non-negative number');
    }
  }

  /**
   * Generates a unique task ID.
   */
  private generateTaskId(): string {
    return 'task_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }

  /**
   * Processes the queue to move tasks to active.
   */
  private processQueue(): void {
    if (!this.isRunning || this.queue.length === 0) {
      return;
    }

    while (this.active.size < this.config.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.active.set(task.id, task);
      task.status = 'running';
      task.startedAt = new Date();

      this.emit('task:started', task);
      this.executeTask(task);
    }
  }

  /**
   * Executes a single task.
   */
  private async executeTask(task: Task): Promise<void> {
    try {
      this.emit('task:execute', task);

      const result = await this.performTask(task);

      if (task.status === 'running') {
        task.status = 'completed';
        task.completedAt = new Date();
        this.active.delete(task.id);
        this.emit('task:completed', task, result);
      }
    } catch (error) {
      task.status = 'failed';
      task.completedAt = new Date();
      this.active.delete(task.id);
      this.emit('task:failed', task, error);
    }
  }

  /**
   * Performs the actual task work (stub for override).
   */
  private performTask(task: Task): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({ taskId: task.id, data: task.data });
      }, 100);
    });
  }

  /**
   * Waits for all active tasks to finish before shutdown.
   */
  private async waitForActiveTasks(): Promise<void> {
    while (this.active.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
