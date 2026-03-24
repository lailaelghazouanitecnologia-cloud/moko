import { User } from './user';

/**
 * Repository interface for user persistence operations.
 * Provides methods for CRUD operations and user-specific queries.
 */
export interface UserRepository {
  /**
   * Finds a user by their unique identifier.
   * @param id - The unique identifier of the user
   * @returns Promise resolving to the user or null if not found
   * @throws {Error} If id is invalid or empty
   */
  findById(id: string): Promise<User | null>;

  /**
   * Finds a user by their email address.
   * @param email - The email address to search for
   * @returns Promise resolving to the user or null if not found
   * @throws {Error} If email is invalid or empty
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Finds a user by their username.
   * @param username - The username to search for
   * @returns Promise resolving to the user or null if not found
   * @throws {Error} If username is invalid or empty
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Saves a new user to the repository.
   * @param user - The user entity to save
   * @returns Promise resolving when save is complete
   * @throws {Error} If user is invalid or already exists
   */
  save(user: User): Promise<void>;

  /**
   * Updates an existing user in the repository.
   * @param user - The user entity with updated values
   * @returns Promise resolving when update is complete
   * @throws {Error} If user is invalid or not found
   */
  update(user: User): Promise<void>;

  /**
   * Deletes a user by their identifier (soft delete).
   * @param id - The unique identifier of the user to delete
   * @returns Promise resolving when deletion is complete
   * @throws {Error} If id is invalid or user not found
   */
  delete(id: string): Promise<void>;

  /**
   * Retrieves all users with optional pagination.
   * @param limit - Maximum number of users to return
   * @param offset - Number of users to skip
   * @returns Promise resolving to array of users
   * @throws {Error} If limit or offset are negative
   */
  findAll(limit?: number, offset?: number): Promise<User[]>;

  /**
   * Counts the total number of users.
   * @returns Promise resolving to the total count
   * @throws {Error} If database operation fails
   */
  count(): Promise<number>;

  /**
   * Finds all users with a specific role.
   * @param roleName - The name of the role to filter by
   * @returns Promise resolving to array of users with the role
   * @throws {Error} If roleName is invalid or empty
   */
  findByRole(roleName: string): Promise<User[]>;

  /**
   * Finds all active users with optional pagination.
   * @param limit - Maximum number of users to return
   * @param offset - Number of users to skip
   * @returns Promise resolving to array of active users
   * @throws {Error} If limit or offset are negative
   */
  findActive(limit?: number, offset?: number): Promise<User[]>;
}
