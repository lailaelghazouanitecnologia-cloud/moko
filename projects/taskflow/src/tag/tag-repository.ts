import { Tag } from './tag';
import { TaskflowException } from '../core/taskflow-exception';

/**
 * Repository interface for managing tags.
 * Provides data access operations for tag entities.
 */
export interface TagRepository {
  /**
   * Creates or updates a tag in the repository.
   * @param tag The tag to save
   * @throws {TaskflowException} If the tag is invalid or save fails
   */
  save(tag: Tag): Promise<void>;

  /**
   * Finds a tag by its unique identifier.
   * @param id The UUID of the tag to find
   * @returns The tag if found, null otherwise
   * @throws {TaskcodeException} If the id is invalid
   */
  findById(id: string): Promise<Tag | null>;

  /**
   * Finds a tag by its name (case-insensitive).
   * @param name The name of the tag to find
   * @returns The tag if found, null otherwise
   * @throws {TaskflowException} If the name is invalid
   */
  findByName(name: string): Promise<Tag | null>;

  /**
   * Retrieves all tags from the repository.
   * @returns Array of all tags
   */
  findAll(): Promise<Tag[]>;

  /**
   * Finds all direct children of a parent tag.
   * @param parentId The UUID of the parent tag
   * @returns Array of child tags
   * @throws {TaskflowException} If the parentId is invalid
   */
  findChildren(parentId: string): Promise<Tag[]>;

  /**
   * Deletes a tag from the repository.
   * @param id The UUID of the tag to delete
   * @throws {TaskflowException} If the tag doesn't exist or has children
   */
  delete(id: string): Promise<void>;

  /**
   * Checks if a tag exists in the repository.
   * @param id The UUID of the tag to check
   * @returns True if the tag exists, false otherwise
   * @throws {TaskflowException} If the id is invalid
   */
  exists(id: string): Promise<boolean>;
}

/**
 * In-memory implementation of TagRepository.
 * Stores tags in a Map for fast lookups.
 */
export class InMemoryTagRepository implements TagRepository {
  private tags: Map<string, Tag> = new Map();

  /**
   * Creates or updates a tag in the repository.
   * @param tag The tag to save
   * @throws {TaskflowException} If the tag is invalid
   */
  async save(tag: Tag): Promise<void> {
    this.validateTag(tag);
    this.tags.set(tag.id, tag);
  }

  /**
   * Finds a tag by its unique identifier.
   * @param id The UUID of the tag to find
   * @returns The tag if found, null otherwise
   * @throws {TaskflowException} If the id is invalid
   */
  async findById(id: string): Promise<Tag | null> {
    this.validateId(id);
    return this.tags.get(id) || null;
  }

  /**
   * Finds a tag by its name (case-insensitive).
   * @param name The name of the tag to find
   * @returns The tag if found, null otherwise
   * @throws {TaskflowException} If the name is invalid
   */
  async findByName(name: string): Promise<Tag | null> {
    this.validateName(name);
    const normalizedName = name.toLowerCase();
    for (const tag of this.tags.values()) {
      if (tag.name.toLowerCase() === normalizedName) {
        return tag;
      }
    }
    return null;
  }

  /**
   * Retrieves all tags from the repository.
   * @returns Array of all tags
   */
  async findAll(): Promise<Tag[]> {
    return Array.from(this.tags.values());
  }

  /**
   * Finds all direct children of a parent tag.
   * @param parentId The UUID of the parent tag
   * @returns Array of child tags
   * @throws {TaskflowException} If the parentId is invalid
   */
  async findChildren(parentId: string): Promise<Tag[]> {
    this.validateId(parentId);
    const children: Tag[] = [];
    for (const tag of this.tags.values()) {
      if (tag.parentId === parentId) {
        children.push(tag);
      }
    }
    return children;
  }

  /**
   * Deletes a tag from the repository.
   * @param id The UUID of the tag to delete
   * @throws {TaskflowException} If the tag doesn't exist or has children
   */
  async delete(id: string): Promise<void> {
    this.validateId(id);
    const tag = this.tags.get(id);
    if (!tag) {
      throw new TaskflowException('TAG_NOT_FOUND', 'TAG_NOT_FOUND', { id });
    }
    
    // Check for children
    const hasChildren = await this.hasChildren(id);
    if (hasChildren) {
      throw new TaskflowException('TAG_HAS_CHILDREN', 'TAG_HAS_CHILDREN', { id });
    }
    
    this.tags.delete(id);
  }

  /**
   * Checks if a tag exists in the repository.
   * @param id The UUID of the tag to check
   * @returns True if the tag exists, false otherwise
   * @throws {TaskflowException} If the id is invalid
   */
  async exists(id: string): Promise<boolean> {
    this.validateId(id);
    return this.tags.has(id);
  }

  /**
   * Checks if a tag has any children.
   * @param parentId The UUID of the parent tag
   * @returns True if the tag has children, false otherwise
   * @private
   */
  private async hasChildren(parentId: string): Promise<boolean> {
    for (const tag of this.tags.values()) {
      if (tag.parentId === parentId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validates a tag object.
   * @param tag The tag to validate
   * @throws {TaskflowException} If the tag is invalid
   * @private
   */
  private validateTag(tag: Tag): void {
    if (!tag) {
      throw new TaskflowException('INVALID_TAG', 'INVALID_TAG', { reason: 'Tag is required' });
    }
    if (!tag.id || typeof tag.id !== 'string') {
      throw new TaskflowException('INVALID_TAG', 'INVALID_TAG', { reason: 'Tag ID must be a non-empty string' });
    }
    if (!tag.name || typeof tag.name !== 'string' || tag.name.trim().length === 0) {
      throw new TaskflowException('INVALID_TAG', 'INVALID_TAG', { reason: 'Tag name must be a non-empty string' });
    }
    if (tag.parentId !== null && tag.parentId !== undefined) {
      this.validateId(tag.parentId);
      if (tag.parentId === tag.id) {
        throw new TaskflowException('INVALID_TAG', 'INVALID_TAG', { reason: 'Tag cannot be its own parent' });
      }
    }
  }

  /**
   * Validates a UUID string.
   * @param id The UUID to validate
   * @throws {TaskflowException} If the id is invalid
   * @private
   */
  private validateId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new TaskflowException('INVALID_ID', 'INVALID_ID', { reason: 'ID must be a non-empty string' });
    }
    // Basic UUID format validation (8-4-4-4-12)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new TaskflowException('INVALID_ID', 'INVALID_ID', { reason: 'ID must be a valid UUID' });
    }
  }

  /**
   * Validates a tag name.
   * @param name The name to validate
   * @throws {TaskflowException} If the name is invalid
   * @private
   */
  private validateName(name: string): void {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new TaskflowException('INVALID_NAME', 'INVALID_NAME', { reason: 'Name must be a non-empty string' });
    }
    if (name.length > 100) {
      throw new TaskflowException('INVALID_NAME', 'INVALID_NAME', { reason: 'Name must not exceed 100 characters' });
    }
  }
}
