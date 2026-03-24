import { AssignmentStatus } from './assignment-status';

/**
 * Represents a user-to-task assignment
 */
export class Assignment {
  public readonly id: string;
  public readonly userId: string;
  public readonly taskId: string;
  public readonly assignedAt: Date;
  public completedAt: Date | null;
  public status: AssignmentStatus;

  /**
   * Creates a new Assignment instance
   * @param id - Unique identifier for the assignment
   * @param userId - ID of the assigned user
   * @param taskId - ID of the assigned task
   * @throws {Error} If any parameter is invalid
   */
  constructor(id: string, userId: string, taskId: string) {
    this.validateConstructorParams(id, userId, taskId);
    
    this.id = id;
    this.userId = userId;
    this.taskId = taskId;
    this.assignedAt = new Date();
    this.completedAt = null;
    this.status = AssignmentStatus.PENDING;
  }

  /**
   * Marks the assignment as completed
   * @throws {Error} If assignment is already completed
   */
  complete(): void {
    if (this.status === AssignmentStatus.COMPLETED) {
      throw new Error('Assignment is already completed');
    }
    
    this.completedAt = new Date();
    this.status = AssignmentStatus.COMPLETED;
  }

  /**
   * Checks if the assignment is completed
   * @returns True if completed, false otherwise
   */
  isCompleted(): boolean {
    return this.completedAt !== null;
  }

  /**
   * Gets the duration of the assignment in milliseconds
   * @returns Duration in milliseconds, or 0 if not completed
   */
  getDuration(): number {
    if (!this.completedAt) {
      return 0;
    }
    return this.completedAt.getTime() - this.assignedAt.getTime();
  }

  /**
   * Returns a plain object representation of the assignment
   * @returns Plain object with assignment properties
   */
  toJSON(): object {
    return {
      id: this.id,
      userId: this.userId,
      taskId: this.taskId,
      assignedAt: this.assignedAt.toISOString(),
      completedAt: this.completedAt ? this.completedAt.toISOString() : null,
      status: this.status
    };
  }

  /**
   * Validates constructor parameters
   * @param id - Assignment ID
   * @param userId - User ID
   * @param taskId - Task ID
   * @throws {Error} If any parameter is invalid
   */
  private validateConstructorParams(id: string, userId: string, taskId: string): void {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Invalid assignment ID: must be a non-empty string');
    }
    
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Invalid user ID: must be a non-empty string');
    }
    
    if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
      throw new Error('Invalid task ID: must be a non-empty string');
    }
  }
}
