/**
 * Base entity with identity.
 */
export interface Entity {
  /**
   * Unique identifier for this entity.
   */
  readonly id: string;

  /**
   * Compares this entity with another for equality based on their identifiers.
   * @param other - The entity to compare against.
   * @returns `true` if both entities have the same identifier; otherwise `false`.
   * @throws {TypeError} If `other` is not a valid object or lacks an `id` property.
   */
  equals(other: Entity): boolean;
}

/**
 * Concrete implementation of the Entity interface.
 * Provides utility methods for identity management and equality checks.
 */
export class BaseEntity implements Entity {
  public readonly id: string;

  /**
   * Creates a new BaseEntity instance.
   * @param id - Unique identifier for the entity.
   * @throws {Error} If `id` is empty, null, or undefined.
   */
  constructor(id: string) {
    if (!id || typeof id !== 'string') {
      throw new Error('Entity id must be a non-empty string');
    }
    this.id = id;
  }

  /**
   * Compares this entity with another for equality based on their identifiers.
   * @param other - The entity to compare against.
   * @returns `true` if both entities have the same identifier; otherwise `false`.
   * @throws {TypeError} If `other` is not a valid object or lacks an `id` property.
   */
  public equals(other: Entity): boolean {
    if (!other || typeof other !== 'object') {
      throw new TypeError('Comparison target must be an object');
    }
    if (typeof other.id !== 'string') {
      throw new TypeError('Comparison target must have a string id');
    }
    return this.id === other.id;
  }

  /**
   * Generates a string representation of the entity.
   * @returns A string in the format `Entity(id)`.
   */
  public toString(): string {
    return `Entity(${this.id})`;
  }

  /**
   * Generates a hash code for the entity based on its id.
   * @returns A numeric hash code.
   */
  public hashCode(): number {
    return this.privateHashString(this.id);
  }

  /**
   * Private helper to compute a simple hash for a string.
   * @param str - The string to hash.
   * @returns A numeric hash code.
   */
  private privateHashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
