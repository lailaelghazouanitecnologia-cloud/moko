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

  isEmpty(): boolean {
    return this.radius <= 0;
  }

  makeEmpty(): BoundingSphere {
    this.center.set(0, 0, 0);
    this.radius = 0;
    return this;
  }

  containsPoint(point: Vec3): boolean {
    return point.distanceToSquared(this.center) <= this.radius * this.radius;
  }

  intersectsSphere(sphere: BoundingSphere): boolean {
    const radiusSum = this.radius + sphere.radius;
    return this.center.distanceToSquared(sphere.center) <= radiusSum * radiusSum;
  }

  intersectsBox(box: BoundingBox): boolean {
    return box.intersectsSphere(this);
  }

  intersectsFrustum(frustum: Frustum): boolean {
    return frustum.intersectsSphere(this);
  }

  distanceToPoint(point: Vec3): number {
    return Math.max(0, point.distanceTo(this.center) - this.radius);
  }

  expandByPoint(point: Vec3): BoundingSphere {
    if (this.isEmpty()) {
      this.center.copy(point);
      this.radius = 0;
      return this;
    }

    const distance = point.distanceTo(this.center);
    if (distance <= this.radius) {
      return this;
    }

    const newRadius = (distance + this.radius) / 2;
    const scale = (newRadius - this.radius) / distance;
    this.center.addScaledVector(point.subtract(this.center), scale);
    this.radius = newRadius;
    return this;
  }

  expandBySphere(sphere: BoundingSphere): BoundingSphere {
    if (this.isEmpty()) {
      return this.copy(sphere);
    }
    if (sphere.isEmpty()) {
      return this;
    }

    const offset = sphere.center.clone().subtract(this.center);
    const distance = offset.length();
    const radiusDiff = sphere.radius - this.radius;

    if (radiusDiff >= distance) {
      return this;
    }
    if (-this.radius >= distance - sphere.radius) {
      return this.copy(sphere);
    }

    const newRadius = (distance + this.radius + sphere.radius) / 2;
    const scale = (newRadius - this.radius) / distance;
    this.center.addScaledVector(offset, scale);
    this.radius = newRadius;
    return this;
  }

  expandByScalar(scalar: number): BoundingSphere {
    this.radius += scalar;
    return this;
  }

  translate(offset: Vec3): BoundingSphere {
    this.center.add(offset);
    return this;
  }

  equals(sphere: BoundingSphere): boolean {
    return this.center.equals(sphere.center) && this.radius === sphere.radius;
  }
}
