import { Project } from './project';
import { ProjectRepository } from './project-repository';
import { TaskflowException } from '../core/taskflow-exception';
import { IdGenerator } from '../core/id-generator';

export interface CreateProjectProps {
  name: string;
  userId: string;
}

export interface UpdateProjectProps {
  name?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Handles all project‐related operations.
 */
export class ProjectService {
  private readonly idGenerator = new IdGenerator('project');

  constructor(private readonly projectRepository: ProjectRepository) {}

  /**
   * Creates a new project for the given user.
   *
   * @param props - Creation properties
   * @returns The newly created project
   * @throws {TaskflowException} If name is invalid or duplicate
   */
  async createProject(props: CreateProjectProps): Promise<Project> {
    if (!props.name || typeof props.name !== 'string' || props.name.trim().length === 0) {
      throw new TaskflowException('INVALID_PROJECT_NAME', 'INVALID_PROJECT_NAME');
    }
    this.validateUserId(props.userId);

    const existing = await this.projectRepository.findByUserId(props.userId);
    const duplicate = existing.find(p => p.name === props.name);
    if (duplicate) {
      throw new TaskflowException('PROJECT_NAME_EXISTS', 'PROJECT_NAME_EXISTS');
    }

    const project = new Project({
      id: this.idGenerator.next(),
      name: props.name.trim(),
      userId: props.userId,
      status: 'draft',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.projectRepository.create(project);
    return project;
  }

  /**
   * Retrieves a single project by id.
   *
   * @param id - Project id
   * @returns The requested project
   * @throws {TaskflowException} If id is invalid or project not found
   */
  async getProject(id: string): Promise<Project> {
    this.validateId(id);
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new TaskflowException('PROJECT_NOT_FOUND', 'PROJECT_NOT_FOUND');
    }
    return project;
  }

  /**
   * Retrieves all projects owned by a user.
   *
   * @param userId - User id
   * @returns Array of projects
   * @throws {TaskflowException} If userId is invalid
   */
  async getProjectsByUser(userId: string): Promise<Project[]> {
    this.validateUserId(userId);
    return this.projectRepository.findByUserId(userId);
  }

  /**
   * Updates an existing project.
   *
   * @param id - Project id
   * @param props - Update properties
   * @returns Updated project
   * @throws {TaskflowException} If id is invalid, project not found, or name conflict
   */
  async updateProject(id: string, props: UpdateProjectProps): Promise<Project> {
    this.validateId(id);
    const project = await this.getProject(id);

    if (props.name !== undefined) {
      const trimmed = props.name.trim();
      if (trimmed.length === 0) {
        throw new TaskflowException('INVALID_PROJECT_NAME', 'INVALID_PROJECT_NAME');
      }
      const userProjects = await this.projectRepository.findByUserId((project as any).userId);
      const duplicate = userProjects.find(p => p.id !== id && p.name === trimmed);
      if (duplicate) {
        throw new TaskflowException('PROJECT_NAME_EXISTS', 'PROJECT_NAME_EXISTS');
      }
      project.rename(trimmed);
    }

    if (props.metadata !== undefined) {
      project.updateMetadata(props.metadata);
    }

    await this.projectRepository.update(project);
    return project;
  }

  /**
   * Permanently deletes a project.
   *
   * @param id - Project id
   * @throws {TaskflowException} If id is invalid or project not found
   */
  async deleteProject(id: string): Promise<void> {
    this.validateId(id);
    const exists = await this.projectRepository.exists(id);
    if (!exists) {
      throw new TaskflowException('PROJECT_NOT_FOUND', 'PROJECT_NOT_FOUND');
    }
    await this.projectRepository.delete(id);
  }

  /**
   * Activates a project (status becomes 'active').
   *
   * @param id - Project id
   * @returns Activated project
   * @throws {Taskflow} If id is invalid or project not found
   */
  async activateProject(id: string): Promise<Project> {
    const project = await this.getProject(id);
    project.activate();
    await this.projectRepository.update(project);
    return project;
  }

  /**
   * Pauses a project (status becomes 'paused').
   *
   * @param id - Project id
   * @returns Paused project
   * * @throws {TaskflowException} If id is invalid or project not found
   */
  async pauseProject(id: string): Promise<Project> {
    const project = await this.getProject(id);
    project.pause();
    await this.projectRepository.update(project);
    return project;
  }

  /**
   * Completes a project (status becomes 'completed').
   *
   * @param id - Project id
   * @returns Completed project
   * @throws {TaskflowException} If id is invalid or project not found
   */
  async completeProject(id: string): Promise<Project> {
    const project = await this.getProject(id);
    project.complete();
    await this.projectRepository.update(project);
    return project;
  }

  /**
   * Archives a project (status becomes 'archived').
   *
   * @param id - Project id
   * @returns Archived project
   * @throws {TaskflowException} If id is invalid or project not found
   */
  async archiveProject(id: string): Promise<Project> {
    const project = await this.getProject(id);
    project.archive();
    await this.projectRepository.update(project);
    return project;
  }

  /**
   * Validates a generic id.
   *
   * @private
   * @param id - Id to validate
   * @throws {TaskflowException} If invalid
   */
  private validateId(id: string): void {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new TaskflowException('INVALID_ID', 'INVALID_ID');
    }
  }

  /**
   * Validates a user id.
   *
   * @private
   * @param userId - User id to validate
   * @throws {TaskflowException} If invalid
   */
  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new TaskflowException('INVALID_USER_ID', 'INVALID_USER_ID');
    }
  }
}
