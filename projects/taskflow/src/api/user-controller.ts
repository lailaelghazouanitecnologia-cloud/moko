import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/user-service';

declare const process: {
  env: {
    JWT_SECRET?: string;
  };
};

/**
 * Controller handling user-related HTTP endpoints.
 */
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Register a new user account.
   * @param req Express request containing email, password, username, firstName, lastName
   * @param res Express response
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, username, firstName, lastName } = req.body;

      if (!email || !password || !username || !firstName || !lastName) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      if (!this.isValidEmail(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }

      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const existingUsername = await this.userService.findByUsername(username);
      if (existingUsername) {
        res.status(409).json({ error: 'Username already taken' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      const user = await this.userService.createUser({
        email,
        password: passwordHash,
        username,
        firstName,
        lastName,
        roles: ['user']
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt
      });
    } catch (error) {
      this.handleError(res, error, 'Registration failed');
    }
  }

  /**
   * Authenticate user and return JWT token.
   * @param req Express request containing email and password
   * @param res Express response
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      if (!this.isValidEmail(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      const user = await this.userService.findByEmail(email);
      if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ error: 'Account deactivated' });
        return;
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      this.handleError(res, error, 'Login failed');
    }
  }

  /**
   * Retrieve authenticated user's profile.
   * @param req Express request with Authorization header
   * @param res Express response
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = this.extractToken(authHeader);
      if (!token) {
        res.status(401).json({ error: 'Malformed authorization header' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
      
      const user = await this.userService.findById(decoded.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        createdAt: user.createdAt
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to get profile');
    }
  }

  /**
   * Update authenticated user's profile.
   * @param req Express request with Authorization header and fields to update
   * @param res
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = this.extractToken(authHeader);
      if (!token) {
        res.status(401).json({ error: 'Malformed authorization header' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
      
      const updates: any = {};
      const allowedFields = ['firstName', 'lastName', 'username'];
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      if (updates.username) {
        const existing = await this.userService.findByUsername(updates.username);
        if (existing && existing.id !== decoded.userId) {
          res.status(409).json({ error: 'Username already taken' });
          return;
        }
      }

      const user = await this.userService.updateUser(decoded.userId, updates);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        updatedAt: user.updatedAt
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to update profile');
    }
  }

  /**
   * List users (admin only).
   * @param req Express request with Authorization header and optional pagination
   * @param res Express response
   */
  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = this.extractToken(authHeader);
      if (!token) {
        res.status(401).json({ error: 'Malformed authorization header' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
      
      const requestingUser = await this.userService.findById(decoded.userId);
      if (!requestingUser || !requestingUser.roles.includes('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      if (page < 1 || limit < 1 || limit > 100) {
        res.status(400).json({ error: 'Invalid pagination parameters' });
        return;
      }

      const users = await this.userService.listUsers(offset, limit);
      const total = await this.userService.countUsers();

      res.json({
        users: users.map((user: any) => ({
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          createdAt: user.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to list users');
    }
  }

  /**
   * Deactivate a user (admin only).
   * @param req Express request with Authorization header and userId param
   * @param res Express response
   */
  async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = this.extractToken(authHeader);
      if (!token) {
        res.status(401).json({ error: 'Malformed authorization header' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
      
      const requestingUser = await this.userService.findById(decoded.userId);
      if (!requestingUser || !requestingUser.roles.includes('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { userId } = req.params;
      if (!userId || !this.isValidId(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const user = await this.userService.deactivateUser(userId);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        isActive: user.isActive,
        deactivatedAt: new Date()
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to deactivate user');
    }
  }

  /**
   * Extract Bearer token from Authorization header.
   * @param header Authorization header value
   * @returns Token or null if malformed
   */
  private extractToken(header: string): string | null {
    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
  }

  /**
   * Validate email format.
   * @param email Email address
   * @returns True if valid
   */
  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Validate ID format.
   * @param id User ID
   * @returns True if valid
   */
  private isValidId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Handle errors consistently.
   * @param res Express response
   * @param error Error object
   * @param message Public error message
   */
  private handleError(res: Response, error: unknown, message: string): void {
    console.error(`${message}:`, error);
    res.status(500).json({ error: message });
  }
}
