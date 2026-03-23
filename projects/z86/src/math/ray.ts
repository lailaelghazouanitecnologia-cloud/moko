import { Vec3 } from './Vec3';

export class Ray {
    origin: Vec3;
    direction: Vec3;

    constructor(origin: Vec3, direction: Vec3) {
        this.origin = origin.clone();
        this.direction = direction.clone().normalize();
    }

    at(t: number): Vec3 {
        return this.origin.clone().add(this.direction.clone().multiplyScalar(t));
    }

    intersectsSphere(center: Vec3, radius: number): boolean {
        const oc = this.origin.clone().sub(center);
        const a = this.direction.dot(this.direction);
        const b = 2 * oc.dot(this.direction);
        const c = oc.dot(oc) - radius * radius;
        const discriminant = b * b - 4 * a * c;
        return discriminant >= 0;
    }

    intersectSphere(center: Vec3, radius: number): number | null {
        const oc = this.origin.clone().sub(center);
        const a = this.direction.dot(this.direction);
        const b = 2 * oc.dot(this.direction);
        const c = oc.dot(oc) - radius * radius;
        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) return null;

        const sqrtD = Math.sqrt(discriminant);
        const t0 = (-b - sqrtD) / (2 * a);
        const t1 = (-b + sqrtD) / (2 * a);

        if (t0 >= 0) return t0;
        if (t1 >= 0) return t1;
        return null;
    }

    intersectsBox(min: Vec3, max: Vec3): boolean {
        const invDirX = 1 / this.direction.x;
        const invDirY = 1 / this.direction.y;
        const invDirZ = 1 / this.direction.z;

        let t1 = (min.x - this.origin.x) * invDirX;
        let t2 = (max.x - this.origin.x) * invDirX;
        let tmin = Math.min(t1, t2);
        let tmax = Math.max(t1, t2);

        t1 = (min.y - this.origin.y) * invDirY;
        t2 = (max.y - this.origin.y) * invDirY;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));

        t1 = (min.z - this.origin.z) * invDirZ;
        t2 = (max.z - this.origin.z) * invDirZ;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));

        return tmax >= Math.max(0, tmin);
    }

    intersectBox(min: Vec3, max: Vec3): number | null {
        const invDirX = 1 / this.direction.x;
        const invDirY = 1 / this.direction.y;
        const invDirZ = 1 / this.direction.z;

        let t1 = (min.x - this.origin.x) * invDirX;
        let t2 = (max.x - this.origin.x) * invDirX;
        let tmin = Math.min(t1, t2);
        let tmax = Math.max(t1, t2);

        t1 = (min.y - this.origin.y) * invDirY;
        t2 = (max.y - this.origin.y) * invDirY;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));

        t1 = (min.z - this.origin.z) * invDirZ;
        t2 = (max.z - this.origin.z) * invDirZ;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));

        if (tmax < Math.max(0, tmin)) return null;
        return Math.max(0, tmin);
    }

    intersectsTriangle(a: Vec3, b: Vec3, c: Vec3): boolean {
        return this.intersectTriangle(a, b, c) !== null;
    }

    intersectTriangle(a: Vec3, b: Vec3, c: Vec3): number | null {
        const ab = b.clone().sub(a);
        const ac = c.clone().sub(a);
        const normal = ab.cross(ac);
        const det = -this.direction.dot(normal);
        const invDet = 1 / det;
        const ao = this.origin.clone().sub(a);

        const u = ao.cross(this.direction).dot(ac) * invDet;
        const v = -ao.cross(this.direction).dot(ab) * invDet;
        const t = ao.dot(normal) * invDet;

        if (det >= 0) {
            if (t < 0 || u < 0 || v < 0 || u + v > 1) return null;
        } else {
            if (t > 0 || u < 0 || v < 0 || u + v > 1) return null;
        }

        return t;
    }

    clone(): Ray {
        return new Ray(this.origin.clone(), this.direction.clone());
    }

    copy(ray: Ray): Ray {
        this.origin.copy(ray.origin);
        this.direction.copy(ray.direction);
        return this;
    }

    set(origin: Vec3, direction: Vec3): Ray {
        this.origin.copy(origin);
        this.direction.copy(direction).normalize();
        return this;
    }
}
