import { EventEmitter } from './event-emitter';

export class Tags {
  private _tags: Set<string>;

  constructor() {
    this._tags = new Set<string>();
  }

  add(tag: string): void {
    this._tags.add(tag);
  }

  remove(tag: string): void {
    this._tags.delete(tag);
  }

  has(tag: string): boolean {
    return this._tags.has(tag);
  }

  list(): string[] {
    return Array.from(this._tags);
  }
}
