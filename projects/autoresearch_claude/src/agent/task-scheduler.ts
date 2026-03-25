/**
 * TaskScheduler — schedules and manages research tasks with priority
 * ordering and dependency resolution.  Tasks are held in a binary-heap
 * priority queue and executed up to `maxConcurrent` at a time.
 */

// ── Types ────────────────────────────────────────────────────────────

export type TaskStatus =
  | "pending"
  | "ready"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Task<T = unknown> {
  id: string;
  type: string;
  priority: number; // higher number = higher priority
  dependencies: string[];
  status: TaskStatus;
  result?: T;
  error?: Error;
}

export type TaskCompleteCallback<T = unknown> = (task: Task<T>) => void;
export type TaskExecutor<T = unknown> = (task: Task<T>) => Promise<T>;

// ── Priority queue (max-heap) ────────────────────────────────────────

class PriorityQueue<T extends { priority: number }> {
  private heap: T[] = [];

  get size(): number {
    return this.heap.length;
  }

  push(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  remove(predicate: (item: T) => boolean): T | undefined {
    const idx = this.heap.findIndex(predicate);
    if (idx === -1) return undefined;
    const removed = this.heap[idx];
    const last = this.heap.pop()!;
    if (idx < this.heap.length) {
      this.heap[idx] = last;
      this.bubbleUp(idx);
      this.sinkDown(idx);
    }
    return removed;
  }

  toArray(): T[] {
    return [...this.heap];
  }

  clear(): void {
    this.heap = [];
  }

  // ── heap helpers ────────────────────────────────────────────────

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[i].priority <= this.heap[parent].priority) break;
      [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
      i = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let largest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left].priority > this.heap[largest].priority) {
        largest = left;
      }
      if (right < n && this.heap[right].priority > this.heap[largest].priority) {
        largest = right;
      }
      if (largest === i) break;
      [this.heap[i], this.heap[largest]] = [this.heap[largest], this.heap[i]];
      i = largest;
    }
  }
}

// ── TaskScheduler ────────────────────────────────────────────────────

export class TaskScheduler<T = unknown> {
  public readonly queue: PriorityQueue<Task<T>>;
  public readonly running: Map<string, Task<T>> = new Map();
  public readonly completed: Task<T>[] = [];
  public maxConcurrent: number;

  private allTasks: Map<string, Task<T>> = new Map();
  private onCompleteCallback: TaskCompleteCallback<T> | null = null;
  private executor: TaskExecutor<T> | null = null;

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.queue = new PriorityQueue<Task<T>>();
  }

  /**
   * Register the function that actually executes a task.
   */
  setExecutor(fn: TaskExecutor<T>): void {
    this.executor = fn;
  }

  /**
   * Register a callback invoked every time a task finishes (success or fail).
   */
  onComplete(cb: TaskCompleteCallback<T>): void {
    this.onCompleteCallback = cb;
  }

  /**
   * Add a task to the scheduler.
   */
  enqueue(task: Task<T>): void {
    if (this.allTasks.has(task.id)) {
      throw new Error(`Task "${task.id}" already exists in the scheduler`);
    }
    task.status = "pending";
    this.allTasks.set(task.id, task);
    this.queue.push(task);
  }

  /**
   * Return the highest-priority task whose dependencies are all completed.
   * Returns undefined when nothing is ready.
   */
  dequeue(): Task<T> | undefined {
    // Build a set of completed ids for fast lookup
    const completedIds = new Set(
      this.completed.map((t) => t.id)
    );

    // Scan the queue for the highest-priority task with all deps satisfied
    const candidates = this.queue.toArray();
    // Sort descending by priority so the first match is best
    candidates.sort((a, b) => b.priority - a.priority);

    for (const candidate of candidates) {
      const depsReady = candidate.dependencies.every((depId) =>
        completedIds.has(depId)
      );
      if (depsReady) {
        // Remove it from the queue
        this.queue.remove((t) => t.id === candidate.id);
        candidate.status = "ready";
        return candidate;
      }
    }

    return undefined;
  }

  /**
   * Execute a single task using the registered executor.
   */
  async run(task: Task<T>): Promise<Task<T>> {
    if (!this.executor) {
      throw new Error("No executor registered — call setExecutor() first");
    }

    task.status = "running";
    this.running.set(task.id, task);

    try {
      task.result = await this.executor(task);
      task.status = "completed";
    } catch (err) {
      task.error = err instanceof Error ? err : new Error(String(err));
      task.status = "failed";
    } finally {
      this.running.delete(task.id);
      this.completed.push(task);
      this.onCompleteCallback?.(task);
    }

    return task;
  }

  /**
   * Process the entire queue, respecting concurrency limits and
   * dependency ordering.  Resolves when all tasks are finished or
   * no further progress can be made.
   */
  async runAll(): Promise<Task<T>[]> {
    if (!this.executor) {
      throw new Error("No executor registered — call setExecutor() first");
    }

    const inFlight: Map<string, Promise<Task<T>>> = new Map();

    const scheduleNext = (): void => {
      while (inFlight.size < this.maxConcurrent) {
        const task = this.dequeue();
        if (!task) break;

        const promise = this.run(task).then((finished) => {
          inFlight.delete(finished.id);
          return finished;
        });
        inFlight.set(task.id, promise);
      }
    };

    scheduleNext();

    while (inFlight.size > 0) {
      // Wait for at least one to finish, then try to schedule more
      await Promise.race(inFlight.values());
      scheduleNext();
    }

    // Check for tasks that could never run (unmet dependencies)
    const remaining = this.queue.toArray();
    for (const stuck of remaining) {
      stuck.status = "failed";
      stuck.error = new Error(
        `Task "${stuck.id}" has unresolvable dependencies`
      );
      this.queue.remove((t) => t.id === stuck.id);
      this.completed.push(stuck);
      this.onCompleteCallback?.(stuck);
    }

    return [...this.completed];
  }

  /**
   * Cancel a pending or running task.
   */
  cancel(taskId: string): boolean {
    const task = this.allTasks.get(taskId);
    if (!task) return false;

    if (task.status === "pending" || task.status === "ready") {
      this.queue.remove((t) => t.id === taskId);
      task.status = "cancelled";
      this.completed.push(task);
      this.onCompleteCallback?.(task);
      return true;
    }

    // Running tasks can be marked cancelled but we can't abort the promise.
    if (task.status === "running") {
      task.status = "cancelled";
      this.running.delete(taskId);
      this.completed.push(task);
      this.onCompleteCallback?.(task);
      return true;
    }

    return false;
  }

  /**
   * Snapshot of the scheduler's current state.
   */
  getStatus(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  } {
    let pending = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;
    let cancelled = 0;

    for (const task of this.allTasks.values()) {
      switch (task.status) {
        case "pending":
        case "ready":
          pending++;
          break;
        case "running":
          running++;
          break;
        case "completed":
          completed++;
          break;
        case "failed":
          failed++;
          break;
        case "cancelled":
          cancelled++;
          break;
      }
    }

    return {
      pending,
      running,
      completed,
      failed,
      cancelled,
      total: this.allTasks.size,
    };
  }

  /**
   * Reset the scheduler, clearing all queues and history.
   */
  reset(): void {
    this.queue.clear();
    this.running.clear();
    this.completed.length = 0;
    this.allTasks.clear();
  }
}
