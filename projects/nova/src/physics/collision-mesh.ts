import { BoundingBox, Vec3 } from '../math';
import { RaycastResult } from './raycast-result';

export class CollisionMesh {
    vertices: Float32Array = new Float32Array();
    indices: Uint16Array = new Uint16Array();
    normals: Float32Array = new Float32Array();
    aabb: BoundingBox = new BoundingBox();

    setVertices(vertices: Float32Array): void {
        this.vertices = new Float32Array(vertices);
        this.updateAABB();
    }

    getVertices(): Float32Array {
        return this.vertices;
    }

    setIndices(indices: Uint16Array): void {
        this.indices = new Uint16Array(indices);
    }

    getIndices(): Uint16Array {
        return this.indices;
    }

    setNormals(normals: Float32Array): void {
        this.normals = new Float32Array(normals);
    }

    getNormals(): Float32Array {
        return this.normals;
    }

    getAABB(): BoundingBox {
        return this.aabb;
    }

    updateAABB(): void {
        if (this.vertices.length === 0) {
            this.aabb.center.set(0, 0, 0);
            this.aabb.halfExtents.set(0, 0, 0);
            return;
        }

        let minX = this.vertices[0];
        let minY = this.vertices[1];
        let minZ = this.vertices[2];
        let maxX = this.vertices[0];
        let maxY = this.vertices[1];
        let maxZ = this.vertices[2];

        for (let i = 3; i < this.vertices.length; i += 3) {
            const x = this.vertices[i];
            const y = this.vertices[i + 1];
            const z = this.vertices[i + 2];

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
        }

        this.aabb.center.set(
            (minX + maxX) * 0.5,
            (minY + maxY) * 0.5,
            (minZ + maxZ) * 0.5
        );
        this.aabb.halfExtents.set(
            (maxX - minX) * 0.5,
            (maxY - minY) * 0.5,
            (maxZ - minZ) * 0.5
        );
    }

    raycast(from: Vec3, to: Vec3): RaycastResult | null {
        const result = new RaycastResult();
        const direction = new Vec3().sub2(to, from).normalize();
        let hit = false;
        let minDistance = Infinity;
        let hitPoint = new Vec3();
        let hitNormal = new Vec3();

        for (let i = 0; i < this.indices.length; i += 3) {
            const i0 = this.indices[i] * 3;
            const i1 = this.indices[i + 1] * 3;
            const i2 = this.indices[i + 2] * 3;

            const v0 = new Vec3(this.vertices[i0], this.vertices[i0 + 1], this.vertices[i0 + 2]);
            const v1 = new Vec3(this.vertices[i1], this.vertices[i1 + 1], this.vertices[i1 + 2]);
            const v2 = new Vec3(this.vertices[i2], this.vertices[i2 + 1], this.vertices[i2 + 2]);

            const edge1 = new Vec3().sub2(v1, v0);
            const edge2 = new Vec3().sub2(v2, v0);
            const h = new Vec3().cross(direction, edge2);
            const a = edge1.dot(h);

            if (Math.abs(a) < 0.00001) continue;

            const f = 1 / a;
            const s = new Vec3().sub2(from, v0);
            const u = f * s.dot(h);

            if (u < 0.0 || u > 1.0) continue;

            const q = new Vec3().cross(s, edge1);
            const v = f * direction.dot(q);

            if (v < 0.0 || u + v > 1.0) continue;

            const t = f * edge2.dot(q);

            if (t > 0.00001 && t < minDistance) {
                hit = true;
                minDistance = t;
                hitPoint.copy(from).add(direction.clone().mulScalar(t));
                hitNormal.copy(edge1).cross(edge2).normalize();
            }
        }

        if (hit) {
            result.point.copy(hitPoint);
            result.normal.copy(hitNormal);
            result.distance = minDistance;
            result.hit = true;
            return result;
        }

        return null;
    }

    getTriangle(index: number, out?: Vec3[]): Vec3[] {
        const result = out || [];
        result.length = 0;

        const i0 = this.indices[index * 3] * 3;
        const i1 = this.indices[index * 3 + 1] * 3;
        const i2 = this.indices[index * 3 + 2] * 3;

        result.push(new Vec3(this.vertices[i0], this.vertices[i0 + 1], this.vertices[i0 + 2]));
        result.push(new Vec3(this.vertices[i1], this.vertices[i1 + 1], this.vertices[i1 + 2]));
        result.push(new Vec3(this.vertices[i2], this.vertices[i2 + 1], this.vertices[i2 + 2]));

        return result;
    }

    getTriangleNormal(index: number): Vec3 {
        const i0 = this.indices[index * 3] * 3;
        const i1 = this.indices[index * 3 + 1] * 3;
        const i2 = this.indices[index * 3 + 2] * 3;

        const v0 = new Vec3(this.vertices[i0], this.vertices[i0 + 1], this.vertices[i0 + 2]);
        const v1 = new Vec3(this.vertices[i1], this.vertices[i1 + 1], this.vertices[i1 + 2]);
        const v2 = new Vec3(this.vertices[i2], this.vertices[i2 + 1], this.vertices[i2 + 2]);

        const edge1 = new Vec3().sub2(v1, v0);
        const edge2 = new Vec3().sub2(v2, v0);

        return edge1.cross(edge2).normalize();
    }

    getVertexCount(): number {
        return this.vertices.length / 3;
    }

    getTriangleCount(): number {
        return this.indices.length / 3;
    }
}
