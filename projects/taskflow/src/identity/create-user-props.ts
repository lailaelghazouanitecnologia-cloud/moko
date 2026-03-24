/**
 * Properties required to create a new user in the identity system.
 * All fields are mandatory unless explicitly marked as optional.
 */
export interface CreateUserProps {
  /**
   * The email address of the user.
   * Must be a valid RFC-5322 compliant email format.
   * @example "jane.doe@example.com"
   */
  email: string;

  /**
   * The password for the user account.
   * Must meet the minimum security requirements defined by the system policy.
   * @example "Str0ngP@ssw0rd!"
   */
  password: string;

  /**
   * The unique username for the user.
   * Must be unique across the system and meet the length requirements.
   * @example "jane_doe"
   */
  username: string;

  /**
   * The first name of the user.
   * @example "Jane"
   */
  firstName: string;

  /**
   * The last name of the user.
   * @example "Doe"
   */
  lastName: string;

  /**
   * An array of role identifiers to assign to the user.
   * Must contain at least one valid role from the system.
   * @example ["user", "admin"]
   */
  roles: string[];
}

/**
 * Validates that a CreateUserProps object conforms to all business rules.
 * @param props - The properties to validate
 * @throws {TypeError} If any field is of the wrong type
 * @throws {RangeError} If any field fails length/format constraints
 * @returns void
 */
export function validateCreateUserProps(props: unknown): asserts props is CreateUserProps {
  if (typeof props !== 'object' || props === null) {
    throw new TypeError('Props must be a non-null object');
  }

  const p = props as Record<string, unknown>;

  // Validate email
  if (typeof p.email !== 'string') {
    throw new TypeError('email must be a string');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
    throw new RangeError('email must be a valid RFC-5322 compliant address');
  }

  // Validate password
  if (typeof p.password !== 'string') {
    throw new TypeError('password must be a string');
  }
  if (p.password.length < 8) {
    throw new RangeError('password must be at least 8 characters long');
  }

  // Validate username
  if (typeof p.username !== 'string') {
    throw new TypeError('username must be a string');
  }
  if (p.username.length < 3 || p.username.length > 32) {
    throw new RangeError('username must be between 3 and 32 characters');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(p.username)) {
    throw new RangeError('username must contain only alphanumeric characters, underscores, or hyphens');
  }

  // Validate firstName
  if (typeof p.firstName !== 'string') {
    throw new TypeError('firstName must be a string');
  }
  if (p.firstName.trim().length === 0) {
    throw new RangeError('firstName cannot be empty or whitespace');
  }

  // Validate lastName
  if (typeof p.lastName !== 'string') {
    throw new TypeError('lastName must be a string');
  }
  if (p.lastName.trim().length === 0) {
    throw new RangeError('lastName cannot be empty or whitespace');
  }

  // Validate roles
  if (!Array.isArray(p.roles)) {
    throw new TypeError('roles must be an array');
  }
  if (p.roles.length === 0) {
    throw new RangeError('roles must contain at least one role');
  }
  for (const role of p.roles) {
    if (typeof role !== 'string' || role.trim().length === 0) {
      throw new RangeError('each role must be a non-empty string');
    }
  }
}
