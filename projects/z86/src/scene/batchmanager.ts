import { EventEmitter } from '../../core/eventemitter';
import { Vec3 } from '../../math/vec3';
import { Mat4 } from '../../math/mat4';
import { GraphicsDevice } from '../../graphics/graphicsdevice';
import { MeshInstance } from '../../graphics/meshinstance';
import { Material } from '../../graphics/material';

export interface Batch {
    meshInstances: MeshInstance[];
    material: Material;
    worldBounds?: BoundingBox;
}

export interface RenderState {
    device: GraphicsDevice;
    camera: Camera;
    pass: number;
    cullingMask: number;
}

export class BatchManager extends EventEmitter {
    private _batches: Batch[] = [];
    private _device: GraphicsDevice;
    private _maxBatchSize: number;

    constructor(device: GraphicsDevice, maxBatchSize: number = 1024) {
        super();
        this._device = device;
        this._maxBatchSize = maxBatchSize;
    }

    addBatch(batch: Batch): void {
        if (this._batches.length >= this._maxBatchSize) {
            throw new Error('Maximum batch size exceeded');
        }
        this._batches.push(batch);
        this.emit('batchAdded', batch);
    }

    removeBatch(batch: Batch): boolean {
        const index = this._batches.indexOf(batch);
        if (index !== -1) {
            this._batches.splice(index, 1);
            this.emit('batchRemoved', batch);
            return true;
        }
        return false;
    }

    flush(renderState: RenderState): void {
        for (const batch of this._batches) {
            this._renderBatch(batch, renderState);
        }
    }

    clear(): void {
        this._batches.length = 0;
        this.emit('cleared');
    }

    private _renderBatch(batch: Batch, renderState: RenderState): void {
        if (!batch.material) return;

        batch.material.enable(renderState.device);
        
        for (const meshInstance of batch.meshInstances) {
            if (!meshInstance.visible) continue;
            
            if (meshInstance.cullingMask & renderState.cullingMask) {
                renderState.device.draw(meshInstance.mesh, meshInstance.node.worldTransform);
            }
        }
        
        batch.material.disable(renderState.device);
    }

    get batches(): Batch[] {
        return this._batches.slice();
    }

    get count(): number {
        return this._batches.length;
    }
}
