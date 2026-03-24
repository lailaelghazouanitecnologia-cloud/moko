import { Request, Response } from 'express';
import { ProjectService } from '../project/project-service';
import { CreateProjectProps, UpdateProjectProps } from '../project/project-service';

/**
 * Controller handling HTTP requests for project CRUD operations.
 */
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * Creates a new project.
   * @param req - Express request object containing project details in body
   * @param res - Express response object
   */
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const { name, userId } = req.body as CreateProjectProps;

      if (!this.isValidString(name)) {
        res.status(400).json({ error: 'Name is required and must be a non-empty string' });
        return;
      }

      if (!this.isValidString(userId)) {
        res.status(400).json({ error: 'User ID is required and must be a non-empty string' });
        return;
      }

      const project = await this.projectService.createProject({ name: name.trim(), userId });
      res.status(201).json(project);
    } catch (error) {
      this.handleError(res, error, 'Failed to create project');
    }
  }

  /**
   * Retrieves a single project by ID.
   * @param req - Express request object containing project ID in params
   * @param res - Express response object
   */
  async getProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!this.isValidString(id)) {
        res.status(400).json({ error: 'Invalid project ID' });
        return;
      }

      const project = await this.projectService.getProject(id);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.status(200).json(project);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve project');
    }
  }

  /**
   * Updates an existing project.
   * @param req - Express request object containing project ID in params and update data in body
   * @param res - Express response object
   */
  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body as UpdateProjectProps;

      if (!this.isValidString(id)) {
        res.status(400).json({ error: 'Invalid project ID' });
        return;
      }

      if (!this.hasValidUpdateData(updateData)) {
        res.status(400).json({ error: 'Update data must include at least one valid field (name or metadata)' });
        return;
      }

      const project = await this.projectService.updateProject(id, updateData);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.status(200).json(project);
    } catch (error) {
      this.handleError(res, error, 'Failed to update project');
    }
  }

  /**
   * Deletes a project by ID.
   * @param req - Express request object containing project ID in params and optional soft delete flag in query
   * @param res - Express response object
   */
  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { soft = 'true' } = req.query;

      if (!this.isValidString(id)) {
        res.status(400).json({ error: 'Invalid project ID' });
        return;
      }

      const isSoftDelete = soft === 'false' ? false : true;
      const success = await this.projectService.deleteProject(id);

      res.status(204).send();
    } catch (error) {
      this.handleError(res, error, 'Failed to delete project');
    }
  }

  /**
   * Lists projects with optional filtering and pagination.
   * @param req - Express request object containing query parameters for filtering
   * @param res - Express response object
   */
  async listProjects(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '10', status, userId } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      if (!this.isValidPage(pageNum)) {
        res.status(400).json({ error: 'Invalid page number' });
        return;
      }

      if (!this.isValidLimit(limitNum)) {
        res.status(400).json({ error: 'Invalid limit value (must be between 1 and 100)' });
        return;
      }

      const filters = {
        status: status as string,
        userId: userId as string,
        page: pageNum,
        limit: limitNum
      };

      const result = await this.projectService.getProjectsByUser(filters.userId);
      res.status(200).json({ data: result, total: result.length });
    } catch (error) {
      this.handleError(res, error, 'Failed to list projects');
    }
  }

  /**
   * Adds a member to a project.
   * @param req - Express request object containing project ID in params and user details in body
   * @param res - Express response object
   */
  async addMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, role = 'member' } = req.body;

      if (!this.isValidString(id)) {
        res.status(400).json({ error: 'Invalid project ID' });
        return;
      }

      if (!this.isValidString(userId)) {
        res.status(400).json({ error: 'User ID is required and must be a non-empty string' });
        return;
      }

      res.status(501).json({ error: 'Not implemented' });
    } catch (error) {
      this.handleError(res, error, 'Failed to add member to project');
    }
  }

  /**
   * Removes a member from a project.
   * @param req - Express request object containing project ID in params and user ID in body
   * @param res - Express response object
   */
  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!this.isValidString(id)) {
        res.status(400).json({ error: 'Invalid project ID' });
        return;
      }

      if (!this.isValidString(userId)) {
        res.status(400).json({ error: 'User ID is required and must be a non-empty string' });
        return;
      }

      res.status(501).json({ error: 'Not implemented' });
    } catch (error) {
      this.handleError(res, error, 'Failed to remove member from project');
    }
  }

  /**
   * Validates if a value is a non-empty string.
   * @param value - Value to validate
   * @returns True if valid string, false otherwise
   */
  private isValidString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Checks if update data contains at least one valid field.
   * @param data - Update data object
   * @returns True if valid update data, false otherwise
   */
  private hasValidUpdateData(data: UpdateProjectProps): boolean {
    return data && (
      (data.name !== undefined && this.isValidString(data.name)) ||
      data.metadata !== undefined
    );
  }

  /**
   * Validates page number.
   * @param page - Page number
   * @returns True if valid page, false otherwise
   */
  private isValidPage(page: number): boolean {
    return Number.isInteger(page) && page >= 1;
  }

  /**
   * Validates limit value.
   * @param limit - Limit value
   * @returns True if valid limit, false otherwise
   */
  private isValidLimit(limit: number): boolean {
    return Number.isInteger(limit) && limit >= 1 && limit <= 100;
  }

  /**
   * Handles errors and sends appropriate response.
   * @param res - Express response object
   * @param error - Error object
   * @param message - Default error message
   */
  private handleError(res: Response, error: unknown, message: string): void {
    if (error instanceof Error && error.message.includes('validation')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: message });
    }
  }
}
