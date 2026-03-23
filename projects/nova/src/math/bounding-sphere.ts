import { Vec3 } from './vec3';

export class BoundingSphere {
  center: Vec3;
  radius: number;

  constructor(center: Vec3 = new Vec3(), radius: number = 0) {
    this.center = center.clone();
    this.radius = radius;
  }

  clone(): BoundingSphere {
    return new BoundingSphere(this.center.clone(), this.radius);
  }

  copy(sphere: BoundingSphere): BoundingSphere {
    this.center.copy(sphere.center);
    this.radius = sphere.radius;
    return this;
  }

  set(center: Vec3, radius: number): BoundingSphere {
    this.center.copy(center);
    this.radius = radius;
    return this;
  }

  setFromPoints(points: Vec3[]): BoundingSphere {
    if (points.length === 0) {
      this.center.set(0, 0, 0);
      this.radius = 0;
      return this;
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      maxZ = Math.max(maxZ, p.z);
    }

    this.center.set(
      (minX + maxX) * 0.5,
      (minY + maxY) * 0.5,
      (minZ + maxZ) * 0.5
    );

    let maxRadiusSq = 0;
    for (const p of points) {
      const dx = p.x - this.center.x;
      const dy = p.y - this.center.y;
      const dz = p.z - this.center.z;
      maxRadiusSq = Math.max(maxRadiusSq, dx * dx + dy * dy + dz * dz);
    }
    this.radius = Math.sqrt(maxRadiusSq);

    return this;
  }

  expandByPoint(point: Vec3): BoundingSphere {
    const d = this.center.distanceTo(point);
    if (d <= this.radius) return this;

    const newRadius = (this.radius + d) * 0.5;
    const t = (newRadius - this.radius) / d;
    this.center.addScaled(point.subtract(this.center), t);
    this.radius = newRadius;
    return this;
  }

  union(sphere: BoundingSphere): BoundingSphere {
    const d = this.center.distanceTo(sphere.center);
    if (d === 0) {
      this.radius = Math.max(this.radius, sphere.radius);
      return this;
    }

    const r0 = this.radius;
    const r1 = sphere.radius;
    const newRadius = (r0 + r1 + d) * 0.5;
    const t = (newRadius - r0) / d;
    this.center.addScaled(sphere.center.subtract(this.center), t);
    this.radius = newRadius;
    return this;
  }

  intersectsSphere(sphere: BoundingSphere): boolean {
    const r = this.radius + sphere.radius;
    return this.center.distanceSquaredTo(sphere.center) <= r * r;
  }

  intersectsBox(box: BoundingBox): boolean {
    return box.intersectsSphere(this);
  }

  intersectsPlane(plane: { normal: Vec3; constant: number }): boolean {
    const d = this.center.dot(plane.normal) + plane.constant;
    return Math.abs(d) <= this.radius;
  }

  containsPoint(point: Vec3): boolean {
    return this.center.distanceSquaredTo(point) <= this.radius * this.radius;
  }

  clampPoint(point: Vec3, out: Vec3 = new Vec3()): Vec3 {
    const d = this.center.distanceTo(point);
    if (d <= this.radius) {
      return out.copy(point);
    }
    return out.copy(this.center).addScaled(point.subtract(this.center).normalize(), this.radius);
  }

  distanceToPoint(point: Vec3): number {
    return Math.max(0, this.center.distanceTo(point) - this.radius);
  }

  transform(mat: Mat4): BoundingSphere {
    const scale = mat.getMaxScaleOnAxis();
    this.center.transformMat4(mat);
    this.radius *= scale;
    return this;
  }

  translate(offset: Vec3): BoundingSphere {
    this.center.add(offset);
    return this;
  }

  equals(sphere: BoundingSphere): boolean {
    return this.center.equals(sphere.center) && this.radius === sphere.radius;
  }

  isEmpty(): boolean {
    return this.radius < 0;
  }

  empty(): BoundingSphere {
    this.center.set(0, 0, 0);
    this.radius = -1;
    return this;
  }

  toString(): string {
    return `BoundingSphere(center: ${this.center}, radius: ${this.radius})`;
  }
}
