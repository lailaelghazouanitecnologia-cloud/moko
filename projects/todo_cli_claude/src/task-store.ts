/**
 * TaskStore — persistent storage for tasks using JSON file backend.
 * Handles CRUD operations, filtering, sorting, and atomic file writes.
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import {
  Task, TaskId, CreateTaskInput, UpdateTaskInput,
  TaskFilter, SortSpec, Priority, TaskStatus,
  PRIORITY_WEIGHT,
} from './types';

/** Serialized task format for JSON persistence. */
interface SerializedTask {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly priority: Priority;
  readonly tags: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly dueDate: string | null;
  readonly completedAt: string | null;
}

/** In-memory task database with file persistence. */
export class TaskStore {
  private readonly tasks: Map<TaskId, Task> = new Map();
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  /** Generate a branded TaskId. */
  private generateId(): TaskId {
    return randomUUID().slice(0, 8) as TaskId;
  }

  /** Create a new task from input. */
  create(input: CreateTaskInput): Task {
    if (!input.title.trim()) {
      throw new TypeError('Task title cannot be empty');
    }

    const now = new Date();
    const task: Task = {
      id: this.generateId(),
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      status: 'pending',
      priority: input.priority ?? 'medium',
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
      dueDate: input.dueDate ?? null,
      completedAt: null,
    };

    this.tasks.set(task.id, task);
    this.save();
    return task;
  }

  /** Update an existing task. Returns null if not found. */
  update(id: TaskId, input: UpdateTaskInput): Task | null {
    const existing = this.tasks.get(id);
    if (!existing) return null;

    const now = new Date();
    const isCompleting = input.status === 'completed' && existing.status !== 'completed';

    const updated: Task = {
      ...existing,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description.trim() }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      updatedAt: now,
      completedAt: isCompleting ? now : existing.completedAt,
    };

    this.tasks.set(id, updated);
    this.save();
    return updated;
  }

  /** Delete a task by ID. Returns true if found and deleted. */
  delete(id: TaskId): boolean {
    const existed = this.tasks.delete(id);
    if (existed) this.save();
    return existed;
  }

  /** Get a single task by ID. */
  get(id: TaskId): Task | null {
    return this.tasks.get(id) ?? null;
  }

  /** Find task by partial ID match (for CLI convenience). */
  findByPartialId(partial: string): Task | null {
    if (partial.length < 3) return null;
    const matches: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.id.startsWith(partial)) {
        matches.push(task);
      }
    }
    return matches.length === 1 ? matches[0] : null;
  }

  /** List tasks with optional filtering and sorting. */
  list(filter?: TaskFilter, sort?: SortSpec): ReadonlyArray<Task> {
    let results = Array.from(this.tasks.values());

    if (filter) {
      results = this.applyFilter(results, filter);
    }

    if (sort) {
      results = this.applySort(results, sort);
    } else {
      // Default: by priority (critical first), then by creation date
      results.sort((a, b) => {
        const priorityDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    return results;
  }

  /** Count tasks matching a filter. */
  count(filter?: TaskFilter): number {
    if (!filter) return this.tasks.size;
    return this.applyFilter(Array.from(this.tasks.values()), filter).length;
  }

  /** Get summary statistics. */
  stats(): { total: number; byStatus: Record<TaskStatus, number>; byPriority: Record<Priority, number> } {
    const byStatus: Record<TaskStatus, number> = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
    const byPriority: Record<Priority, number> = { critical: 0, high: 0, medium: 0, low: 0 };

    for (const task of this.tasks.values()) {
      byStatus[task.status]++;
      byPriority[task.priority]++;
    }

    return { total: this.tasks.size, byStatus, byPriority };
  }

  // ── Filtering ──────────────────────────────────────────────

  private applyFilter(tasks: Task[], filter: TaskFilter): Task[] {
    return tasks.filter(task => {
      if (filter.status && task.status !== filter.status) return false;
      if (filter.priority && task.priority !== filter.priority) return false;
      if (filter.tag && !task.tags.includes(filter.tag)) return false;
      if (filter.search) {
        const query = filter.search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description.toLowerCase().includes(query);
        const matchesTag = task.tags.some(t => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesTag) return false;
      }
      if (filter.dueBefore && task.dueDate && task.dueDate > filter.dueBefore) return false;
      if (filter.dueAfter && task.dueDate && task.dueDate < filter.dueAfter) return false;
      return true;
    });
  }

  // ── Sorting ────────────────────────────────────────────────

  private applySort(tasks: Task[], sort: SortSpec): Task[] {
    const direction = sort.direction === 'asc' ? 1 : -1;

    return [...tasks].sort((a, b) => {
      switch (sort.field) {
        case 'priority':
          return (PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]) * direction;
        case 'created':
          return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
        case 'due': {
          const aDue = a.dueDate?.getTime() ?? Infinity;
          const bDue = b.dueDate?.getTime() ?? Infinity;
          return (aDue - bDue) * direction;
        }
        case 'status': {
          const statusOrder: Record<TaskStatus, number> = {
            pending: 0, in_progress: 1, completed: 2, cancelled: 3,
          };
          return (statusOrder[a.status] - statusOrder[b.status]) * direction;
        }
        default:
          return 0;
      }
    });
  }

  // ── Persistence ────────────────────────────────────────────

  private load(): void {
    if (!existsSync(this.filePath)) return;

    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const data: ReadonlyArray<SerializedTask> = JSON.parse(raw);

      for (const item of data) {
        const task: Task = {
          id: item.id as TaskId,
          title: item.title,
          description: item.description,
          status: item.status,
          priority: item.priority,
          tags: item.tags,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          completedAt: item.completedAt ? new Date(item.completedAt) : null,
        };
        this.tasks.set(task.id, task);
      }
    } catch {
      // Corrupted file — start fresh
      this.tasks.clear();
    }
  }

  private save(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const data: SerializedTask[] = Array.from(this.tasks.values()).map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      tags: task.tags,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      dueDate: task.dueDate?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
    }));

    // Atomic write: write to temp file, then rename
    const tmpPath = this.filePath + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');

    // Node's renameSync is atomic on most filesystems
    const { renameSync } = require('fs');
    renameSync(tmpPath, this.filePath);
  }
}
