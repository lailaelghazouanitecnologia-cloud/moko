import { EventEmitter } from '../core';
import { Vec3, Mat4 } from '../math';
import { WebGLDevice } from '../graphics';
import { MeshRenderer } from './mesh-renderer';
import { Camera } from './camera';
import { Light } from './light';

export class BatchManager {
  private device: WebGLDevice;
  private renderers: MeshRenderer[] = [];
  private batchedRenderers: Map<string, MeshRenderer[]> = new Map();
  private batchKeys: Map<MeshRenderer, string> = new Map();

  constructor(device: WebGLDevice) {
    this.device = device;
  }

  addRenderer(renderer: MeshRenderer): void {
    if (this.renderers.includes(renderer)) return;
    
    this.renderers.push(renderer);
    this.updateBatchKey(renderer);
  }

  removeRenderer(renderer: MeshRenderer): void {
    const index = this.renderers.indexOf(renderer);
    if (index === -1) return;

    this.renderers.splice(index, 1);
    this.removeFromBatch(renderer);
  }

  updateRenderer(renderer: MeshRenderer): void {
    if (!this.renderers.includes(renderer)) return;
    
    this.removeFromBatch(renderer);
    this.updateBatchKey(renderer);
  }

  private updateBatchKey(renderer: MeshRenderer): void {
    const key = this.generateBatchKey(renderer);
    this.batchKeys.set(renderer, key);

    if (!this.batchedRenderers.has(key)) {
      this.batchedRenderers.set(key, []);
    }
    this.batchedRenderers.get(key)!.push(renderer);
  }

  private removeFromBatch(renderer: MeshRenderer): void {
    const key = this.batchKeys.get(renderer);
    if (!key) return;

    const batch = this.batchedRenderers.get(key);
    if (!batch) return;

    const index = batch.indexOf(renderer);
    if (index !== -1) {
      batch.splice(index, 1);
      if (batch.length === 0) {
        this.batchedRenderers.delete(key);
      }
    }

    this.batchKeys.delete(renderer);
  }

  private generateBatchKey(renderer: MeshRenderer): string {
    const material = renderer.material;
    const mesh = renderer.mesh;
    
    const parts = [
      material?.id || 'null',
      mesh?.id || 'null',
      renderer.castShadows ? '1' : '0',
      renderer.receiveShadows ? '1' : '0',
      renderer.layer.toString()
    ];

    return parts.join('|');
  }

  getBatches(): MeshRenderer[][] {
    const batches: MeshRenderer[][] = [];
    
    for (const batch of this.batchedRenderers.values()) {
      if (batch.length > 0) {
        batches.push([...batch]);
      }
    }

    return batches;
  }

  getBatchForRenderer(renderer: MeshRenderer): MeshRenderer[] {
    const key = this.batchKeys.get(renderer);
    if (!key) return [];

    return this.batchedRenderers.get(key) || [];
  }

  clear(): void {
    this.renderers.length = 0;
    this.batchedRenderers.clear();
    this.batchKeys.clear();
  }

  rebuild(): void {
    this.batchedRenderers.clear();
    this.batchKeys.clear();

    for (const renderer of this.renderers) {
      this.updateBatchKey(renderer);
    }
  }

  getStats(): { totalRenderers: number; batchCount: number; avgBatchSize: number } {
    const totalRenderers = this.renderers.length;
    const batchCount = this.batchedRenderers.size;
    const avgBatchSize = batchCount > 0 ? totalRenderers / batchCount : 0;

    return {
      totalRenderers,
      batchCount,
      avgBatchSize
    };
  }
}
