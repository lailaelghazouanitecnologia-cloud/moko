import { EventEmitter } from '../core';
import { Vec3, Mat4, BoundingBox } from '../math';
import { VertexBuffer } from './vertex-buffer';
import { IndexBuffer } from './index-buffer';
import { VertexFormat } from './vertex-format';

export class Mesh {
  vertexBuffer: VertexBuffer | null = null;
  indexBuffer: IndexBuffer | null = null;
  vertexFormat: VertexFormat | null = null;
  primitiveType: number = 4; // TRIANGLES
  numVertices: number = 0;
  numIndices: number = 0;
  aabb: BoundingBox = new BoundingBox();
  boundingSphereRadius: number = 0;
  name: string = '';

  constructor(name?: string) {
    this.name = name || '';
  }

  setVertexBuffer(vertexBuffer: VertexBuffer): void {
    this.vertexBuffer = vertexBuffer;
    this.numVertices = vertexBuffer.numVertices;
  }

  setIndexBuffer(indexBuffer: IndexBuffer): void {
    this.indexBuffer = indexBuffer;
    this.numIndices = indexBuffer.numIndices;
  }

  setVertexFormat(vertexFormat: VertexFormat): void {
    this.vertexFormat = vertexFormat;
  }

  setPrimitiveType(primitiveType: number): void {
    this.primitiveType = primitiveType;
  }

  updateBounds(): void {
    if (!this.vertexBuffer || !this.vertexFormat) return;

    const positions = this.vertexFormat.getPositions(this.vertexBuffer);
    if (!positions) return;

    const min = new Vec3(Infinity, Infinity, Infinity);
    const max = new Vec3(-Infinity, -Infinity, -Infinity);
    const center = new Vec3();

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      min.x = Math.min(min.x, x);
      min.y = Math.min(min.y, y);
      min.z = Math.min(min.z, z);

      max.x = Math.max(max.x, x);
      max.y = Math.max(max.y, y);
      max.z = Math.max(max.z, z);
    }

    this.aabb.setMinMax(min, max);
    this.aabb.getCenter(center);
    this.boundingSphereRadius = 0;

    for (let i = 0; i < positions.length; i += 3) {
      const dx = positions[i] - center.x;
      const dy = positions[i + 1] - center.y;
      const dz = positions[i + 2] - center.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      this.boundingSphereRadius = Math.max(this.boundingSphereRadius, dist);
    }
  }

  getAABB(): BoundingBox {
    return this.aabb.clone();
  }

  getBoundingSphereRadius(): number {
    return this.boundingSphereRadius;
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
    this.vertexFormat = null;
  }
}
