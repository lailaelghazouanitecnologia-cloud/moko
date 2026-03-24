import { Request, Response } from 'express';
import { TaskService } from '../task/task-service';
import { AssignmentService } from '../assignment/assignment-service';
import { TaskStatus } from '../task/task-status';

/**
 * Controller responsible for handling HTTP requests related to task management.
 * Provides endpoints for CRUD operations on tasks within projects.
 */
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly assignmentService: AssignmentService
  ) {}

  /**
   * Creates a new task within a project.
   * @param req Express request object containing projectId in params and task details in body
   * @param res Express response object
   */
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      if (!projectId || typeof projectId !== 'string') {
        res.status(400).json({ error: 'Invalid projectId' });
        return;
      }

      const { title, description, dueDate, assigneeId } = req.body;
      if (!title || typeof title !== 'string') {
        res.status(400).json({ error: 'Title is required and must be a string' });
        return;
      }

      if (title.trim().length === 0) {
        res.status(400).json({ error: 'Title cannot be empty' });
        return;
      }

      if (title.length > 255) {
        res.status(400).json({ error: 'Title must be less than 255 characters' });
        return;
      }

      if (description && typeof description !== 'string') {
        res.status(400).json({ error: 'Description must be a string' });
        return;
      }

      if (dueDate && isNaN(Date.parse(dueDate))) {
        res.status(400).json({ error: 'Invalid dueDate format' });
        return;
      }

      if (assigneeId && typeof assigneeId !== 'string') {
        res.status(400).json({ error: 'AssigneeId must be a string' });
        return;
      }

      const createTaskDto = {
        title: title.trim(),
        description: description?.trim(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assigneeId
      };

      const task = await this.taskService.createTask(createTaskDto);
      res.status(201).json(task);
    } catch (error) {
      this.handleError(res, error, 'Failed to create task');
    }
  }

  /**
   * Retrieves a specific task by projectId and taskId.
   * @param req Express request object containing projectId and taskId in params
   * @param res Express response object
   */
  async getTask(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, taskId } = req.params;
      if (!projectId || !taskId || typeof projectId !== 'string' || typeof taskId !== 'string') {
        res.status(400).json({ error: 'Invalid projectId or taskId' });
        return;
      }

      if (!this.isValidId(projectId) || !this.isValidId(taskId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      const compositeId = `${projectId}:${taskId}`;
      const task = await this.taskService.getTask(compositeId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.json(task);
    } catch (error) {
      this.handleError(res, error, 'Failed to get task');
    }
  }

  /**
   * Updates an existing task with partial data.
   * @param req Express request object containing projectId and taskId in params, update data in body
   * @param res Express response object
   */
  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, taskId } = req.params;
      if (!projectId || !taskId || typeof projectId !== 'string' || typeof taskId !== 'string') {
        res.status(400).json({ error: 'Invalid projectId or taskId' });
        return;
      }

      if (!this.isValidId(projectId) || !this.isValidId(taskId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      const compositeId = `${projectId}:${taskId}`;
      const { title, description, dueDate, assigneeId } = req.body;

      const updateTaskDto: any = {};
      
      if (title !== undefined) {
        if (typeof title !== 'string') {
          res.status(400).json({ error: 'Title must be a string' });
          return;
        }
        if (title.trim().length === 0) {
          res.status(400).json({ error: 'Title cannot be empty' });
          return;
        }
        if (title.length > 255) {
          res.status(400).json({ error: 'Title must be less than 255 characters' });
          return;
        }
        updateTaskDto.title = title.trim();
      }
      
      if (description !== undefined) {
        if (typeof description !== 'string') {
          res.status(400).json({ error: 'Description must be a string' });
          return;
        }
        updateTaskDto.description = description.trim();
      }
      
      if (dueDate !== undefined) {
        if (dueDate !== null && isNaN(Date.parse(dueDate))) {
          res.status(400).json({ error: 'Invalid dueDate format' });
          return;
        }
        updateTaskDto.dueDate = dueDate === null ? null : new Date(dueDate);
      }
      
      if (assigneeId !== undefined) {
        if (assigneeId !== null && typeof assigneeId !== 'string') {
          res.status(400).json({ error: 'AssigneeId must be a string or null' });
          return;
        }
        updateTaskDto.assigneeId = assigneeId;
      }

      const task = await this.taskService.updateTask(compositeId, updateTaskDto);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.json(task);
    } catch (error) {
      this.handleError(res, error, 'Failed to update task');
    }
  }

  /**
   * Deletes a task after checking for active assignments.
   * @param req Express request object containing projectId and taskId in params
   * @param res Express response object
   */
  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, taskId } = req.params;
      if (!projectId || !taskId || typeof projectId !== 'string' || typeof taskId !== 'string') {
        res.status(400).json({ error: 'Invalid projectId or taskId' });
        return;
      }

      if (!this.isValidId(projectId) || !this.isValidId(taskId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      const compositeId = `${projectId}:${taskId}`;
      
      // Verify task exists
      const existingTask = await this.taskService.getTask(compositeId);
      if (!existingTask) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      
      // Check for active assignments
      const assignments = await this.assignmentService.getAssignmentStats(compositeId);
      const hasActiveAssignments = assignments.pending > 0;
      
      if (hasActiveAssignments) {
        res.status(409).json({ error: 'Cannot delete task with active assignments' });
        return;
      }

      await this.taskService.deleteTask(compositeId);
      res.status(204).send();
    } catch (error) {
      this.handleError(res, error, 'Failed to delete task');
    }
  }

  /**
   * Lists tasks with optional filtering by status, assignee, and overdue status.
   * @param req Express request object containing projectId in params and optional query filters
   * @param res Express response object
   */
  async listTasks(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      if (!projectId || typeof projectId !== 'string') {
        res.status(400).json({ error: 'Invalid projectId' });
        return;
      }

      if (!this.isValidId(projectId)) {
        res.status(400).json({ error: 'Invalid projectId format' });
        return;
      }

      const { status, assigneeId, overdue, page = '1', limit = '20' } = req.query;

      const filters: any = { projectId };
      
      if (status) {
        if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
          res.status(400).json({ error: 'Invalid status value' });
          return;
        }
        filters.status = status as TaskStatus;
      }
      
      if (assigneeId) {
        if (typeof assigneeId !== 'string') {
          res.status(400).json({ error: 'AssigneeId must be a string' });
          return;
        }
        if (!this.isValidId(assigneeId)) {
          res.status(400).json({ error: 'Invalid assigneeId format' });
          return;
        }
        filters.assigneeId = assigneeId;
      }
      
      if (overdue === 'true') {
        filters.dueBefore = new Date();
      }

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      if (isNaN(pageNum) || pageNum < 1) {
        res.status(400).json({ error: 'Invalid page value' });
        return;
      }
      
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({ error: 'Invalid limit value (must be between 1 and 100)' });
        return;
      }

      const tasks = await this.taskService.listTasks(filters);
      res.json(tasks);
    } catch (error) {
      this.handleError(res, error, 'Failed to list tasks');
    }
  }

  /**
   * Assigns a task to a user and creates an assignment record.
   * @param req Express request object containing projectId and taskId in params, userId in body
   * @param res Express response object
   */
  async assignTask(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, taskId } = req.params;
      const { userId } = req.body;

      if (!projectId || !taskId || !userId || 
          typeof projectId !== 'string' || typeof taskId !== 'string' || typeof userId !== 'string') {
        res.status(400).json({ error: 'Invalid projectId, taskId, or userId' });
        return;
      }

      if (!this.isValidId(projectId) || !this.isValidId(taskId) || !this.isValidId(userId)) {
        res.status(400).code({ error: 'Invalid ID format' });
        return;
      }

      const compositeId = `${projectId}:${taskId}`;
      
      // Verify task exists
      const existingTask = await this.taskService.getTask(compositeId);
      if (!existingTask) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      // Update task assignee
      await this.taskService.updateTask(compositeId, { assigneeId: userId });

      // Create assignment record
      const assignment = await this.assignmentService.completeAssignment({
        userId,
        taskId: compositeId,
        status: 0 // PENDING
      });

      res.status(201).json(assignment);
    } catch (error) {
      this.handleError(res, error, 'Failed to assign task');
    }
  }

  /**
   * Changes the status of a task with validation for valid status transitions.
   * @param req Express request object containing projectId and taskId in params, new status in body
   * @param res Express response object
   */
  async changeStatus(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, taskId } = req.params;
      const { status } = req.body;

      if (!projectId || !taskId || !status || 
          typeof projectId !== 'string' || typeof taskId !== 'string' || typeof status !== 'string') {
        res.status(400).json({ error: 'Invalid projectId, taskId, or status' });
        return;
      }

      if (!this.isValidId(projectId) || !this.isValidId(taskId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
        res.status(400).json({ error: 'Invalid status value' });
        return;
      }

      const compositeId = `${projectId}:${taskId}`;
      const currentTask = await this.taskService.getTask(compositeId);
      
      if (!currentTask) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      // Status transition rules
      const validTransitions: Record<TaskStatus, TaskStatus[]> = {
        [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
        [TaskStatus.IN_PROGRESS]: [TaskStatus.DONE, TaskStatus.CANCELLED, TaskStatus.TODO],
        [TaskStatus.DONE]: [TaskStatus.IN_PROGRESS],
        [TaskStatus.CANCELLED]: [TaskStatus.TODO]
      };

      const currentStatus = currentTask.status || TaskStatus.TODO;
      const newStatus = status as TaskStatus;

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        res.status(400).json({ 
          error: `Invalid status transition from ${currentStatus} to ${newStatus}` 
        });
        return;
      }

      const task = await this.taskService.updateTask(compositeId, { status: newStatus });
      res.json(task);
    } catch (error) {
      this.handleError(res, error, 'Failed to change task status');
    }
  }

  /**
   * Validates if an ID string contains only alphanumeric characters, hyphens, and underscores.
   * @param id The ID string to validate
   * @returns true if the ID is valid, false otherwise
   */
  private isValidId(id: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(id);
  }

  /**
   * Handles errors by logging them and sending appropriate error responses.
   * @param res Express response object
   * @param error The error that occurred
   * @param message A descriptive message for the error
   */
  private handleError(res: Response, error: unknown, message: string): void {
    console.error(`${message}:`, error);
    if (error instanceof Error) {
      res.status(500).json({ error: message, details: error.message });
    } else {
      res.status(500).json({ error: message });
    }
  }
}
