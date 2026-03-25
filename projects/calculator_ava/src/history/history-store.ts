import { HistoryEntry } from './history-entry';
import { HistorySerializer } from './history-serializer';

export class HistoryStore {
  private readonly entries: Map<string, HistoryEntry> = new Map();
  private readonly serializer: HistorySerializer;

  constructor(serializer?: Historyserializer) {
    this.serializer = serializer ?? new HistorySerializer();
  }

  addEntry(entry: HistoryEntry): void {
    this.entries.set(entry.getId(), entry);
  }

  getEntry(id: string): HistoryEntry | undefined {
    return this.entries.get(id);
  }

  getAllEntries(): ReadonlyArray<HistoryEntry> {
    return Array.from(this.entries.values());
  }

  hasEntry(id: string): boolean {
    return this.entries.has(id);
  }

  removeEntry(id: string): boolean {
    return this.entries.delete(id);
 }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }

  toJSON(): object {
    return {
      entries: Array.from(this.entries.values()).map(entry => entry.toJSON())
    };
  }

  fromJSON(data: object): void {
    this.entries.clear();
    const entries = (data as { entries?: unknown }).entries;
    if (Array.isArray(entries)) {
      for (const item of entries) {
        const entry = HistoryEntry.fromJSON(item as object);
        this.entries.set(entry.getId(), entry);
      }
    }
  }
}