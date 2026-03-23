import { EventEmitter } from '../core';
import { Vec3 } from '../math';
import { GraphicsDevice } from './graphics-device';
import { VertexBuffer } from './vertex-buffer';
import { IndexBuffer } from './index-buffer';
import { VertexFormat } from './vertex-format';

export class Mesh extends EventEmitter {
    vertexBuffer: VertexBuffer | null = null;
    indexBuffer: IndexBuffer | null = null;
    vertexFormat: VertexFormat | null = null;
    primitiveType: number = 4; // WebGLRenderingContext.TRIANGLES
    indexCount: number = 0;
    vertexCount: number = 0;
    aabb: { min: Vec3; max: Vec3 } = { min: new Vec3(), max: new Vec3() };

    constructor(graphicsDevice?: GraphicsDevice) {
        super();
    }

    setVertexBuffer(vertexBuffer: VertexBuffer): void {
        this.vertexBuffer = vertexBuffer;
        this.vertexCount = vertexBuffer.numVertices;
    }

    setIndexBuffer(indexBuffer: IndexBuffer): void {
        this.indexBuffer = indexBuffer;
        this.indexCount = indexBuffer.numIndices;
    }

    setVertexFormat(format: VertexFormat): void {
        this.vertexFormat = format;
    }

    setPrimitiveType(type: number): void {
        this.primitiveType = type;
    }

    update(): void {
        this.emit('update', this);
    }

    destroy(): void {
        if (this.vertexBuffer) {
            this.vertexBuffer.destroy();
            this.vertexBuffer = null;
        }
        if (this.indexBuffer) {
            this.indexBuffer.destroy();
            this.indexBuffer = null;
        }
        this.emit('destroy', this);
    }

    computeAABB(positions: number[]): void {
        if (positions.length === 0) return;
        const min = new Vec3(positions[0], positions[1], positions[2]);
        const max = new Vec3(positions[0], positions[1], positions[2]);
        for (let i = 3; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            if (x < min.x) min.x = x;
            if (y < min.y) min.y = y;
            if (z < min.z) min.z = z;
            if (x > max.x) max.x = x;
            if (y > max.y) max.y = y;
            if (z > max.z) max.z = z;
        }
        this.aabb.min = min;
        this.aabb.max = max;
    }

    getVertexCount(): number {
        return this.vertexCount;
    }

    getIndexCount(): number {
        return this.indexCount;
    }

    getPrimitiveType(): number {
        return this.primitiveType;
    }

    hasVertexBuffer(): boolean {
        return this.vertexBuffer !== null;
    }

    hasIndexBuffer(): boolean {
        return this.indexBuffer !== null;
    }

    getAABB(): { min: Vec3; max: Vec3 } {
        return this.aabb;
    }
}
