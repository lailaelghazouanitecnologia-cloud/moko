import { Schema } from './schema';
import { ValidationError } from './validator';
import { ValidationRule } from './validator';
import { Validator } from './validator';

/**
 * A generic repository that stores validated items by string keys.
 * All mutations are validated against a schema before being persisted.
 */
export class Repository<T> {
  private readonly items: Map<string, T>;
  private readonly validator: Validator;
  private readonly schema: Schema;

  constructor(schema: Schema) {
    this.items = new Map();
    this.schema = schema;
    this.validator = new Validator(schema);
  }

  add(id: string, data: T): void {
    this.validator.assert(data);
    this.items.set(id, data);
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  update(id: string, data: T): void {
    this.validator.assert(data);
    if (!this.has(id)) {
      throw new Error(`Item with id ${id} not found`);
    }
    this.items.set(id, data);
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }

  size(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  list(): ReadonlyArray<T> {
    return Array.from(this.items.values());
  }

  keys(): ReadonlyArray<string> {
    return Array.from(this.items.keys());
  }

  find(predicate: (item: T) => boolean): T | undefined {
    for (const item of this.items.values()) {
      if (predicate(item)) {
        return item;
      }
    }
    return undefined;
  }

  filter(predicate: (item: T) => boolean): ReadonlyArray<T> {
    return Array.from(this.items.values()).filter(predicate);
  }

  map<U>(transform: (item: T) => U): ReadonlyArray<U> {
    return Array.from(this.items.values()).map(transform);
  }

  forEach(callback: (item: T, id: string) => void): void {
    this.items.forEach((value, key) => callback(value, key));
  }

  validate(data: unknown): boolean {
    return this.validator.validate(data);
  }

  validateWithErrors(data: unknown): ValidationError[] {
    return this.validator.validateWithErrors(data);
  }

  addRule(path: string, rule: ValidationRule): void {
    this.validator.addRule(path, rule);
  }

  removeRule(path: string): void {
    this.validator.removeRule(path);
  }

  getSchema(): Schema {
    return this.schema;
  }

  toJSON(): Record<string, T> {
    return Object.fromEntries(this.items);
  }

  fromJSON(data: unknown): void {
    const entries = Object.entries(data as Record<string, unknown>);
    for (const [key, value] of entries) {
      this.validator.assert(value);
      this.items.set(key, value as T);
    }
  }

  count(predicate?: (item: T) => boolean): number {
    if (!predicate) return this.items.size;
    return Array.from(this.items.values()).filter(predicate).length;
  }

  isEmpty(): boolean {
    return this.items.size === 0;
  }

  hasAny(predicate: (item: T) => boolean): boolean {
    return Array.from(this.items.values()).some(predicate);
  }

  hasAll(predicate: (item: T) => boolean): boolean {
    return this.items.size > 0 && Array.from(this.items.values()).every(predicate);
  }

  first(): T | undefined {
    return this.items.values().next().value;
  }

  last(): T | undefined {
    const values = Array.from(this.items.values());
    return values[values.length - 1];
  }

  validateAll(): ValidationError[] {
    const errors: ValidationError[] = [];
    for (const item of this.items.values()) {
      errors.push(...this.validator.validateWithErrors(item));
    }
    return errors;
  }

  validateById(id: string): ValidationError[] {
    const item = this.get(id);
    return item ? this.validator.validateWithErrors(item) : [];
  }

  /**
   * Merges another repository into this one.
   * @param other - Repository to merge
   * @throws {ValidationError} If any item fails validation
   */
  merge(other: Repository<T>): void {
    for (const [id, data] of other.items) {
      this.validator.assert(data);
      this.items.set(id, data);
    }
  }

  clone(): Repository<T> {
    const newRepo = new Repository(this.schema);
    for (const [id, data] of this.items) {
      newRepo.items.set(id, data);
    }
    return newRepo;
  }

  reset(): void {
    this.items.clear();
  }

  register(id: string, data: T): void {
    this.add(id, data);
  }

  unregister(id: string): void {
    this.delete(id);
  }

  isRegistered(id: string): boolean {
    return this.has(id);
  }

  getRegistration(id: string): T | undefined {
    return this.get(id);
  }

  validateRegistration(data: unknown): boolean {
    return this.validate(data);
  }

  getRegistered(): ReadonlyArray<T> {
    return this.list();
  }
}