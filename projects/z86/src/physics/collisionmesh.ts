import { Vec3 } from '../math/vec3';
import { BoundingBox } from '../math/boundingbox';
import { BoundingSphere } from '../math/boundingsphere';
import { Ray } from '../math/ray';

export class CollisionMesh {
    private vertices: Vec3[] = [];
    private indices: number[] = [];
    private bounds: BoundingBox;

    constructor(vertices?: Vec3[], indices?: number[]) {
        if (vertices) this.vertices = vertices.slice();
        if (indices) this.indices = indices.slice();
        this.updateBounds();
    }

    buildFromGeometry(vertices: number[], indices: number[]): void {
        this.vertices = [];
        for (let i = 0; i < vertices.length; i += 3) {
            this.vertices.push(new Vec3(vertices[i], vertices[i + 1], vertices[i + 2]));
        }
        this.indices = indices.slice();
        this.updateBounds();
    }

    intersectsRay(ray: Ray): boolean {
        if (!this.bounds || !this.bounds.intersectsRay(ray)) return false;
        for (let i = 0; i < this.indices.length; i += 3) {
            const a = this.vertices[this.indices[i]];
            const b = this.vertices[this.indices[i + 1]];
            const c = this.vertices[this.indices[i + 2]];
            if (this.rayIntersectsTriangle(ray, a, b, c)) return true;
        }
        return false;
    }

    intersectsSphere(sphere: BoundingSphere): boolean {
        if (!this.bounds || !this.bounds.intersectsSphere(sphere)) return false;
        for (let i = 0; i < this.indices.length; i += 3) {
            const a = this.vertices[this.indices[i]];
            const b = this.vertices[this.indices[i + 1]];
            const c = this.vertices[this.indices[i + 2]];
            if (this.sphereIntersectsTriangle(sphere, a, b, c)) return true;
        }
        return false;
    }

    intersectsBox(box: BoundingBox): boolean {
        if (!this.bounds || !this.bounds.intersectsBox(box)) return false;
        for (let i = 0; i < this.indices.length; i += 3) {
            const a = this.vertices[this.indices[i]];
            const b = this.vertices[this.indices[i + 1]];
            const c = this.vertices[this.indices[i + 2]];
            if (this.boxIntersectsTriangle(box, a, b, c)) return true;
        }
        return false;
    }

    private updateBounds(): void {
        if (this.vertices.length === 0) {
            this.bounds = new BoundingBox();
            return;
        }
        let min = new Vec3(this.vertices[0].x, this.vertices[0].y, this.vertices[0].z);
        let max = new Vec3(this.vertices[0].x, this.vertices[0].y, this.vertices[0].z);
        for (const v of this.vertices) {
            min.x = Math.min(min.x, v.x);
            min.y = Math.min(min.y, v.y);
            min.z = Math.min(min.z, v.z);
            max.x = Math.max(max.x, v.x);
            max.y = Math.max(max.y, v.y);
            max.z = Math.max(max.z, v.z);
        }
        this.bounds = new BoundingBox(min, max);
    }

    private rayIntersectsTriangle(ray: Ray, a: Vec3, b: Vec3, c: Vec3): boolean {
        const ab = b.clone().sub(a);
        const ac = c.clone().sub(a);
        const n = ab.cross(ac);
        const d = n.dot(ray.direction);
        if (Math.abs(d) < 1e-6) return false;
        const t = n.dot(a.clone().sub(ray.origin)) / d;
        if (t < 0) return false;
        const p = ray.origin.clone().add(ray.direction.clone().mulScalar(t));
        const ap = p.clone().sub(a);
        const dotACAC = ac.dot(ac);
        const dotACAB = ac.dot(ab);
        const dotABAB = ab.dot(ab);
        const dotACAP = ac.dot(ap);
        const dotABAP = ab.dot(ap);
        const invDenom = 1 / (dotACAC * dotABAB - dotACAB * dotACAB);
        const u = (dotABAB * dotACAP - dotACAB * dotABAP) * invDenom;
        const v = (dotACAC * dotABAP - dotACAB * dotACAP) * invDenom;
        return u >= 0 && v >= 0 && u + v <= 1;
    }

    private sphereIntersectsTriangle(sphere: BoundingSphere, a: Vec3, b: Vec3, c: Vec3): boolean {
        const p = this.closestPointOnTriangle(a, b, c, sphere.center);
        return p.distance(sphere.center) <= sphere.radius;
    }

    private boxIntersectsTriangle(box: BoundingBox, a: Vec3, b: Vec3, c: Vec3): boolean {
        if (box.containsPoint(a) || box.containsPoint(b) || box.containsPoint(c)) return true;
        const boxCenter = box.getCenter();
        const boxHalfExtents = box.getMax().clone().sub(boxCenter).mulScalar(0.5);
        const triVerts = [a, b, c];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const edge = triVerts[(j + 1) % 3].clone().sub(triVerts[j]);
                const axis = edge.cross(new Vec3(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0)).normalize();
                if (this.satAxisTest(axis, triVerts, boxCenter, boxHalfExtents)) return true;
            }
        }
        for (let i = 0; i < 3; i++) {
            const axis = new Vec3(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0);
            if (this.satAxisTest(axis, triVerts, boxCenter, boxHalfExtents)) return true;
        }
        return false;
    }

    private satAxisTest(axis: Vec3, triVerts: Vec3[], boxCenter: Vec3, boxHalfExtents: Vec3): boolean {
        let triMin = triVerts[0].dot(axis);
        let triMax = triMin;
        for (let i = 1; i < 3; i++) {
            const d = triVerts[i].dot(axis);
            triMin = Math.min(triMin, d);
            triMax = Math.max(triMax, d);
        }
        const boxMin = boxCenter.dot(axis) - boxHalfExtents.x * Math.abs(axis.x) - boxHalfExtents.y * Math.abs(axis.y) - boxHalfExtents.z * Math.abs(axis.z);
        const boxMax = boxCenter.dot(axis) + boxHalfExtents.x * Math.abs(axis.x) + boxHalfExtents.y * Math.abs(axis.y) + boxHalfExtents.z * Math.abs(axis.z);
        return triMax < boxMin || triMin > boxMax;
    }

    private closestPointOnTriangle(a: Vec3, b: Vec3, c: Vec3, p: Vec3): Vec3 {
        const ab = b.clone().sub(a);
        const ac = c.clone().sub(a);
        const ap = p.clone().sub(a);
        const d1 = ab.dot(ap);
        const d2 = ac.dot(ap);
        if (d1 <= 0 && d2 <= 0) return a;
        const bp = p.clone().sub(b);
        const d3 = ab.dot(bp);
        const d4 = ac.dot(bp);
        if (d3 >= 0 && d4 <= d3) return b;
        const vc = d1 * d4 - d3 * d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) {
            const v = d1 / (d1 - d3);
            return a.clone().add(ab.mulScalar(v));
        }
        const cp = p.clone().sub(c);
        const d5 = ab.dot(cp);
        const d6 = ac.dot(cp);
        if (d6 >= 0 && d5 <= d6) return c;
        const vb = d5 * d2 - d1 * d6;
        if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            return a.clone().add(ac.mulScalar(w));
        }
        const va = d3 * d6 - d5 * d4;
        if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
            const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
            return b.clone().add(c.clone().sub(b).mulScalar(w));
        }
        const denom = 1 / (va + vb + vc);
        const v = vb * denom;
        const w = vc * denom;
        return a.clone().add(ab.mulScalar(v)).add(ac.mulScalar(w));
    }
}
