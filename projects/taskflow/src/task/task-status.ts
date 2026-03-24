/**
 * Represents the current lifecycle state of a task.
 * @enum {string}
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED'
}

/**
 * Utility class for handling TaskStatus operations.
 * @class TaskStatusUtils
 */
export class TaskStatusUtils {
  /**
   * Validates if a given value is a valid TaskStatus.
   * @param {unknown} status - The value to validate.
   * @returns {boolean} True if the value is a valid TaskStatus, false otherwise.
   */
  static isValid(status: unknown): status is TaskStatus {
    return Object.values(TaskStatus).includes(status as TaskStatus);
  }

  /**
   * Parses a string into a TaskStatus.
   * @param {string} status - The string to parse.
   * @returns {TaskStatus} The parsed TaskStatus.
   * @throws {Error} If the string is not a valid TaskStatus.
   */
  static parse(status: string): TaskStatus {
    if (!this.isValid(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    return status as TaskStatus;
  }

  /**
   * Returns all available TaskStatus values.
   * @returns {TaskStatus[]} An array of all TaskStatus values.
   */
  static getAll(): TaskStatus[] {
    return [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.CANCELLED];
  }

  /**
   * Checks if a status is considered final (DONE or CANCELLED).
   * @param {TaskStatus} status - The status to check.
   * @returns {boolean} True if the status is final, false otherwise.
   */
  static isFinal(status: TaskStatus): boolean {
    return status === TaskStatus.DONE || status === TaskStatus.CANCELLED;
  }

  /**
   * Checks if a status is considered active (IN_PROGRESS).
   * @param {TaskStatus} status - The status to check.
   * @returns {boolean} True if the status is active, false otherwise.
   */
  static isActive(status: TaskStatus): boolean {
    return status === TaskStatus.IN_PROGRESS;
  }

  /**
   * Checks if a status is considered pending (TODO).
   * @param {TaskStatus} status - The status to check.
   * @returns {boolean} True if the status is pending, false otherwise.
   */
  static isPending(status: TaskStatus): boolean {
    return status === TaskStatus.TODO;
  }

  /**
   * Returns the next possible statuses from a given status.
   * @param {TaskStatus} status - The current status.
   * @returns {TaskStatus[]} An array of possible next statuses.
   */
  static getNextPossibleStatuses(status: TaskStatus): TaskStatus[] {
    switch (status) {
      case TaskStatus.TODO:
        return [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED];
      case TaskStatus.IN_PROGRESS:
        return [TaskStatus.DONE, TaskStatus.CANCELLED];
      case TaskStatus.DONE:
      case TaskStatus.CANCELLED:
      default:
        return [];
    }
  }

  /**
   * Checks if a transition from one status to another is valid.
   * @param {TaskStatus} from - The current status.
   * @param {TaskStatus} to - The target status.
   * @returns {boolean} True if the transition is valid, false otherwise.
   */
  static isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
    const next = this.getNextPossibleStatuses(from);
    return next.includes(to);
  }

  /**
   * Returns a human-readable label for a TaskStatus.
   * @param {TaskStatus} status - The status to get the label for.
   * @returns {string} A human-readable label.
   */
  static getLabel(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.TODO:
        return 'To Do';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.DONE:
        return 'Done';
      case TaskStatus.CANCELLED:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  /**
   * Returns a color associated with a TaskStatus for UI purposes.
   * @param {TaskStatus} status - The status to get the color for.
   * @returns {string} A color code (e.g., 'red', 'green', 'blue').
   */
  static getColor(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.TODO:
        return 'gray';
      case TaskStatus.IN_PROGRESS:
        return 'blue';
      case TaskStatus.DONE:
        return 'green';
      case TaskStatus.CANCELLED:
        return 'red';
      default:
        return 'black';
    }
  }
}
