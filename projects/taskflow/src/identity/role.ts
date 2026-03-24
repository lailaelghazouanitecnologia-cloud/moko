import { IdGenerator } from '../core/id-generator';

export interface CreateRoleProps {
  name: string;
  description: string;
  permissions?: string[];
}

/**
 * Represents a role within the system, encapsulating a set of permissions.
 */
export class Role {
  public readonly id: string;
  public name: string;
  public description: string;
  public permissions: string[];
  public createdAt: Date;

  constructor(
    id: string,
    name: string,
    description: string,
    permissions: string[] = [],
    createdAt: Date = new Date()
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.permissions = permissions;
    this.createdAt = createdAt;
  }

  /**
   * Checks whether this role includes the specified permission.
   * @param permission The permission string to check.
   * @returns true if the permission exists in the role; otherwise false.
   */
  public hasPermission(permission: string): boolean {
    if (typeof permission !== 'string' || permission.trim() === '') {
      return false;
    }
    return this.permissions.includes(permission);
  }

  /**
   * Adds a permission to this role if it is not already present.
   * @param permission The permission string to add.
   * @throws {TypeError} If permission is not a non-empty string.
   */
  public addPermission(permission: string): void {
    this.validatePermission(permission);
    if (!this.hasPermission(permission)) {
      this.permissions.push(permission);
    }
  }

  /**
   * Removes a permission from this role.
   * @param permission The permission string to remove.
   * @throws {TypeError} If permission is not a non-empty string.
   */
  public removePermission(permission: string): void {
    this.validatePermission(permission);
    this.permissions = this.permissions.filter(p => p !== permission);
  }

  /**
   * Serializes this role to a plain object suitable for JSON stringification.
   * @returns A plain object representation of the role.
   */
  public toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      permissions: [...this.permissions],
      createdAt: this.createdAt.toISOString()
    };
  }

  /**
   * Factory method to create a new Role instance with a generated id.
   * @param props Configuration properties for the new role.
   * @returns A new Role instance.
   * @throws {TypeError} If required props are missing or invalid.
   */
  public static create(props: CreateRoleProps): Role {
    if (!props || typeof props !== 'object') {
      throw new TypeError('Role.create expects a valid CreateRoleProps object');
    }
    if (typeof props.name !== 'string' || props.name.trim() === '') {
      throw new TypeError('Role name must be a non-empty string');
    }
    if (typeof props.description !== 'string') {
      throw new TypeError('Role description must be a string');
    }
    if (props.permissions !== undefined && !Array.isArray(props.permissions)) {
      throw new TypeError('Role permissions must be an array of strings if provided');
    }

    const id = new IdGenerator('role').next();
    return new Role(
      id,
      props.name.trim(),
      props.description.trim(),
      props.permissions ? props.permissions.map(p => String(p).trim()) : []
    );
  }

  /**
   * Validates that a permission is a non-empty string.
   * @param permission The permission to validate.
   * @throws {TypeError} If validation fails.
   */
  private validatePermission(permission: unknown): asserts permission is string {
    if (typeof permission !== 'string' || permission.trim() === '') {
      throw new TypeError('Permission must be a non-empty string');
    }
  }
}
