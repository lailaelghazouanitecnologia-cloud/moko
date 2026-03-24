import { IdGenerator } from '../core/id-generator';

/**
 * Represents a tag for categorization.
 */
export class Tag {
  public readonly id: string;
  public name: string;
  public parentId: string | null;
  public color: string;
  public createdAt: Date;
  public updatedAt: Date;

  /**
   * Initialize a new Tag instance.
   * @param id - Unique identifier for the tag. If not provided, a UUID will be generated.
   * @param name - Display name of the tag.
   * @param parentId - Optional identifier of the parent tag.
   * @throws {TypeError} If name is not a non-empty string.
   */
  constructor(id: string, name: string, parentId?: string) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new TypeError('Tag name must be a non-empty string');
    }

    this.id = id || IdGenerator.uuid();
    this.name = name.toLowerCase();
    this.parentId = parentId || null;
    this.color = '#ffffff';
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Rename the tag.
   * @param newName - New name for the tag.
   * @throws {TypeError} If newName is not a non-empty string.
   */
  rename(newName: string): void {
    if (typeof newName !== 'string' || newName.trim().length === 0) {
      throw new TypeError('New name must be a non-empty string');
    }
    this.name = newName.toLowerCase();
    this.updatedAt = new Date();
  }

  /**
   * Change the parent tag.
   * @param parentId - Identifier of the new parent tag, or null for root.
   */
  setParent(parentId: string | null): void {
    this.parentId = parentId;
    this.updatedAt = new Date();
  }

  /**
   * Update the tag's color.
   * @param color - Hex color code.
   * @throws {TypeError} If color is not a valid hex color.
   */
  setColor(color: string): void {
    if (!this.isValidHexColor(color)) {
      throw new TypeError('Color must be a valid hex color (e.g., #ffffff)');
    }
    this.color = color;
    this.updatedAt = new Date();
  }

  /**
   * Check if the tag is a root tag (no parent).
   * @returns True if the tag has no parent.
   */
  isRoot(): boolean {
    return this.parentId === null;
  }

  /**
   * Serialize the tag to a JSON-compatible object.
   * @returns Plain object with tag properties.
   */
  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      parentId: this.parentId,
      color: this.color,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  /**
   * Validate a hex color code.
   * @param color - Hex color string.
   * @returns True if valid hex color.
   */
  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }
}
