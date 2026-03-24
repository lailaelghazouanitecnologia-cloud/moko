import * as bcrypt from 'bcrypt';
import { IdGenerator } from '../core/id-generator';
import { Role } from './role';
import { CreateUserProps } from './create-user-props';

/**
 * Represents a user account with authentication and authorization capabilities.
 */
export class User {
  public readonly id: string;
  public email: string;
  public passwordHash: string;
  public username: string;
  public firstName: string;
  public lastName: string;
  public isActive: boolean;
  public createdAt: Date;
  public updatedAt: Date;
  public lastLoginAt: Date;
  public roles: Role[];

  /**
   * Creates an instance of User.
   * @param id - Unique identifier for the user
   * @param email - User's email address
   * @param passwordHash - Hashed password
   * @param username - Unique username
   * @param firstName - User's first name
   * @param lastName - User's last name
   * @param isActive - Whether the account is active
   * @param createdAt - Account creation timestamp
   * @param updatedAt - Last update timestamp
   * @param lastLoginAt - Last login timestamp
   * @param roles - Array of assigned roles
   */
  constructor(
    id: string,
    email: string,
    passwordHash: string,
    username: string,
    firstName: string,
    lastName: string,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
    lastLoginAt: Date,
    roles: Role[]
  ) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.username = username;
    this.firstName = firstName;
    this.lastName = lastName;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.lastLoginAt = lastLoginAt;
    this.roles = roles;
  }

  /**
   * Validates the provided password against the stored hash.
   * @param password - Plain text password to validate
   * @returns Promise resolving to true if password matches, false otherwise
   * @throws {Error} If password is not provided or is not a string
   */
  async validatePassword(password: string): Promise<boolean> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (!this.passwordHash) {
      throw new Error('Password hash is not set');
    }

    try {
      return await bcrypt.compare(password, this.passwordHash);
    } catch (error) {
      throw new Error(`Password validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if the user has a specific role.
   * @param roleName - Name of the role to check
   * @returns True if user has the role, false otherwise
   * @throws {Error} If roleName is not provided or is not a string
   */
  hasRole(roleName: string): boolean {
    if (!roleName || typeof roleName !== 'string') {
      throw new Error('Role name must be a non-empty string');
    }

    return this.roles.some(role => role.name === roleName);
  }

  /**
   * Checks if the user has any of the specified roles.
   * @param roleNames - Array of role names to check
   * @returns True if user has at least one of the roles, false otherwise
   * @throws {Error} If roleNames is not an array or contains invalid values
   */
  hasAnyRole(roleNames: string[]): boolean {
    if (!Array.isArray(roleNames)) {
      throw new Error('Role names must be an array');
    }

    if (roleNames.length === 0) {
      return false;
    }

    if (!roleNames.every(name => typeof name === 'string' && name.length > 0)) {
      throw new Error('All role names must be non-empty strings');
    }

    return this.roles.some(role => roleNames.includes(role.name));
  }

  /**
   * Updates the last login timestamp to the current time.
   */
  updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }

  /**
   * Deactivates the user account.
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * Activates the user account.
   */
  activate(): void {
    this.isActive = true;
  }

  /**
   * Returns a JSON representation of the user without sensitive data.
   * @returns Object containing user data excluding password hash
   */
  toJSON(): object {
    const { passwordHash, ...safeUser } = this;
    return safeUser;
  }

  /**
   * Gets the user's full name.
   * @returns Concatenated first and last name
   */
  fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /**
   * Creates a new User instance with hashed password.
   * @param props - User creation properties
   * @returns Promise to a new User instance
   * @throws {Error} If props are invalid or password hashing fails
   */
  static async create(props: CreateUserProps): Promise<User> {
    if (!props) {
      throw new Error('User properties are required');
    }

    User.validateCreateProps(props);

    const id = new IdGenerator('user').next();
    const passwordHash = await User.hashPassword(props.password);
    const now = new Date();
    
    return new User(
      id,
      props.email.toLowerCase().trim(),
      passwordHash,
      props.username.trim(),
      props.firstName.trim(),
      props.lastName.trim(),
      true,
      now,
      now,
      now,
      []
    );
  }

  /**
   * Hashes a password using bcrypt.
   * @param password - Plain text password to hash
   * =await bcrypt.compare(password, this.passwordHash);
   * @returns Promise resolving to the hashed password
   * @throws {Error} If password is invalid or hashing fails
   */
  static async hashPassword(password: string): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    try {
      const saltRounds = 10;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates user creation properties.
   * @param props - Properties to validate
   * @throws {Error} If any property is invalid
   */
  private static validateCreateProps(props: CreateUserProps): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!props.email || !emailRegex.test(props.email)) {
      throw new Error('Valid email address is required');
    }

    if (!props.username || props.username.trim().length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (!props.firstName || props.firstName.trim().length === 0) {
      throw new Error('First name is required');
    }

    if (!props.lastName || props.lastName.trim().length === 0) {
      throw new Error('Last name is required');
    }

    if (!props.password || props.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
  }
}
