import { Config, Result, ValidationError } from '../core';
import { Repository } from './repository';
import { Serializer } from './serializer';

export class Store {
  private readonly repositories = new Map<string, Repository>();
  private readonly serializers = new Map<string, Serializer>();
  private isConnected = false;

  async connect(): Promise<void> {
      try {
        if (this.isConnected) {
          throw new Error('Store is already connected');
        }
        this.isConnected = true;
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to connect: ${message}`);
      }
  }

  async disconnect(): Promise<void> {
      try {
        if (!this.isConnected) {
          throw new Error('Store is not connected');
        }
        this.isConnected = false;
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to connect: ${message}`);
      }
  }

  registerRepository(name: string, repo: Repository): void {
    this.repositories.set(name, repo);
  }

  getRepository(name: string): Repository {
    const repo = this.repositories.get(name);
    if (!repo) {
      throw new Error(`Repository '${name}' not found`);
    }
    return repo;
  }

  registerSerializer(name: string, serializer: Serializer): void {
    this.serializers.set(name, serializer);
  }

  getSerializer(name: string): Serializer {
    const serializer = this.serializers.get(name);
    if (!serializer) {
      throw new Error(`Serializer '${name}' not found`);
    }
    return serializer;
  }

  async query(entity: string, filter: Record<string, unknown>, sort: Record<string, unknown>): Promise<unknown[]> {
    const repo = this.getRepository(entity);
    const records = await repo.findAll(filter);
    return [...records];
  }

  /**
   * Purge all stored data.
   * Iterates over all registered repositories and deletes every record.
   */
  async clear(): Promise<void> {
    for (const repo of this.repositories.values()) {
      const records = await repo.findAll();
      for (const record of records) {
        if (record && typeof record === 'object' && 'id' in record && typeof (record as { id?: unknown }).id === 'string') {
          await repo.delete((record as { id: string }).id);
        }
      }
    }
  }
}
