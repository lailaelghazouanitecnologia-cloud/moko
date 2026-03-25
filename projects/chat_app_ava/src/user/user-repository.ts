import { User } from './user';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<boolean>;
  list(limit: number, offset: number): Promise<User[]>;
}
