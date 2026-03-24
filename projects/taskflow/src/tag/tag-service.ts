import { IdGenerator } from '../core/id-generator';
import { Tag } from './tag';
import { TagRepository } from './tag-repository';
import { TaskflowException } from '../core/taskflow-exception';

/**
 * Business‐logic service for tag operations.
 */
export class TagService {
  private repository: TagRepository;

  /** Maximum allowed depth of the tag hierarchy. */
  static readonly MAX_DEPTH = 10;

  /** Names that cannot be used for tags. */
  static readonly RESERVED_NAMES = ['system', 'root', 'null', 'undefined'];

  constructor(repository: TagRepository) {
    if (!repository) {
      throw new TaskflowException('INVALID_REPOSITORY', undefined, {});
    }
    this.repository = repository;
  }

  /**
   * Create a new tag.
   * @param name Tag name (required, trimmed, unique, not reserved).
   * @param parentId Optional parent tag id.
   * @returns The newly created tag.
   * @throws {TaskflowException} on validation or persistence failure.
   */
  async createTag(name: string, parentId?: string): Promise<Tag> {
    this.validateName(name);
    const trimmedName = name.trim();
    const normalizedName = trimmedName.toLowerCase();

    if (TagService.RESERVED_NAMES.includes(normalizedName)) {
      throw new TaskflowException('RESERVED_NAME', undefined, { name: trimmedName });
    }

    const existing = await this.repository.findByName(trimmedName);
    if (existing) {
      throw new TaskflowException('DUPLICATE_NAME', undefined, { name: trimmedName });
    }

    if (parentId) {
      await this.validateParentForCreate(parentId);
    }

    const id = IdGenerator.uuid();
    const tag = new Tag(id, trimmedName, parentId);
    await this.repository.save(tag);
    return tag;
  }

  /**
   * Update an existing tag.
   * @param id Tag identifier.
   * @param updates Partial tag properties to update.
   * @returns Updated tag.
   * @throws {TaskflowException} if tag not found, name invalid, duplicate, etc.
   */
  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
    if (!id) throw new TaskflowException('INVALID_ID', undefined, { id });

    const tag = await this.repository.findById(id);
    if (!tag) throw new TaskflowException('TAG_NOT_FOUND', undefined, { id });

    if (updates.name !== undefined) {
      this.validateName(updates.name);
      const trimmedName = updates.name.trim();
      const normalizedName = trimmedName.toLowerCase();

      if (TagService.RESERVED_NAMES.includes(normalizedName)) {
        throw new TaskflowException('RESERVED_NAME', undefined, { name: trimmedName });
      }

      const existing = await this.repository.findByName(trimmedName);
      if (existing && existing.id !== id) {
        throw new TaskflowException('DUPLICATE_NAME', undefined, { name: trimmedName });
      }
      tag.rename(trimmedName);
    }

    if (updates.color !== undefined) {
      tag.setColor(updates.color);
    }

    await this.repository.save(tag);
    return tag;
  }

  /**
   * Delete a tag (only if it has no children).
   * @param id Tag identifier.
   * @throws {TaskflowException} if tag not found or has children.
   */
  async deleteTag(id: string): Promise<void> {
    if (!id) throw new TaskflowException('INVALID_ID', undefined, { id });

    const tag = await this.repository.findById(id);
    if (!tag) throw new TaskflowException('TAG_NOT_FOUND', undefined, { id });

    const children = await this.repository.findChildren(id);
    if (children.length > 0) {
      throw new TaskflowException('HAS_CHILDREN', undefined, { id, children: children.length });
    }

    await this.repository.delete(id);
  }

  /**
   * Build a forest of tag trees (only root tags returned).
   * @returns Array of root tags.
   */
  async getTagTree(): Promise<Tag[]> {
    const allTags = await this.repository.findAll();
    const roots = allTags.filter(t => !t.parentId);
    return roots;
  }

  /**
   * Search tags by name substring (case‐insensitive).
   * @param query Search text.
   * @returns Array of matched tags.
   */
  async searchTags(query: string): Promise<Tag[]> {
    if (!query || query.trim().length === 0) return [];
    const normalizedQuery = query.trim().toLowerCase();
    const allTags = await this.repository.findAll();
    return allTags.filter(tag => tag.name.toLowerCase().includes(normalizedQuery));
  }

  /**
   * Get path of tag names from root to tag.
   * @param id Tag identifier.
   * @returns Array of names from root to tag.
   * @throws {TaskflowException} if tag not found.
   */
  async getPath(id: string): Promise<string[]> {
    if (!id) throw new TaskflowException('INVALID_ID', undefined, { id });

    const tag = await this.repository.findById(id);
    if (!tag) throw new TaskflowException('TAG_NOT_FOUND', undefined, { id });

    const path: string[] = [];
    let current: Tag | null = tag;

    while (current) {
      path.unshift(current.name);
      current = current.parentId ? await this.repository.findById(current.parentId) : null;
    }
    return path;
  }

  /**
   * Move a tag to a new parent (or root).
   * @param id Tag identifier.
   * @param newParentId New parent id (null for root).
   * @throws {TaskflowException} on circular reference, depth exceeded, etc.
   */
  async moveTag(id: string, newParentId: string | null): Promise<void> {
    if (!id) throw new TaskflowException('INVALID_ID', undefined, { id });

    const tag = await this.repository.findById(id);
    if (!tag) throw new TaskflowException('TAG_NOT_FOUND', undefined, { id });

    if (newParentId !== null) {
      if (newParentId === id) {
        throw new TaskflowException('CIRCULAR_REFERENCE', undefined, { id });
      }
      const newParent = await this.repository.findById(newParentId);
      if (!newParent) throw new TaskflowException('PARENT_NOT_FOUND', undefined, { parentId: newParentId });

      const wouldCreateCycle = await this.wouldCreateCycle(id, newParentId);
      if (wouldCreateCycle) {
        throw new TaskflowException('CIRCULAR_REFERENCE', undefined, { id, parentId: newParentId });
      }

      const depth = await this.getDepth(newParentId);
      if (depth >= TagService.MAX_DEPTH - 1) {
        throw new TaskflowException('MAX_DEPTH_EXCEEDED', undefined, { depth });
      }
    }

    tag.setParent(newParentId);
    await this.repository.save(tag);
  }

  /**
   * Merge source tag into target tag (children reparented).
   * @param sourceId Source tag identifier.
   * @param targetId Target tag identifier.
   * @throws {TaskflowException} if either tag not found or same tag.
   */
  async mergeTags(sourceId: string, targetId: string): Promise<void> {
    if (!sourceId || !targetId) throw new TaskflowException('INVALID_ID', undefined, undefined);
    if (sourceId === targetId) throw new TaskflowException('SAME_TAG', undefined, { sourceId, targetId });

    const [source, target] = await Promise.all([
      this.repository.findById(sourceId),
      this.repository.findById(targetId),
    ]);
    if (!source || !target) throw new TaskflowException('TAG_NOT_FOUND', undefined, undefined);

    const children = await this.repository.findChildren(sourceId);
    await Promise.all(children.map(child => {
      child.setParent(targetId);
      return this.repository.save(child);
    }));

    await this.repository.delete(sourceId);
  }

  /**
   * Get basic statistics: total count and max depth.
   * @returns Object with total and maxDepth.
   */
  async getStatistics(): Promise<{ total: number; maxDepth: number }> {
    const allTags = await this.repository.findAll();
    let maxDepth = 0;
    for (const tag of allTags) {
      const depth = await this.getDepth(tag.id);
      maxDepth = Math.max(maxDepth, depth);
    }
    return { total: allTags.length, maxDepth: maxDepth + 1 };
  }

  /* ------------------------------------------------------------------ */
  /*                           Private helpers                            */
  /* ------------------------------------------------------------------ */

  private validateName(name: unknown): asserts name is string {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new TaskflowException('INVALID_NAME', undefined, { name });
    }
  }

  private async validateParentForCreate(parentId: string): Promise<void> {
    const exists = await this.repository.exists(parentId);
    if (!exists) throw new TaskflowException('PARENT_NOT_FOUND', undefined, { parentId });

    const depth = await this.getDepth(parentId);
    if (depth >= TagService.MAX_DEPTH - 1) {
      throw new TaskflowException('MAX_DEPTH_EXCEEDED', undefined, { depth });
    }
  }

  private async getDepth(id: string): Promise<number> {
    let depth = 0;
    let current: Tag | null = await this.repository.findById(id);
    while (current && current.parentId) {
      depth++;
      current = await this.repository.findById(current.parentId);
    }
    return depth;
  }

  private async wouldCreateCycle(tagId: string, newParentId: string): Promise<boolean> {
    let current: Tag | null = await this.repository.findById(newParentId);
    while (current) {
      if (current.id === tagId) return true;
      current = current.parentId ? await this.repository.findById(current.parentId) : null;
    }
    return false;
  }
}
