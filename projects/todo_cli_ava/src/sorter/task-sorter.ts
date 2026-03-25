import { Task } from '../model/task';
import { TaskList } from '../model/task-list';

/**
 * Provides sorting and filtering capabilities for tasks.
 */
export class TaskSorter {
  private readonly taskList: TaskList;

  constructor(taskList: TaskList) {
    if (!taskList) {
      throw new TypeError('taskList is required');
    }
    this.taskList = taskList;
  }

  /**
   * Returns tasks sorted by priority (high → medium → low).
   */
  sortByPriority(): ReadonlyArray<Task> {
    const tasks = this.taskList.getAllTasks();
    return [...tasks].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 } as const;
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Returns tasks sorted by creation date (newest first).
   */
  sortByCreatedDate(): ReadonlyArray<Task> {
    const tasks = this.taskList.getAllTasks();
    return [...tasks].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Returns tasks sorted by status (pending → completed).
   */
  sortByStatus(): ReadonlyArray<Task> {
    const tasks = this.taskList.getAllTasks();
    return [...tasks].sort((a, b) => {
      const statusOrder = { completed: 1, pending: 0 } as const;
      const aStatus = a.isCompleted() ? 'completed' : 'pending';
      const bStatus = b.isCompleted() ? 'completed' : 'pending';
      return statusOrder[aStatus] - statusOrder[bStatus];
    });
  }

  /**
   * Returns tasks sorted alphabetically by title.
   */
  sortByTitle(): ReadonlyArray<Task> {
    const tasks = this.taskList.getAllTasks();
    return [...tasks].sort((a, b) => a.title.localeCompare(b.title));
  }

  /**
   * Returns only high-priority tasks.
   */
  getHighPriorityTasks(): ReadonlyArray<Task> {
    const tasks = this.taskList.getAllTasks();
    return tasks.filter(task => task.priority === 'high');
  }

  /**
   * Returns pending tasks with high priority.
   */
  getPendingHighPriorityTasks(): ReadonlyArray<Task> {
    const tasks = this.taskList.getAllTasks();
    return tasks.filter(task => task.priority === 'high' && task.isPending());
  }

  /**
   * Returns completed tasks sorted by creation date (newest first).
   */
  getCompletedTasksSortedByDate(): ReadonlyArray<Task> {
    const tasks = this.taskList.getCompleted();
    return [...tasks].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Returns pending tasks sorted by priority (high → medium → low).
   */
  getPendingTasksSortedByPriority(): ReadonlyArray<Task> {
    const tasks = this.taskList.getPending();
    return [...tasks].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 } as const;
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}