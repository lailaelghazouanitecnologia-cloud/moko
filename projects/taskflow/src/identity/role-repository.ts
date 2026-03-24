import { Role } from './role';

/**
 * Repository interface for role persistence.
 * Provides CRUD operations and specialized queries for Role entities.
 */
export interface RoleRepository {
  /**
   * Finds a role by its unique identifier.
   * @param id - The unique identifier of the role.
   * @returns A promise that resolves to the Role or null if not found.
   * @throws {Error} If the id is empty or invalid.
   */
  findById(id: string): Promise<Role | null>;

  /**
   * Finds a role by its unique name.
   * @param name - The unique name of the role.
   * @returns A promise that resolves to the Role or null if not found.
   * @throws {Error} If the name is empty or invalid.
   */
  findByName(name: string): Promise<Role | null>;

  /**
   * Persists a new role.
   * @param role - The role entity to save.
   * @returns A promise that resolves when the role is saved.
   * @throws {Error} If the role is invalid or already exists.
   */
  save(role: Role): Promise<void>;

  /**
   * Updates an existing role.
   * @param role - The role entity with updated values.
   * @returns A promise that resolves when the role is updated.
   * @throws {Error} If the role does not exist or validation fails.
   */
  update(role: Role): Promise<void>;

  /**
   * Deletes a role by its identifier.
   * @param id - The unique identifier of the role to delete.
   * @returns A promise that resolves when the role is deleted.
   * @throws {Error} If the id is invalid or the role has dependencies.
   */
  delete(id: string): Promise<void>;

  /**
   * Retrieves all roles.
   * @returns A promise that resolves to an array of all roles.
   * @throws {Error} If the retrieval operation fails.
   */
  findAll(): Promise<Role[]>;

  /**
   * Finds all roles that grant a specific permission.
   * @param permission - The permission string to filter by.
   * @returns A promise that resolves to an array of roles with the permission.
   * @throws {Error} If the permission string is empty or invalid.
   */
  findByPermission(permission: string): Promise<Role[]>;
}
