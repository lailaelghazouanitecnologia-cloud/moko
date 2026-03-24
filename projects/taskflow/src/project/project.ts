import { ProjectStatus } from './project-repository';
import { ProjectMetadata } from './project-repository';

/**
 * Represents a project with a lifecycle and associated metadata.
 */
export class Project {
  public readonly id: string;
  public name: string;
  public status: ProjectStatus;
  public metadata: ProjectMetadata;
  public createdAt: Date;
  public updatedAt: Date;

  /**
   * Creates a new Project instance.
   * @param id - Unique identifier for the project.
   * @param name - Human-readable name of the project.
   * @param status - Initial status of the project (defaults to DRAFT).
   * @param metadata - Optional metadata associated with the project.
   * @param createdAt - Timestamp when the project was created (defaults to now).
   * @param updatedAt - Timestamp when the project was last updated (defaults to now).
   * @throws {Error} If id or name is empty or invalid.
   */
  constructor(
    id: string,
    name: string,
    status: ProjectStatus = ProjectStatus.DRAFT,
    metadata: ProjectMetadata = {},
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    this.validateId(id);
    this.validateName(name);
    this.validateDates(createdAt, updatedAt);

    this.id = id;
    this.name = name;
    this.status = status;
    this.metadata = { ...metadata };
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Activates the project if allowed by the current status.
   * @throws {Error} If the project is already active, completed, or archived.
   */
  public activate(): void {
    if (this.status === ProjectStatus.ACTIVE) {
      throw new Error('Project is already active');
    }
    if (this.status === ProjectStatus.COMPLETED) {
      throw new Error('Cannot activate a completed project');
    }
    if (this.status === ProjectStatus.ARCHIVED) {
      throw new Error('Cannot activate an archived project');
    }
    this.status = ProjectStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  /**
   * Pauses the project if it is currently active.
   * @throws {Error} If the project is not active.
   */
  public pause(): void {
    if (this.status !== ProjectStatus.ACTIVE) {
      throw new Error('Only active projects can be paused');
    }
    this.status = ProjectStatus.PAUSED;
    this.updatedAt = new Date();
  }

  /**
   * Completes the project if allowed by the current status.
   * @throws {Error} If the project is already completed or archived.
   */
  public complete(): void {
    if (this.status === ProjectStatus.COMPLETED) {
      throw new Error('Project is already completed');
    }
    if (this.status === ProjectStatus.ARCHIVED) {
      throw new Error('Cannot complete an archived project');
    }
    this.status = ProjectStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  /**
   * Archives the project if it is not already archived.
   * @throws {Error} If the project is already archived.
   */
  public archive(): void {
    if (this.status === ProjectStatus.ARCHIVED) {
      throw new Error('Project is already archived');
    }
    this.status = ProjectStatus.ARCHIVED;
    this.updatedAt = new Date();
  }

  /**
   * Updates the project metadata by merging the provided partial metadata.
   * @param metadata - Partial metadata to merge into the existing metadata.
   * @throws {Error} If metadata is not a plain object.
   */
  public updateMetadata(metadata: Partial<ProjectMetadata>): void {
    if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
      throw new Error('Metadata must be a plain object');
    }
    this.metadata = { ...this.metadata, ...metadata };
    this.updatedAt = new Date();
  }

  /**
   * Renames the project.
   * @param newName - The new name for the project.
   * @throws {Error} If newName is empty or invalid.
   */
  public rename(newName: string): void {
    this.validateName(newName);
    this.name = newName;
    this.updatedAt = new Date();
  }

  /**
   * Checks if the project is in an editable state (DRAFT or PAUSED).
   * @returns True if the project can be edited.
   */
  public isEditable(): boolean {
    return this.status === ProjectStatus.DRAFT || this.status === ProjectStatus.PAUSED;
  }

  /**
   * Returns a plain object representation of the project.
   * @returns Plain object with all project fields.
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      metadata: { ...this.metadata },
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Validates the project identifier.
   * @param id - The identifier to validate.
   * @throws {Error} If id is empty or not a string.
   */
  private validateId(id: string): void {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Project id must be a non-empty string');
    }
  }

  /**
   * Validates the project name.
   * @param name - The name to validate.
   * @throws {Error} If name is empty or not a string.
   */
  private validateName(name: string): void {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Project name must be a non-empty string');
    }
  }

  /**
   * Validates the createdAt and updatedAt dates.
   * @param createdAt - The creation date.
   * @param updatedAt - The last update date.
   * @throws {Error} If dates are invalid or updatedAt is before createdAt.
   */
  private validateDates(createdAt: Date, updatedAt: Date): void {
    if (!(createdAt instanceof Date) || isNaN(createdAt.getTime())) {
      throw new Error('createdAt must be a valid Date');
    }
    if (!(updatedAt instanceof Date) || isNaN(updatedAt.getTime())) {
      throw new Error('updatedAt must be a valid Date');
    }
    if (updatedAt < createdAt) {
      throw new Error('updatedAt cannot be earlier than createdAt');
    }
  }
}