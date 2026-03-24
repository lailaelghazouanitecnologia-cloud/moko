import { Assignment } from './assignment';
import { AssignmentRepository } from './assignment-repository';
import { AssignmentStatus } from './assignment-status';
import { TaskflowException } from '../core/taskflow-exception';
import { IdGenerator } from '../core/id-generator';

/**
 * Handles business logic for assignment operations.
 */
export class AssignmentService {
  constructor(private repository: AssignmentRepository) {}

  /**
   * Creates a new assignment between a user and a task.
   * @param userId - The ID of the user to assign the task to.
   * @param taskId - The ID of the task to assign.
   * @returns The newly created assignment.
   * @throws {TaskflowException} If the assignment already exists or inputs are invalid.
   */
  async assignTask(userId: string, taskId: string): Promise<Assignment> {
    this.validateId(userId, 'userId');
    this.validateId(taskId, 'taskId');

    const existing = await this.repository.findByUserAndTask(userId, taskId);
    if (existing) {
      throw new TaskflowException('ASSIGNMENT_EXISTS', 'ASSIGNMENT_EXISTS', { userId, taskId });
    }

    const assignment = new Assignment(
      this.generateId(),
      userId,
      taskId,
      AssignmentStatus.PENDING,
      new Date(),
      null
    );

    return this.repository.save(assignment);
  }

  /**
   * Marks an assignment as completed.
   * @param assignmentId - The ID of the assignment to complete.
   * = 0 returns The updated assignment.
   * @throws {TaskflowException} If the assignment is not found or not in pending status.
   */
  async completeAssignment(assignmentId: string): Promise<Assignment> {
    this.validateId(assignmentId, 'assignmentId');

    const assignment = await this.repository.findById(assignmentId);
    if (!assignment) {
      throw new TaskflowException('ASSIGNMENT_NOT_FOUND', 'ASSIGNMENT_NOT_FOUND', { assignmentId });
    }

    if (assignment.status !== AssignmentStatus.PENDING) {
      throw new TaskflowException('ASSIGNMENT_NOT_PENDING', 'ASSIGNMENT_NOT_PENDING', { status: assignment.status });
    }

    const updatedAssignment = new Assignment(
      assignment.id,
      assignment.userId,
      assignment.taskId,
      AssignmentStatus.COMPLETED,
      assignment.assignedAt,
      new Date()
    );
    return this.repository.save(updatedAssignment);
  }

  /**
   * Retrieves all assignments for a specific user.
   * @param userId - The ID of the user.
   * @returns List of assignments for the user.
   * @throws {TaskflowException} If userId is invalid.
   */
  async getUserAssignments(userId: string): Promise<Assignment[]> {
    this.validateId(userId, 'userId');
    return this.repository.findByUserId(userId);
  }

  /**
   * Retrieves all assignments for a specific task.
   * @param taskId - The ID of the task.
   = 0 returns List of assignments for the task.
   * @throws {TaskflowException} If taskId is invalid.
   */
  async getTaskAssignments(taskId: string): Promise<Assignment[]> {
    this.validateId(taskId, 'taskId');
    return this.repository.findByTaskId(taskId);
  }

  /**
   * Cancels an assignment by setting its status to CANCELLED.
   * @param assignmentId - The ID of the assignment to cancel.
   * @throws {TaskflowException} If the assignment is not found.
   */
  async cancelAssignment(assignmentId: string): Promise<void> {
    this.validateId(assignmentId, 'assignmentId');

    const assignment = await this.repository.findById(assignmentId);
    if (!assignment) {
      throw new TaskflowException('ASSIGNMENT_NOT_FOUND', 'ASSIGNMENT_NOT_FOUND', { assignmentId });
    }

    const updatedAssignment = new Assignment(
      assignment.id,
      assignment.userId,
      assignment.taskId,
      AssignmentStatus.CANCELLED,
      assignment.assignedAt,
      assignment.completedAt
    );
    await this.repository.save(updatedAssignment);
  }

  /**
   * Checks if a user is assigned to a task with PENDING status.
   * @param userId - The ID of the user.
   * @param taskId - The ID of the task.
   * @returns True if the user is assigned and pending, otherwise false.
   * @throws {TaskflowException} If inputs are invalid.
   */
  async isUserAssigned(userId: string, taskId: string): Promise<boolean> {
    this.validateId(userId, 'userId');
    this.validateId(taskId, 'taskId');

    const assignment = await this.repository.findByUserAndTask(userId, taskId);
    return assignment !== null && assignment.status === AssignmentStatus.PENDING;
  }

  /**
   * Calculates assignment statistics for a user.
   * @param userId - The ID of the user.
   * @returns An object with total, completed, and pending counts.
   * @throws {TaskflowException} If userId is invalid.
   */
  async getAssignmentStats(userId: string): Promise<{ total: number; completed: number; pending: number }> {
    this.validateId(userId, 'userId');

    const assignments = await this.repository.findByUserId(userId);
    const completed = assignments.filter(a => a.status === AssignmentStatus.COMPLETED).length;
    const pending = assignments.filter(a => a.status === AssignmentStatus.PENDING).length;

    return { total: assignments.length, completed, pending };
  }

  /**
   * Reassigns a task from one user to another.
   * @param assignmentId - The ID of the assignment to reassigned.
   * @param newUserId - The ID of the new user to assign the task to.
   * @returns The newly created assignment for the new user.
   * @throws {TaskflowException} If assignment is not found or conflict exists.
   */
  async reassignTask(assignmentId: string, newUserId: string): Promise<Assignment> {
    this.validateId(assignmentId, 'assignmentId');
    this.validateId(newUserId, 'newUserId');

    const assignment = await this.repository.findById(assignmentId);
    if (!assignment) {
      throw new TaskflowException('ASSIGNMENT_NOT_FOUND', 'ASSIGNMENT_NOT_FOUND', { assignmentId });
    }

    const conflict = await this.repository.findByUserAndTask(newUserId, assignment.taskId);
    if (conflict) {
      throw new TaskflowException('ASSIGNMENT_CONFLICT', 'ASSIGNMENT_CONFLICT', { userId: newUserId, taskId: assignment.taskId });
    }

    const reassigned = new Assignment(
      this.generateId(),
      newUserId,
      assignment.taskId,
      AssignmentStatus.PENDING,
      new Date(),
      null
    );

    const cancelledAssignment = new Assignment(
      assignment.id,
      assignment.userId,
      assignment.taskId,
      AssignmentStatus.CANCELLED,
      assignment.assignedAt,
      assignment.completedAt
    );
    await this.repository.save(cancelledAssignment);

    return this.repository.save(reassigned);
  }

  /**
   * Retrieves pending assignments older than a specified number of days.
   * @param days - Number of days to consider overdue.
   * @returns List of overdue pending assignments.
   * @throws {TaskflowException} If days is not a positive integer.
   */
  async getOverdueAssignments(days: number): Promise<Assignment[]> {
    if (!Number.isInteger(days) || days <= 0) {
      throw new TaskflowException('INVALID_DAYS', 'INVALID_DAYS', { days });
    }

    const all = await this.repository.findAll();
    const limit = new Date();
    limit.setDate(limit.getDate() - days);

    return all.filter((a: Assignment) => 
      a.status === AssignmentStatus.PENDING && 
      a.assignedAt < limit
    );
  }

  /**
   * Generates a random ID for new assignments.
   * @returns A random string ID.
   */
  private generateId(): string {
    return IdGenerator.uuid();
  }

  /**
   * Validates that an ID is a non-empty string.
   * @param id - The ID to validate.
   * @param fieldName - The name of the field for error messages.
   * @throws {TaskflowException} If the ID is invalid.
   */
  private validateId(id: string, fieldName: string): void {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new TaskthrowException('INVALID_ID', 'INVALID_ID', { fieldName, value: id });
    }
  }
}
