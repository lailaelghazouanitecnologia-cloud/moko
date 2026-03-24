import { Experiment } from './experiment';

interface PriorityQueue<T> {
  enqueue(item: T, priority: number): void;
  dequeue(): T | null;
  peek(): T | null;
  isEmpty(): boolean;
  size(): number;
  remove(item: T): boolean;
}

type RepriorStrategy = 'promote-active' | 'demote-active' | 'rotate' | 'shuffle';

interface QueueStatus {
  pending: number;
  active: boolean;
  completed: number;
}

/**
 * A priority queue implementation for Experiment objects.
 * Items are ordered by priority (higher first).
 */
class ExperimentPriorityQueue implements PriorityQueue<Experiment> {
  private items: { item: Experiment; priority: number }[] = [];

  /**
   * Adds an item with a given priority to the queue.
   * @param item The experiment to enqueue.
   * @param priority Numeric priority (higher is better).
   * @throws {TypeError} If priority is not a valid number.
   */
  enqueue(item: Experiment, priority: number): void {
    if (!Number.isFinite(priority)) {
      throw new TypeError('Priority must be a finite number');
    }
    this.items.push({ item, priority });
    this.items.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Removes and returns the highest-priority item.
   * @returns The experiment or null if empty.
   */
  dequeue(): Experiment | null {
    const entry = this.items.pop();
    return entry ? entry.item : null;
  }

  /**
   * Returns the highest-priority item without removing it.
   * @returns The experiment or null if empty.
   */
  peek(): Experiment | null {
    const entry = this.items[this.items.length - 1];
    return entry ? entry.item : null;
  }

  /**
   * Checks if the queue is empty.
   * @returns True if empty.
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Returns the number of items in the queue.
   * @returns The count.
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Removes a specific experiment from the queue.
   * @param item The experiment to remove.
   * @returns True if removed, false if not found.
   */
  remove(item: Experiment): boolean {
    const index = this.items.findIndex(entry => entry.item === item);
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Returns a copy of the internal items array.
   * @returns Array of {item, priority}.
   */
  getItems(): { item: Experiment; priority: number }[] {
    return [...this.items];
  }

  /**
   * Clears all items from the queue.
   */
  clear(): void {
    this.items = [];
  }
}

/**
 * Manages the execution order of experiments.
 */
export class ExperimentQueue {
  private queue: PriorityQueue<Experiment>;
  private active: Experiment | null = null;
  private completed: Experiment[] = [];

  constructor() {
    this.queue = new ExperimentPriorityQueue();
  }

  /**
   * Adds an experiment to the queue with a priority.
   * @param exp The experiment to add.
   * @param priority Numeric priority (higher is better).
   * @throws {TypeError} If priority is not a valid number.
   */
  enqueue(exp: Experiment, priority: number): void {
    if (!exp) {
      throw new TypeError('Experiment is required');
    }
    if (!Number.isFinite(priority)) {
      throw new TypeError('Priority must be a finite number');
    }
    this.queue.enqueue(exp, priority);
  }

  /**
   * Removes and returns the highest-priority experiment.
   * Moves current active to completed before assigning new active.
   * @returns The experiment or null if queue is empty.
   */
  dequeue(): Experiment | null {
    if (this.active) {
      this.completed.push(this.active);
    }
    this.active = this.queue.dequeue();
    return this.active;
  }

  /**
   * Returns the next experiment without removing it.
   * @returns The experiment or null if none.
   */
  peek(): Experiment | null {
    return this.queue.peek();
  }

  /**
   * Checks if the queue has no experiments pending or active.
   * @returns True if empty.
   */
  isEmpty(): boolean {
    return this.queue.isEmpty() && !this.active;
  }

  /**
   * Returns the number of pending experiments.
   * @returns The count.
   */
  size(): number {
    return this.queue.size();
  }

  /**
   * Reprioritizes experiments based on a strategy.
   * @param strategy The reprioritization strategy.
   * @throws {TypeError} If strategy is invalid.
   */
  reprioritize(strategy: RepriorStrategy): void {
    const validStrategies: RepriorStrategy[] = ['promote-active', 'demote-active', 'rotate', 'shuffle'];
    if (!validStrategies.includes(strategy)) {
      throw new TypeError(`Invalid strategy. Allowed: ${validStrategies.join(', ')}`);
    }

    const items = (this.queue as ExperimentPriorityQueue).getItems();
    if (items.length === 0) return;

    switch (strategy) {
      case 'promote-active':
        if (this.active) {
          this.queue = new ExperimentPriorityQueue();
          items.forEach(({ item, priority }) => {
            const newPriority = item === this.active ? priority + 10 : priority;
            this.queue.enqueue(item, newPriority);
          });
        }
        break;
      case 'demote-active':
        if (this.active) {
          this.queue = new ExperimentPriorityQueue();
          items.forEach(({ item, priority }) => {
            const newPriority = item === this.active ? priority - 10 : priority;
            this.queue.enqueue(item, newPriority);
          });
        }
        break;
      case 'rotate':
        const rotated = items.map((entry, index) => ({
          ...entry,
          priority: entry.priority + (items.length - index)
        }));
        this.queue = new ExperimentPriorityQueue();
        rotated.forEach(({ item, priority }) => this.queue.enqueue(item, priority));
        break;
      case 'shuffle':
        const shuffled = items.sort(() => Math.random() - 0.5);
        this.queue = new ExperimentPriorityQueue();
        shuffled.forEach(({ item, priority }) => this.queue.enqueue(item, priority + Math.random() * 5));
        break;
    }
  }

  /**
   * Cancels an experiment, removing it from queue or clearing active.
   * @param exp The experiment to cancel.
   * @returns True if removed, false if not found.
   */
  cancel(exp: Experiment): boolean {
    if (!exp) return false;
    if (this.active === exp) {
      this.active = null;
      return true;
    }
    return this.queue.remove(exp);
  }

  /**
   * Returns the current status of the queue.
   * @returns QueueStatus object with counts.
   */
  status(): QueueStatus {
    return {
      pending: this.queue.size(),
      active: this.active !== null,
      completed: this.completed.length
    };
  }

  /**
   * Returns the current active experiment.
   * @returns The active experiment or null.
   */
  getActive(): Experiment | null {
    return this.active;
  }

  /**
   * Returns a copy of completed experiments.
   * @returns Array of completed experiments.
   */
  getCompleted(): Experiment[] {
    return [...this.completed];
  }

  /**
   * Clears all experiments from the queue, active, and completed.
   */
  clear(): void {
    this.queue.clear();
    this.active = null;
    this.completed = [];
  }
}