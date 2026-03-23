import { MemorySession } from './memory-session';
import { MemoryIndex } from './memory-index';
import { MemoryQuery } from './memory-query';
import { promises as fs } from 'fs';
import { join } from 'path';

export class MemoryStore {
  private sessions: Map<string, MemorySession> = new Map();
  private indices: Map<string, MemoryIndex> = new Map();
  private persistencePath: string | null = null;
  private lock: Map<string, Promise<any>> = new Map();

  static readonly MAX_SESSIONS = 10000;
  static readonly MAX_INDEX_SIZE = 100000;

  createSession(sessionId: string, metadata?: Record<string, any>): MemorySession {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }
    if (this.sessions.size >= MemoryStore.MAX_SESSIONS) {
      throw new Error('Maximum number of sessions reached');
    }
    const session = new MemorySession(sessionId, metadata);
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): MemorySession | null {
    return this.sessions.get(sessionId) || null;
  }

  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.clear();
    this.sessions.delete(sessionId);
    return true;
  }

  createIndex(indexId: string, type: string): MemoryIndex {
    if (this.indices.has(indexId)) {
      return this.indices.get(indexId)!;
    }
    const index = new MemoryIndex(indexId, type);
    this.indices.set(indexId, index);
    return index;
  }

  getIndex(indexId: string): MemoryIndex | null {
    return this.indices.get(indexId) || null;
  }

  async query(query: MemoryQuery): Promise<any[]> {
    const results: any[] = [];
    const promises = Array.from(this.indices.values()).map(async index => {
      const indexResults = await index.search(query);
      results.push(...indexResults);
    });
    await Promise.all(promises);
    return results;
  }

  async persist(): Promise<void> {
    if (!this.persistencePath) return;
    const data = {
      sessions: Array.from(this.sessions.entries()).map(([id, session]) => ({
        id,
        data: session.export()
      })),
      indices: Array.from(this.indices.entries()).map(([id, index]) => ({
        id,
        data: index.export()
      }))
    };
    await fs.writeFile(this.persistencePath, JSON.stringify(data), 'utf8');
  }

  async load(path: string): Promise<void> {
    const content = await fs.readFile(path, 'utf8');
    const data = JSON.parse(content);
    this.sessions.clear();
    this.indices.clear();
    for (const { id, data: sessionData } of data.sessions) {
      const session = new MemorySession(id);
      session.import(sessionData);
      this.sessions.set(id, session);
    }
    for (const { id, data: indexData } of data.indices) {
      const index = new MemoryIndex(id, 'unknown');
      index.import(indexData);
      this.indices.set(id, index);
    }
    this.persistencePath = path;
  }

  getStats(): { sessions: number; indices: number; size: number } {
    let size = 0;
    for (const session of this.sessions.values()) {
      size += session.getSize();
    }
    for (const index of this.indices.values()) {
      size += index.getSize();
    }
    return {
      sessions: this.sessions.size,
      indices: this.indices.size,
      size
    };
  }

  clear(): void {
    for (const session of this.sessions.values()) {
      session.clear();
    }
    for (const index of this.indices.values()) {
      index.clear();
    }
    this.sessions.clear();
    this.indices.clear();
  }

  exportSession(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    return JSON.stringify(session.export());
  }

  importSession(data: string): MemorySession {
    const parsed = JSON.parse(data);
    const session = new MemorySession(parsed.id);
    session.import(parsed);
    this.sessions.set(parsed.id, session);
    return session;
  }
}
