import { TaskStatus, TaskStatusUtils } from './task-status';
import { TaskflowException } from '../core/taskflow-exception';
import { IdGenerator } from '../core/id-generator';

export interface TaskProps {
  id?: string;
  title: string;
  description: string;
  status?: TaskStatus;
  createdAt?: Date;
  updatedAt?: Date;
  assigneeId?: string;
  dueDate?: Date;
}

/**
 * Domain entity representing a task in the system.
 * Tasks are immutable - any modification returns a new instance.
 */
export class Task {
  public readonly id: string;
  public readonly title: string;
  public readonly description: string;
  public readonly status: TaskStatus;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly assigneeId: string | null;
  public readonly dueDate: Date | null;

  private constructor(
    id: string,
    title: string,
    description: string,
    status: TaskStatus,
    createdAt: Date,
    updatedAt: Date,
    assigneeId: string | null,
    dueDate: Date | null
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.assigneeId = assigneeId;
    this.dueDate = dueDate;
  }

  /**
   * Factory method to create a new Task instance with validation
   * @throws {TaskflowException} If required fields are missing or invalid
   */
  public static create(props: TaskProps): Task {
    this.validateTaskProps(props);

    const now = new Date();
    const id = props.id || IdGenerator.uuid();
    const status = props.status ?? TaskStatus.TODO;
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? now;
    const assigneeId = props.assigneeId ?? null;
    const dueDate = props.dueDate ?? null;

    return new Task(
      id,
      props.title.trim(),
      props.description.trim(),
      status,
      createdAt,
      updatedAt,
      assigneeId,
      dueDate
    );
  }

  /**
   * Creates a new Task instance with updated status
   * @param newStatus - The new status to transition to
   * @returns New Task instance with updated status and timestamp
   * @throws {TaskflowException} If status transition is invalid
   */
  public updateStatus(newStatus: TaskStatus): Task {
    if (!this.canTransitionTo(newStatus)) {
      throw new TaskflowException('INVALID_STATUS_TRANSITION', 'INVALID_STATUS_TRANSITION', {
        from: this.status,
        to: newStatus
      });
    }

    return new Task(
      this.id,
      this.title,
      this.description,
      newStatus,
      this.createdAt,
      new Date(),
      this.assigneeId,
      this.dueDate
    );
  }

  /**
   * Creates a new Task instance assigned to a user
   * @param userId - The ID of the user to assign the task to
   * @returns New Task instance with updated assignee and timestamp
   * @throws {TaskflowException} If userId is invalid
   */
  public assignTo(userId: string): Task {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new TaskflowException('INVALID_ASSIGNEE_ID', 'INVALID_ASSIGNEE_ID', { userId });
    }

    if (!IdGenerator.uuid()) {
      throw new TaskflowException('INVALID_UUID_FORMAT', 'INVALID_UUID_FORMAT', { userId });
    }

    return new Task(
      this.id,
      this.title,
      this.description,
      this.status,
      this.createdAt,
      new Date(),
      userId.trim(),
      this.dueDate
    );
  }

  /**
   * Unassigns the task from the current user
   * @returns New Task instance with no assignee
   */
  public unassign(): Task {
    return new Task(
      this.id,
      this.title,
      this.description,
      this.status,
      this.createdAt,
      new Date(),
      null,
      this.dueDate
    );
  }

  /**
   * Updates the due date of the task
   * @param newDueDate - The new due date
   * @returns New Task instance with updated due date
   * @throws {TaskflowException} If due date is invalid
   */
  public updateDueDate(newDueDate: Date | null): Task {
    if (newDueDate && !(newDueDate instanceof Date)) {
      throw new TaskflowException('INVALID_DUE_DATE_TYPE', 'INVALID_DUE_DATE_TYPE', { dueDate: newDueDate });
    }

    if (newDueDate && isNaN(newDueDate.getTime())) {
      throw new TaskflowException('INVALID_DATE', 'INVALID_DATE', { dueDate: newDueDate });
    }

    return new Task(
      this.id,
      this.title,
      this.description,
      this.status,
      this.createdAt,
      new Date(),
      this.assigneeId,
      newDueDate
    );
  }

  /**
   * Updates the title of the task
   * @param newTitle - The new title
   * @returns New Task instance with updated title
   * @throws {TaskflowException} If title is invalid
   */
  public updateTitle(newTitle: string): Task {
    if (!newTitle || typeof newTitle !== 'string' || newTitle.trim().length === 0) {
      throw new TaskflowException('INVALID_TITLE', 'INVALID_TITLE', { title: newTitle });
    }

    if (newTitle.length > 255) {
      throw new TaskflowException('TITLE_TOO_LONG', 'TITLE_TOO_LONG', { title: newTitle });
    }

    return new Task(
      this.id,
      newTitle.trim(),
      this.description,
      this.status,
      this.createdAt,
      new Date(),
      this.assigneeId,
      this.dueDate
    );
  }

  /**
   * Updates the description of the task
   * @param newDescription - The new description
   * @returns New Task instance with updated description
   * @throws {TaskflowException} If description is invalid
   */
  public updateDescription(newDescription: string): Task {
    if (!newDescription || typeof newDescription !== 'string' || newDescription.trim().length === 0) {
      throw new TaskflowException('INVALID_DESCRIPTION', 'INVALID_DESCRIPTION', { description: newDescription });
    }

    if (newDescription.length > 2000) {
      throw new TaskflowException('DESCRIPTION_TOO_LONG', 'DESCRIPTION_TOO_LONG', { description: newDescription });
    }

    return new Task(
      this.id,
      this.title,
      newDescription.trim(),
      this.status,
      this.createdAt,
      new Date(),
      this.assigneeId,
      this.dueDate
    );
  }

  /**
   * Checks if the task is overdue
   * @returns True if the task has a due date in the past
   */
  public isOverdue(): boolean {
    if (!this.dueDate) {
      return false;
    }
    
    const now = new Date();
    return now > this.dueDate;
  }

  /**
   * Checks if the task is due within a specified number of days
   * @param days - Number of days to check
   * @returns True if the task is due within the specified days
   */
  public isDueWithin(days: number): boolean {
    if (!this.dueDate || days < 0) {
      return false;
    }

    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return now <= this.dueDate && this.dueDate <= futureDate;
  }

  /**
   * Checks if a status transition is valid
   * @param status - The target status
   * @returns True if the transition is valid
   */
  public canTransitionTo(status: TaskStatus): boolean {
    return TaskStatusUtils.isValidTransition(this.status, status);
  }

  /**
   * Checks if the task is assigned to a specific user
   * @param userId - The user ID to check
   * @returns True if assigned to the specified user
   */
  public isAssignedTo(userId: string): boolean {
    if (!userId || !this.assigneeId) {
      return false;
    }
    return this.assigneeId === userId;
  }

  /**
   * Calculates the number of days until the due date
   * @returns Number of days until due, or null if no due date
   */
  public daysUntilDue(): number | null {
    if (!this.dueDate) {
      return null;
    }

    const now = new Date();
    const diffTime = this.dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Converts the task to a plain object for serialization
   * @returns Plain object representation of the task
   */
  public toObject(): {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    createdAt: Date;
    updatedAt: Date;
    assigneeId: string | null;
    dueDate: Date | null;
  } {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      assigneeId: this.assigneeId,
      dueDate: this.dueDate
    };
  }

  /**
   * Creates a copy of the task with the same properties
   * @returns New Task instance with identical properties
   */
  public clone(): Task {
    return new Task(
      this.id,
      this.title,
      this.description,
      this.status,
      this.createdAt,
      this.updatedAt,
      this.assigneeId,
      this.dueDate
    );
  }

  /**
   * Validates task properties
   * @param props - The task properties to validate
   * @throws {TaskflowException} If validation fails
   */
  private static validateTaskProps(props: TaskProps): void {
    if (!props || typeof props !== 'object') {
      throw new TaskflowException('INVALID_TASK_PROPS', 'INVALID_TASK_PROPS', { props });
    }

    if (!props.title || typeof props.title !== 'string' || props.title.trim().length === 0) {
      throw new TaskflowException('INVALID_TITLE', 'INVALID_TITLE', { title: props.title });
    }

    if (props.title.length > 255) {
      throw new TaskflowException('TITLE_TOO_LONG', 'TITLE_TOO_LONG', { title: props.title });
    }

    if (!props.description || typeof props.description !== 'string' || props.description.trim().length === 0) {
      throw new TaskflowException('INVALID_DESCRIPTION', 'INVALID_DESCRIPTION', { description: props.description });
    }

    if (props.description.length > 2000) {
      throw new TaskflowException('DESCRIPTION_TOO_LONG', 'DESCRIPTION_TOO_LONG', { description: props.description });
    }

    if (props.id && !IdGenerator.uuid()) {
      throw new TaskflowException('INVALID_ID_FORMAT', 'INVALID_ID_FORMAT', { id: props.id });
    }

    if (props.assigneeId && !IdGenerator.uuid()) {
      throw new TaskflowException('INVALID_ASSIGNEE_ID_FORMAT', 'INVALID_ASSIGNEE_ID_FORMAT', { assigneeId: props.assigneeId });
    }

    if (props.dueDate && !(props.dueDate instanceof Date)) {
      throw new TaskflowException('INVALID_DUE_DATE_TYPE', 'INVALID_DUE_DATE_TYPE', { dueDate: props.dueDate });
    }

    if (props.dueDate && isNaN(props.dueDate.getTime())) {
      throw new TaskflowException('INVALID_DATE', 'INVALID_DATE', { dueDate: props.dueDate });
    }

    if (props.createdAt && !(props.createdAt instanceof Date)) {
      throw new TaskflowException('INVALID_CREATED_AT_TYPE', 'INVALID_CREATED_AT_TYPE', { createdAt: props.createdAt });
    }

    if (props.createdAt && isNaN(props.createdAt.getTime())) {
      throw new TaskflowException('INVALID_DATE', 'INVALID_DATE', { createdAt: props.createdAt });
    }

    if (props.updatedAt && !(props.updatedAt instanceof Date)) {
      throw new TaskflowException('INVALID_UPDATED_AT_TYPE', 'INVALID_UPDATED_AT_TYPE', { updatedAt: props.updatedAt });
    }

    if (props.updatedAt && isNaN(props.updatedAt.getTime())) {
      throw new TaskflowException('INVALID_DATE', 'INVALID_DATE', { updatedAt: props.updatedAt });
    }
  }
}
