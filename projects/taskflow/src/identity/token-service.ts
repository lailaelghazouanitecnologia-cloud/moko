import { User } from './user';
import { TaskflowException } from '../core/taskflow-exception';

/**
 * Handles JWT token operations for user authentication and authorization.
 */
export interface TokenService {
  /**
   * Creates a new JWT for the user.
   * @param user - The user to generate a token for
   * @returns Promise resolving to the signed JWT
   * @throws {TaskflowException} If user data is invalid
   */
  generate(user: User): Promise<string>;

  /**
   * Verifies the signature and expiration of a JWT.
   * @param token - The JWT to validate
   * @returns Promise resolving to the decoded payload or null if invalid
   */
  validate(token: string): Promise<object | null>;

  /**
   * Refreshes an existing token by creating a new one with updated expiration.
   * @param token - The current JWT to refresh
   * @returns Promise resolving to a new JWT
   * @throws {TaskflowException} If token is invalid or expired
   */
  refresh(token: string): Promise<string>;
}

/**
 * Implementation of TokenService using JWT with HS256 (HMAC-SHA256).
 */
export class JwtTokenService implements TokenService {
  private readonly secret: string;
  private readonly expiresIn: string;
  private static readonly MIN_SECRET_LENGTH = 32;

  constructor(secret: string, expiresIn = '1h') {
    if (!secret || typeof secret !== 'string') {
      throw new TaskflowException('Secret must be a non-empty string', 'INVALID_SECRET');
    }
    if (secret.length < JwtTokenService.MIN_SECRET_LENGTH) {
      throw new TaskflowException('Secret too short', 'WEAK_SECRET', {
        required: JwtTokenService.MIN_SECRET_LENGTH,
        provided: secret.length
      });
    }
    if (!this.isValidDurationFormat(expiresIn)) {
      throw new TaskflowException('Invalid duration format', 'INVALID_DURATION_FORMAT', { duration: expiresIn });
    }

    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  /**
   * Creates a new JWT for the user.
   */
  async generate(user: User): Promise<string> {
    if (!user || typeof user !== 'object') {
      throw new TaskflowException('User must be a valid object', 'INVALID_USER');
    }
    if (!user.id || !user.email || !user.username) {
      throw new TaskflowException('Invalid user data', 'INVALID_USER', { missing: ['id', 'email', 'username'].filter(k => !(user as any)[k]) });
    }
    if (!Array.isArray(user.roles)) {
      throw new TypeError('User.roles must be an array');
    }

    const now = Math.floor(Date.now() / 1);
    const payload = {
      sub: String(user.id),
      email: user.email,
      username: user.username,
      roles: user.roles.map(role => (role && role.name) ? role.name : 'unknown'),
      iat: now,
      exp: now + this.parseDuration(this.expiresIn)
    };

    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
      const signature = await this.sign(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verifies the signature and expiration of a JWT.
   */
  async validate(token: string): Promise<object | null> {
    if (!token || typeof token !== 'string') {
      return null;
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    let expectedSignature: string;
    try {
      expectedSignature = await this.sign(`${encodedHeader}.${encodedPayload}`);
    } catch {
      return null;
    }

    if (signature !== expectedSignature) {
      return null;
    }

    try {
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload));
      if (typeof payload !== 'object' || payload === null) {
        return null;
      }

      const now = Math.floor(Date.now() / 1);
      if (payload.exp && typeof payload.exp === 'number' && payload.exp < now) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Refreshes an existing token by creating a new one with updated expiration.
   */
  async refresh(token: string): Promise<string> {
    if (!token || typeof token !== 'string') {
      throw new TaskflowException('Token must be a non-empty string', 'INVALID_TOKEN');
    }

    const payload = await this.validate(token);
    if (!payload) {
      throw new TaskflowException('Token is invalid or expired', 'INVALID_TOKEN');
    }

    const p = payload as any;
    if (!p.sub || !p.email || !p.username) {
      throw new TaskflowException('Corrupt payload', 'CORRUPT_PAYLOAD', { missing: ['sub', 'email', 'username'].filter(k => !(p as any)[k]) });
    }

    const user: User = {
      id: p.sub,
      email: p.email,
      username: p.username,
      roles: Array.isArray(p.roles) ? p.roles.map((name: string) => ({ name })) : [],
      passwordHash: '',
      firstName: '',
      lastName: '',
      isActive: true,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: undefined,
      failedLoginAttempts: 0,
      lockedUntil: null,
      profilePictureUrl: null,
      timezone: 'UTC',
      locale: 'en',
      metadata: {},
      tags: [],
      permissions: [],
      settings: {}
    };

    return this.generate(user);
  }

  /**
   * Parses a duration string (e.g., '1h', '30m') into seconds.
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new TaskflowException('Invalid duration format', 'INVALID_DURATION_FORMAT', { duration });
    }

    const value = parseInt(match[1], 10);
    if (value <= 0 || !Number.isFinite(value)) {
      throw new TaskflowException('Invalid duration value', 'INVALID_DURATION_VALUE', { value });
    }

    const unit = match[2];
    const multipliers = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 60 * 60 * 24
    } as const;

    return value * multipliers[unit as keyof typeof multipliers];
  }

  /**
   * Validates the format of a duration string.
   */
  private isValidDurationFormat(duration: string): boolean {
    return /^[1-9]\d*[smhd]$/.test(duration);
  }

  /**
   * Encodes a string into base64url format.
   */
  private base64UrlEncode(str: string): string {
    if (typeof btoa === 'undefined') {
      throw new TaskflowException('Unsupported runtime', 'UNSUPPORTED_RUNTIME', { reason: 'btoa is not available' });
    }
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Decodes a base64url string into plain text.
   */
  private base64UrlDecode(str: string): string {
    if (typeof atob === 'undefined') {
      throw new TaskflowException('Unsupported runtime', 'UNSUPPORTED_RUNTIME', { reason: 'atob is not available' });
    }
    let output = str.replace(/-/g, '+').replace(/_/g, '/');
    while (output.length % 4) {
      output += '=';
    }
    try {
      return atob(output);
    } catch {
      throw new TaskflowException('Invalid base64url', 'INVALID_BASE64URL', { input: str });
    }
  }

  /**
   * Computes HMAC-SHA256 signature for the given data.
   */
  private async sign(data: string): Promise<string> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new TaskflowException('Unsupported runtime', 'UNSUPPORTED_RUNTIME', { reason: 'Web Crypto API not available' });
    }

    const encoder = new TextEncoder();
    let key: CryptoKey;

    try {
      key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
    } catch (err) {
      throw new TaskflowException('Key import failed', 'KEY_IMPORT_FAILED', { cause: (err as Error).message });
    }

    let signature: ArrayBuffer;
    try {
      signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    } catch (err) {
      throw new TaskflowException('Sign failed', 'SIGN_FAILED', { cause: (err as Error).message });
    }

    return this.base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  }
}
