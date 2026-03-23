import { EventEmitter } from './eventemitter';
import { Timer } from './timer';
import { Tags } from './tags';
import { Platform } from './platform';

type ResourceId = string;
type ResourceData = any;

export class ResourceLoader {
  private cache: Map<ResourceId, ResourceData> = new Map();
  private loading: Map<ResourceId, Promise<ResourceData>> = new Map();
  private emitter = new EventEmitter();

  async load(id: ResourceId, loader: () => Promise<ResourceData>): Promise<ResourceData> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    if (this.loading.has(id)) {
      return this.loading.get(id)!;
    }
    const promise = loader().then(data => {
      this.cache.set(id, data);
      this.loading.delete(id);
      this.emitter.emit('loaded', id, data);
      return data;
    }).catch(err => {
      this.loading.delete(id);
      this.emitter.emit('error', id, err);
      throw err;
    });
    this.loading.set(id, promise);
    return promise;
  }

  unload(id: ResourceId): boolean {
    const had = this.cache.has(id);
    this.cache.delete(id);
    this.loading.delete(id);
    if (had) {
      this.emitter.emit('unloaded', id);
    }
    return had;
  }

  get(id: ResourceId): ResourceData | undefined {
    return this.cache.get(id);
  }

  has(id: ResourceId): boolean {
    return this.cache.has(id) || this.loading.has(id);
  }
}
