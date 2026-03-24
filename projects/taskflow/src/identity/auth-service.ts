import { User } from './user';
import { UserRepository } from './user-repository';
import { TokenService } from './token-service';
import { CreateUserProps } from './index';
import { TaskflowException } from '../core/taskflow-exception';

/**
 * Handles authentication logic for the identity bounded context.
 */
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private tokenService: TokenService
  ) {}

  /**
   * Registers a new user in the system.
   * Validates input, checks for duplicates, hashes the password, and persists the user.
   *
   * @param props - Properties required to create a new user.
   * @returns The newly created user.
   * @throws {ValidationError} If required fields are missing or invalid.
   * @throws {TaskflowException} If email or username already exists.
   */
  async register(props: CreateUserProps): Promise<User> {
    this.validateCreateUserProps(props);

    const [existingUser, existingUsername] = await Promise.all([
      this.userRepository.findByEmail(props.email),
      this.userRepository.findByUsername(props.username)
    ]);

    if (existingUser) {
      throw new TaskflowException('USER_EXISTS', 'USER_EXISTS', { email: props.email });
    }

    if (existingUsername) {
      throw new TaskflowException('USERNAME_EXISTS', 'USERNAME_EXISTS', { username: props.username });
    }

    const user = await User.create(props);
    await this.userRepository.save(user);
    return user;
  }

  /**
   * Authenticates a user by email and password.
   *
   * @param email - The user's email address.
   * @param password - The user's plain-text password.
   * @returns The authenticated user or null if authentication fails.
   * @throws {ValidationError} If email or password is invalid.
   */
  async authenticate(email: string, password: string): Promise<User | null> {
    this.validateEmailAndPassword(email, password);

    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }

    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return null;
    }

    user.updateLastLogin();
    await this.userRepository.update(user);
    return user;
  }

  /**
   * Changes the password for an existing user.
   *
   * @param userId - The ID of the user.
   * @param oldPassword - The current password.
   * @param newPassword - The new password.
   * @throws {ValidationError} If new password is invalid.
   * @throws {TaskflowException} If user is not found or old password is invalid.
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    this.validateChangePasswordInputs(userId, oldPassword, newPassword);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new TaskflowException('USER_NOT_FOUND', 'USER_NOT_FOUND', { userId });
    }

    const isValid = await user.validatePassword(oldPassword);
    if (!isValid) {
      throw new TaskflowException('INVALID_PASSWORD', 'INVALID_PASSWORD', { userId });
    }

    user.passwordHash = await User.hashPassword(newPassword);
    user.updatedAt = new Date();
    await this.userRepository.update(user);
  }

  /**
   * Initiates a password reset for the user with the given email.
   * Generates a reset token and logs it (in production, would email it).
   *
   * @param email - The user's email address.
   * @throws {ValidationError} If email is invalid.
   */
  async resetPassword(email: string): Promise<void> {
    this.validateEmail(email);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return;
    }

    const resetToken = await this.tokenService.generate(user);
    // In a real implementation, this would send an email
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  /**
   * Verifies the validity of a token.
   *
   * @param token - The token to validate.
   * @returns True if the token is valid and not expired; otherwise false.
   * @throws {ValidationError} If token is invalid.
   */
  async verifyToken(token: string): Promise<boolean> {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new Error('Token must be a non-empty string');
    }

    const payload = await this.tokenService.validate(token);
    return payload !== null;
  }

  /* ------------------------------------------------------------------ */
  /* ------------------------ PRIVATE VALIDATORS ------------------------ */
  /* ------------------------------------------------------------------ */

  private validateCreateUserProps(props: CreateUserProps): void {
    if (!props || typeof props !== 'object') {
      throw new Error('Props must be a valid object');
    }
    this.validateEmail(props.email);
    this.validatePassword(props.password);
    if (!props.username || typeof props.username !== 'string' || props.username.trim().length === 0) {
      throw new Error('Username is required');
    }
  }

  private validateEmailAndPassword(email: string, password: string): void {
    this.validateEmail(email);
    this.validatePassword(password);
  }

  private validateChangePasswordInputs(userId: string, oldPassword: string, newPassword: string): void {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }
    this.validatePassword(oldPassword);
    this.validatePassword(newPassword);
    if (oldPassword === newPassword) {
      throw new Error('New password must be different from old password');
    }
  }

  private validateEmail(email: string): void {
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  private validatePassword(password: string): void {
    if (!password || typeof password !== 'string') {
      throw new Error('Password is required');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
  }
}
