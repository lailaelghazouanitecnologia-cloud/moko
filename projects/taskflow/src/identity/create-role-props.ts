/**
 * Properties required to create a role within the identity system.
 */
export interface CreateRoleProps {
  /**
   * Human-readable name for the role.
   * Must be unique across the system and contain only alphanumeric characters, hyphens, and underscores.
   * @example "admin"
   */
  name: string;

  /**
   * Brief summary of the role’s purpose and responsibilities.
   * Maximum length is 512 characters.
   * @example "Grants full administrative access to all resources."
   */
  description: string;

  /**
   * List of permission identifiers that this role confers.
   * Each permission must be a non-empty string adhering to the system’s permission naming convention.
   * @example ["read:users", "write:users", "delete:users"]
   */
  permissions: string[];
}
