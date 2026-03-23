import { EventEmitter } from './event-emitter';
import { Timer } from './timer';
import { Tags } from './tags';
import { Platform } from './platform';

export class ResourceLoader {
  private resources: Map<string, any> = new Map();
  private loading: Map<string, Promise<any>> = new Map();
  private eventEmitter = new EventEmitter();

  async load<T>(key: string, loader: () => Promise<T>): Promise<T> {
    if (this.resources.has(key)) {
      return this.resources.get(key);
    }

    if (this.loading.has(key)) {
      return this.loading.get(key);
    }

    const loadPromise = loader().then(resource => {
      this.resources.set(key, resource);
      this.loading.delete(key);
      this.eventEmitter.emit('loaded', key, resource);
      return resource;
    }).catch(error => {
      this.loading.delete(key);
      this.eventEmitter.emit('error', key, error);
      throw error;
    });

    this.loading.set(key, loadPromise);
    return loadPromise;
  }

  unload(key: string): boolean {
    if (!this.resources.has(key)) {
      return false;
    }

    const resource = this.resources.get(key);
    this.resources.delete(key);
    this.eventEmitter.emit('unloaded', key, resource);
    return true;
  }

  get<T>(key: string): T | undefined {
    return this.resources.get(key);
  }

  has(key: string): boolean {
    return this.resources.has(key);
  }

  isLoading(key: string): boolean {
    return this.loading.has(key);
  }

  clear(): void {
    for (const key of this.resources.keys()) {
      this.unload(key);
    }
  }

  onLoaded(callback: (key: string, resource: any) => void): void {
    this.eventEmitter.on('loaded', callback);
  }

  onUnloaded(callback: (key: string, resource: any) => void): void {
    this.eventEmitter.on('unloaded', callback);
  }

  onError(callback: (key: string, error: Error) => void): void {
    this.eventEmitter.on('error', callback);
  }

  off(event: string, callback: Function): void {
    this.eventEmitter.off(event, callback);
  }
}
