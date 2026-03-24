/**
 * Data access interface for assignments
 */
export interface AssignmentRepository {
  /**
   * Create or update an assignment
   * @param assignment - The assignment to save
   * @returns Promise resolving to the saved assignment
   * @throws {Error} If assignment is invalid or save fails
   */
  save(assignment: Assignment): Promise<Assignment>;

  /**
   * Find an assignment by its primary key
   * @param id - The assignment ID
   * @returns Promise resolving to the assignment or null if not found
   * @throws {Error} If ID is invalid
   */
  findById(id: string): Promise<Assignment | null>;

  /**
   * Find all assignments for a specific user
   * @param userId - The user ID
   * @returns Promise resolving to array of assignments (empty if none)
   * @throws {Error} If userId is invalid
   */
  findByUserId(userId: string): Promise<Assignment[]>;

  /**
   * Find all assignments for a specific task
   * @param taskId - The task ID
   * @returns Promise resolving to array of assignments (empty if none)
   * @throws {Error} If taskId is invalid
   */
  findByTaskId(taskId: string): Promise<Assignment[]>;

  /**
   * Find a specific assignment by user and task
   * @param userId - The user ID
   * @param taskId - The task ID
   * @returns Promise resolving to the assignment or null if not found
   * @throws {Error} If userId or taskId is invalid
   */
  findByUserAndTask(userId: string, taskId: string): Promise<Assignment | null>;

  /**
   * Delete an assignment by ID
   * @param id - The assignment ID to delete
   * @returns Promise resolving to true if deleted, false if not found
   * @throws {Error} If ID is invalid or deletion fails
   */
  delete(id: string): Promise<boolean>;

  /**
   * Find all pending assignments for a user
   * @param userId - The user ID
   * @returns Promise resolving to array of pending assignments (empty if none)
   * @throws {Error} If userId is invalid
   */
  findPendingByUser(userId: string): Promise<Assignment[]>;

  /**
   * Count total assignments for a task
   * @param taskId - The task ID
   * @returns Promise resolving to the count
   * @throws {Error} If taskId is invalid
   */
  countByTask(taskId: string): Promise<number>;
}

/**
 * Represents an assignment between a user and a task
 */
export interface Assignment {
  /** Unique identifier for the assignment */
  id: string;
  /** ID of the assigned user */
  userId: string;
  /** ID of the task */
  taskId: string;
  /** Status of the assignment */
  status: AssignmentStatus;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Possible statuses for an assignment
 */
export enum AssignmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}
