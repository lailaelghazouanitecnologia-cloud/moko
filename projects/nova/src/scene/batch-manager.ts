import { GraphNode } from './graph-node';
import { Entity } from './entity';
import { Component } from './component';
import { ComponentSystem } from './component-system';
import { Camera } from './camera';
import { Light } from './light';
import { MeshRenderer } from './mesh-renderer';
import { Scene } from './scene';
import { ForwardRenderer } from './forward-renderer';
import { ResourceLoader, Platform } from '../core';
import { Mat3, Mat4, BoundingBox } from '../math';
import { VertexFormat, Texture, Mesh } from '../graphics';

export interface Batch {
    id: string;
    mesh: Mesh;
    material: any;
    worldTransform: Mat4;
    visible: boolean;
}

export class BatchManager {
    private batches: Map<string, Batch> = new Map();
    private dirty: boolean = false;

    constructor() {}

    addBatch(batch: Batch): void {
        this.batches.set(batch.id, batch);
        this.dirty = true;
    }

    removeBatch(id: string): boolean {
        const removed = this.batches.delete(id);
        if (removed) {
            this.dirty = true;
        }
        return removed;
    }

    flush(renderer: ForwardRenderer): void {
        if (!this.dirty) return;

        for (const batch of this.batches.values()) {
            if (batch.visible) {
                renderer.drawMesh(batch.mesh, batch.material, batch.worldTransform);
            }
        }

        this.dirty = false;
    }

    clear(): void {
        this.batches.clear();
        this.dirty = true;
    }

    getBatch(id: string): Batch | undefined {
        return this.batches.get(id);
    }

    getAllBatches(): Batch[] {
        return Array.from(this.batches.values());
    }

    setDirty(): void {
        this.dirty = true;
    }

    isDirty(): boolean {
        return this.dirty;
    }
}
