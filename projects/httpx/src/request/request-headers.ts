import { Request } from './request';
import { RequestHeaders } from './request-headers';
import { RequestBody } from './request-body';
import { RequestParser } from './request-parser';

export class RequestHeaders {
  private store: Map<string, string[]>;

  constructor(raw?: Record<string, string | string[]>) {
    this.store = new Map<string, string[]>();
    if (raw) {
      for (const [key, value] of Object.entries(raw)) {
        const normalizedKey = key.toLowerCase();
        const values = Array.isArray(value) ? value : [value];
        this.store.set(normalizedKey, values);
      }
    }
  }

  get(name: string): string | undefined {
    const normalizedKey = name.toLowerCase();
    const values = this.store.get(normalizedKey);
    return values ? values[0] : undefined;
  }

  getAll(name: string): string[] {
    const normalizedKey = name.toLowerCase();
    const values = this.store.get(normalizedKey);
    return values ? [...values] : [];
  }

  set(name: string, value: string | string[]): void {
    const normalizedKey = name.toLowerCase();
    const values = Array.isArray(value) ? value : [value];
    this.store.set(normalizedKey, values);
  }

  append(name: string, value: string): void {
    const normalizedKey = name.toLowerCase();
    const existing = this.store.get(normalizedKey) || [];
    this.store.set(normalizedKey, [...existing, value]);
  }

  delete(name: string): void {
    const normalizedKey = name.toLowerCase();
    this.store.delete(normalizedKey);
  }

  has(name: string): boolean {
    const normalizedKey = name.toLowerCase();
    return this.store.has(normalizedKey);
  }

  keys(): IterableIterator<string> {
    return this.store.keys();
  }

  values(): IterableIterator<string[]> {
    return this.store.values();
  }

  entries(): IterableIterator<[string, string[]]> {
    return this.store.entries();
  }

  raw(): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};
    for (const [key, values] of this.store) {
      result[key] = values.length === 1 ? values[0] : values;
    }
    return result;
  }

  toJSON(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, values] of this.store) {
      result[key] = values[0] || '';
    }
    return result;
  }
}
