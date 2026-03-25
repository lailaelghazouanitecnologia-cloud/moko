import { HistoryEntry } from './history-entry';
import { HistoryStore } from './history-store';
import { Evaluator, ConstantRegistry } from '../engine';
import { ExpressionParser, Tokenizer } from '../parser';

export class HistorySerializer {
  private readonly store: HistoryStore;

  constructor(store: HistoryStore) {
    this.store = store;
  }

  serialize(): string {
    const entries = this.store.getAll();
    const data = entries.map(entry => entry.toJSON());
    return JSON.stringify(data);
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data) as ReadonlyArray<unknown>;
    const entries = parsed.map(item => HistoryEntry.fromJSON(item));
    entries.forEach(entry => this.store.add(entry));
  }

  exportToFile(filename: string): void {
    const content = this.serialize();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  importFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = reader.result as string;
          this.deserialize(content);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  clear(): void {
    this.store.clear();
  }

  getEntryCount(): number {
    return this.store.getAll().length;
  }

  getLatestEntry(): HistoryEntry | null {
    const entries = this.store.getAll();
    return entries[entries.length - 1] ?? null;
  }

  getEntriesByDateRange(start: Date, end: Date): ReadonlyArray<HistoryEntry> {
    return this.store.getAll().filter(entry => {
      const timestamp = entry.getTimestamp();
      return timestamp >= start && timestamp <= end;
    });
  }

  searchByExpression(query: string): ReadonlyArray<HistoryEntry> {
    return this.store.getAll().filter(entry =>
      entry.getExpression().toLowerCase().includes(query.toLowerCase())
    );
  }

  searchByResult(query: string): ReadonlyArray<HistoryEntry> {
    return this.store.getAll().filter(entry =>
      entry.getResult().toLowerCase().includes(query.toLowerCase())
    );
  }

  deleteEntry(id: string): boolean {
    return this.store.remove(id);
  }

  deleteEntriesByDateRange(start: Date, end: Date): number {
    const entries = this.getEntriesByDateRange(start, end);
    entries.forEach(entry => this.store.remove(entry.getId()));
    return entries.length;
  }

  backup(): string {
    return this.serialize();
  }

  restore(data: string): void {
    this.clear();
    this.deserialize(data);
  }

  merge(other: HistorySerializer): void {
    const otherEntries = other.store.getAll();
    otherEntries.forEach(entry => {
      if (!this.store.getAll().some(e => e.getId() === entry.getId())) {
        this.store.add(entry);
      }
    });
  }

  toArray(): ReadonlyArray<HistoryEntry> {
    return this.store.getAll();
  }

  fromArray(entries: ReadonlyArray<HistoryEntry>): void {
    this.clear();
    entries.forEach(entry => this.store.add(entry));
  }
}
