import type { TaskStatus } from '../model/task';
import type { Task } from '../model/task';

export type Priority = 'low' | 'medium' | 'high';

export interface FilterQuery {
  status?: TaskStatus;
  priority?: Priority;
  assignee?: string;
  dueDateFrom?: Date;
  dueTo?: Date;
  tags?: string[];
}

export interface TaskFilter {
  readonly status: TaskStatus | null;
  readonly priority: Priority | null;
  readonly assignee: string | null;
  readonly dueDateFrom: Date | null;
  readonly dueDateTo: Date | null;
  readonly tags: ReadonlyArray<string>;

  matches(task: Task): boolean;
  toQuery(): FilterQuery;
  isEmpty(): boolean;
}
