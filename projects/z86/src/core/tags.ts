import { EventEmitter } from './event-emitter';
import { Timer } from './timer';
import { ResourceLoader } from './resource-loader';
import { Platform } from './platform';

export class Tags {
  private tags: Set<string>;

  constructor(initial?: string[]) {
    this.tags = new Set(initial);
  }

  add(tag: string): void {
    this.tags.add(tag);
  }

  remove(tag: string): void {
    this.tags.delete(tag);
  }

  has(tag: string): boolean {
    return this.tags.has(tag);
  }

  list(): string[] {
    return Array.from(this.tags);
  }

  toJSON(): string {
    return JSON.stringify(this.list());
  }

  static fromJSON(json: string): Tags {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid JSON format for Tags');
    }
    return new Tags(parsed);
  }
}
