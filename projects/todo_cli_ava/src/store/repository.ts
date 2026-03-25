import { Store } from './store';
import { Serializer } from './serializer';
import { Config } from '../core';

export type Status = 'pending' | 'completed' | 'archived';
export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly status: Status;
  readonly priority: Priority;
  readonly dueDate?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Repository {
  private readonly store: Store;
  private readonly serializer: Serializer<Todo>;
  private readonly config: Config;

  constructor(store: Store, serializer: Serializer<Todo>, config: Config) {
    this.store = store;
    this.serializer = serializer;
    this.config = config;
  }

  add(todo: Todo): void {
    this.store.add(todo);
  }

  remove(id: string): boolean {
    return this.store.remove(id);
  }

  update(id: string, updates: Partial<Todo>): boolean {
    return this.store.update(id, updates);
  }

  findById(id: string): Todo | undefined {
    return this.store.findById(id);
  }

  findAll(): Todo[] {
    return this.store.findAll();
  }

  filterByStatus(status: Status): Todo[] {
    return this.store.findAll().filter(todo => todo.status === status);
  }

  sortByPriority(todos: Todo[]): Todo[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...todos].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  sortByDate(todos: Todo[]): Todo[] {
    return [...todos].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }

  async save(): Promise<void> {
    const todos = this.store.findAll();
    await this.serializer.write(todos);
  }

  async load(): Promise<void> {
    if (!this.serializer.exists()) {
      this.serializer.create();
      return;
    }
    
    const todos = await this.serializer.read();
    todos.forEach(todo => this.store.add(todo));
  }
}
