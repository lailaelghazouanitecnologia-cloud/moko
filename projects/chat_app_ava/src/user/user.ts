/**
 * Represents a user in the system.
 */
export class User {
  /**
   * Creates a new User instance.
   * @param id - Unique identifier for the user.
   * @param email - Email address of the user.
   * @param username - Username chosen by the user.
   * @param createdAt - Date when the user was created.
   * @param updatedAt - Date when the user was last updated.
   */
  constructor(
    private readonly id: string,
    private readonly email: string,
    private readonly username: string,
    private readonly createdAt: Date,
    private readonly updatedAt: Date
  ) {
    if (!id || typeof id !== 'string') {
      throw new TypeError('id must be a non-empty string');
    }
    if (!email || typeof email !== 'string') {
      throw new TypeError('email must be a non-empty string');
    }
    if (!username || typeof username !== 'string') {
      throw new TypeError('username must be a non-empty string');
    }
    if (!(createdAt instanceof Date) || isNaN(createdAt.getTime())) {
      throw new TypeError('createdAt must be a valid Date');
    }
    if (!(updatedAt instanceof Date) || isNaN(updatedAt.getTime())) {
      throw new TypeError('updatedAt must be a valid Date');
    }
  }

  /**
   * Gets the unique identifier of the user.
   * @returns The user ID.
   */
  getId(): string {
    return this.id;
  }

  /**
   * Gets the email address of the user.
   * @returns The user email.
   */
  getEmail(): string {
    return this.email;
  }

  /**
   * Gets the username of the user.
   * @returns The username.
   */
  getUsername(): string {
    return this.username;
  }

  /**
   * Gets the creation date of the user.
   * @returns The creation date.
   */
  getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * Gets the last updated date of the user.
   * @returns The updated date.
   */
  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
