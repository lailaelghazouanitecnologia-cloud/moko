import { TaskflowException } from '../core/taskflow-exception';
import { Project } from './project';

export interface ProjectRepository {
  /**
   * Retrieves a single project by its unique identifier.
   * @param id - The unique identifier of the project.
   * @returns A promise that resolves to the project or null if not found.
   * @throws {TaskflowException} If the provided id is invalid.
   */
  findById(id: string): Promise<Project | null>;

  /**
   * Retrieves all projects.
   * @returns A promise that resolves to an array of all projects.
   */
  findAll(): Promise<Project[]>;

  /**
   * Retrieves all projects with the specified status.
   * @param status - The status to filter by.
   * @returns A promise that resolves to an array of matching projects.
   * @throws {TaskflowException} If the provided status is invalid.
   */
  findByStatus(status: ProjectStatus): Promise<Project[]>;

  /**
   * Retrieves all projects owned by the specified user.
   * @param userId - The unique identifier of the user.
   * @returns A promise that resolves to an array of matching projects.
   * @throws {TaskflowException} If the provided userId is invalid.
   */
  findByUserId(userId: string): Promise<Project[]>;

  /**
   * Creates a new project.
   * @param project - The project to create.
   * @returns A promise that resolves to the created project.
   * @throws {TaskflowException} If a project with the same id already exists or the project data is invalid.
   */
  create(project: Project): Promise<Project>;

  /**
   * Updates an existing project.
   * @param project - The project with updated data.
   * @returns A promise that resolves to the updated project.
   * @throws {TaskflowException} If the project does not exist or the project data is invalid.
   */
  update(project: Project): Promise<Project>;

  /**
   * Deletes a project by its unique identifier.
   * @param id - The unique identifier of the project to delete.
   * @returns A promise that resolves when the project is deleted.
   * @throws {TaskflowException} If the project does not exist or the id is invalid.
   */
  delete(id: string): Promise<void>;

  /**
   * Checks if a project exists by its unique identifier.
   * @param id - The unique identifier of the project.
   * @returns A promise that resolves to true if the project exists, false otherwise.
   * @throws {TaskflowException} If the provided id is invalid.
   */
  exists(id: string): Promise<boolean>;

  /**
   * Counts the total number of projects.
   * @returns A promise that resolves to the total count.
   */
  count(): Promise<number>;

  /**
   * Counts the number of projects with the specified status.
   * @param status - The status to filter by.
   * @returns A promise that resolves to the count of matching projects.
   * @throws {TaskflowException} If the provided status is invalid.
   */
  countByStatus(status: ProjectStatus): Promise<number>;
}

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects: Map<string, Project> = new Map();

  async findById(id: string): Promise<Project | null> {
    this.validateId(id);
    const project = this.projects.get(id);
    return project ? this.cloneProject(project) : null;
  }

  async findAll(): Promise<Project[]> {
    return Array.from(this.projects.values()).map(p => this.cloneProject(p));
  }

  async findByStatus(status: ProjectStatus): Promise<Project[]> {
    this.validateStatus(status);
    return Array.from(this.projects.values())
      .filter(p => p.status === status)
      .map(p => this.cloneProject(p));
  }

  async findByUserId(userId: string): Promise<Project[]> {
    this.validateUserId(userId);
    return Array.from(this.projects.values())
      .filter(p => p.metadata?.ownerId === userId)
      .map(p => this.cloneProject(p));
  }

  async create(project: Project): Promise<Project> {
    if (!project) {
      throw new TaskflowException('Project is required', 'INVALID_PROJECT', { reason: 'Project is required' });
    }
    this.validateProject(project);
    if (this.projects.has(project.id)) {
      throw new TaskflowException('Project already exists', 'PROJECT_EXISTS', { id: project.id });
    }
    this.projects.set(project.id, this.cloneProject(project));
    return this.cloneProject(project);
  }

  async update(project: Project): Promise<Project> {
    if (!project) {
      throw new TaskflowException('Project is required', 'INVALID_PROJECT', { reason: 'Project is required' });
    }
    this.validateProject(project);
    if (!this.projects.has(project.id)) {
      throw new TaskflowException('Project not found', 'PROJECT_NOT_FOUND', { id: project.id });
    }
    this.projects.set(project.id, this.cloneProject(project));
    return this.cloneProject(project);
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);
    if (!this.projects.has(id)) {
      throw new TaskflowException('Project not found', 'PROJECT_NOT_FOUND', { id });
    }
    this.projects.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    this.validateId(id);
    return this.projects.has(id);
  }

  async count(): Promise<number> {
    return this.projects.size;
  }

  async countByStatus(status: ProjectStatus): Promise<number> {
    this.validateStatus(status);
    return Array.from(this.projects.values()).filter(p => p.status === status).length;
  }

  private cloneProject(project: Project): Project {
    return new Project(
      project.id,
      project.name,
      project.status,
      { ...project.metadata },
      new Date(project.createdAt),
      new Date(project.updatedAt)
    );
  }

  private validateId(id: string): void {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new TaskflowException('Invalid id', 'INVALID_ID', { id });
    }
  }

  private validateStatus(status: ProjectStatus): void {
    if (!Object.values(ProjectStatus).includes(status)) {
      throw new TaskflowException('Invalid status', 'INVALID_STATUS', { status });
    }
  }

  private validateUserId(userId: string): void {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new TaskflowException('Invalid user id', 'INVALID_USER_ID', { userId });
    }
  }

  private validateProject(project: Project): void {
    if (typeof project.id !== 'string' || project.id.trim().length === 0) {
      throw new TaskflowException('Invalid project', 'INVALID_PROJECT', { reason: 'Project id is invalid' });
    }
    if (typeof project.name !== 'string' || project.name.trim().length === 0) {
      throw new TaskflowException('Invalid project', 'INVALID_PROJECT', { reason: 'Project name is invalid' });
    }
    if (!Object.values(ProjectStatus).includes(project.status)) {
      throw new TaskflowException('Invalid project', 'INVALID_PROJECT', { reason: 'Project status is invalid' });
    }
    if (!(project.createdAt instanceof Date) || isNaN(project.createdAt.getTime())) {
      throw new TaskflowException('Invalid project', 'INVALID_PROJECT', { reason: 'Project createdAt is invalid' });
    }
    if (!(project.updatedAt instanceof Date) || isNaN(project.updatedAt.getTime())) {
      throw new TaskflowException('Invalid project', 'INVALID_PROJECT', { reason: 'Project updatedAt is invalid' });
    }
  }
}

export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export interface ProjectMetadata {
  ownerId?: string;
  description?: string;
  tags?: string[];
  [key: string]: unknown;
}
