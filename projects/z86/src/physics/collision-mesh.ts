import { EventEmitter } from '../core';
import { Vec3 } from '../math';

export class CollisionMesh {
    private vertices: Vec3[] = [];
    private indices: number[] = [];
    private normals: Vec3[] = [];

    constructor(vertices?: Vec3[], indices?: number[], normals?: Vec3[]) {
        if (vertices) this.vertices = vertices.map(v => new Vec3(v.x, v.y, v.z));
        if (indices) this.indices = [...indices];
        if (normals) this.normals = normals.map(n => new Vec3(n.x, n.y, n.z));
    }

    buildFromGeometry(vertices: number[], indices?: number[]): void {
        this.vertices = [];
        for (let i = 0; i < vertices.length; i += 3) {
            this.vertices.push(new Vec3(vertices[i], vertices[i + 1], vertices[i + 2]));
        }
        if (indices) {
            this.indices = [...indices];
        } else {
            this.indices = [];
            for (let i = 0; i < this.vertices.length; i++) {
                this.indices.push(i);
            }
        }
        this.calculateNormals();
    }

    private calculateNormals(): void {
        this.normals = [];
        for (let i = 0; i < this.vertices.length; i++) {
            this.normals.push(new Vec3(0, 1, 0));
        }
        if (this.indices.length % 3 === 0) {
            for (let i = 0; i < this.indices.length; i += 3) {
                const i0 = this.indices[i];
                const i1 = this.indices[i + 1];
                const i2 = this.indices[i + 2];
                const v0 = this.vertices[i0];
                const v1 = this.vertices[i1];
                const v2 = this.vertices[i2];
                const e1 = v1.sub(v0);
                const e2 = v2.sub(v0);
                const n = e1.cross(e2).normalize();
                this.normals[i0] = this.normals[i0].add(n);
                this.normals[i1] = this.normals[i1].add(n);
                this.normals[i2] = this.normals[i2].add(n);
            }
            for (let i = 0; i < this.normals.length; i++) {
                this.normals[i].normalize();
            }
        }
    }

    serialize(): ArrayBuffer {
        const vertexCount = this.vertices.length;
        const indexCount = this.indices.length;
        const normalCount = this.normals.length;
        const vertexBytes = vertexCount * 3 * 4;
        const indexBytes = indexCount * 4;
        const normalBytes = normalCount * 3 * 4;
        const totalBytes = 16 + vertexBytes + indexBytes + normalBytes;
        const buffer = new ArrayBuffer(totalBytes);
        const view = new DataView(buffer);
        let offset = 0;
        view.setUint32(offset, vertexCount, true);
        offset += 4;
        view.setUint32(offset, indexCount, true);
        offset += 4;
        view.setUint32(offset, normalCount, true);
        offset += 4;
        view.setUint32(offset, 0, true);
        offset += 4;
        for (const v of this.vertices) {
            view.setFloat32(offset, v.x, true);
            offset += 4;
            view.setFloat32(offset, v.y, true);
            offset += 4;
            view.setFloat32(offset, v.z, true);
            offset += 4;
        }
        for (const i of this.indices) {
            view.setUint32(offset, i, true);
            offset += 4;
        }
        for (const n of this.normals) {
            view.setFloat32(offset, n.x, true);
            offset += 4;
            view.setFloat32(offset, n.y, true);
            offset += 4;
            view.setFloat32(offset, n.z, true);
            offset += 4;
        }
        return buffer;
    }

    deserialize(buffer: ArrayBuffer): void {
        const view = new DataView(buffer);
        let offset = 0;
        const vertexCount = view.getUint32(offset, true);
        offset += 4;
        const indexCount = view.getUint32(offset, true);
        offset += 4;
        const normalCount = view.getUint32(offset, true);
        offset += 4;
        offset += 4;
        this.vertices = [];
        for (let i = 0; i < vertexCount; i++) {
            const x = view.getFloat32(offset, true);
            offset += 4;
            const y = view.getFloat32(offset, true);
            offset += 4;
            const z = view.getFloat32(offset, true);
            offset += 4;
            this.vertices.push(new Vec3(x, y, z));
        }
        this.indices = [];
        for (let i = 0; i < indexCount; i++) {
            this.indices.push(view.getUint32(offset, true));
            offset += 4;
        }
        this.normals = [];
        for (let i = 0; i < normalCount; i++) {
            const x = view.getFloat32(offset, true);
            offset += 4;
            const y = view.getFloat32(offset, true);
            offset += 4;
            const z = view.getFloat32(offset, true);
            offset += 4;
            this.normals.push(new Vec3(x, y, z));
        }
    }

    getVertices(): Vec3[] {
        return this.vertices.map(v => new Vec3(v.x, v.y, v.z));
    }

    getIndices(): number[] {
        return [...this.indices];
    }

    getNormals(): Vec3[] {
        return this.normals.map(n => new Vec3(n.x, n.y, n.z));
    }
}
