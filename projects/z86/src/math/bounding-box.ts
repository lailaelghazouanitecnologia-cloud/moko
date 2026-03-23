import { Vec3 } from './vec3';

export class BoundingBox {
  min: Vec3;
  max: Vec3;

  constructor(min?: Vec3, max?: Vec3) {
    this.min = min ? min.clone() : new Vec3(Infinity, Infinity, Infinity);
    this.max = max ? max.clone() : new Vec3(-Infinity, -Infinity, -Infinity);
  }

  static fromPoints(points: Vec3[]): BoundingBox {
    const box = new BoundingBox();
    for (const p of points) {
      box.expandByPoint(p);
    }
    return box;
  }

  static fromCenterSize(center: Vec3, size: Vec3): BoundingBox {
    const halfSize = size.clone().scale(0.5);
    return new BoundingBox(center.clone().sub(halfSize), center.clone().add(halfSize));
  }

  clone(): BoundingBox {
    return new BoundingBox(this.min.clone(), this.max.clone());
  }

  copy(box: BoundingBox): this {
    this.min.copy(box.min);
    this.max.copy(box.max);
    return this;
  }

  set(min: Vec3, max: Vec3): this {
    this.min.copy(min);
    this.max.copy(max);
    return this;
  }

  empty(): boolean {
    return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
  }

  center(): Vec3 {
    return this.min.clone().add(this.max).scale(0.5);
  }

  size(): Vec3 {
    return this.max.clone().sub(this.min);
  }

  expandByPoint(point: Vec3): this {
    this.min.min(point);
    this.max.max(point);
    return this;
  }

  expandByBox(box: BoundingBox): this {
    this.min.min(box.min);
    this.max.max(box.max);
    return this;
  }

  expandByScalar(scalar: number): this {
    this.min.sub(new Vec3(scalar, scalar, scalar));
    this.max.add(new Vec3(scalar, scalar, scalar));
    return this;
  }

  intersect(box: BoundingBox): BoundingBox {
    const min = this.min.clone().max(box.min);
    const max = this.max.clone().min(box.max);
    return new BoundingBox(min, max);
  }

  intersectsBox(box: BoundingBox): boolean {
    return this.min.x <= box.max.x && this.max.x >= box.min.x &&
           this.min.y <= box.max.y && this.max.y >= box.min.y &&
           this.min.z <= box.max.z && this.max.z >= box.min.z;
  }

  intersectsSphere(sphere: import('./bounding-sphere').BoundingSphere): boolean {
    const closest = this.clampPoint(sphere.center);
    return closest.distanceSq(sphere.center) <= sphere.radius * sphere.radius;
  }

  clampPoint(point: Vec3): Vec3 {
    return point.clone().clamp(this.min, this.max);
  }

  distanceToPoint(point: Vec3): number {
    const clamped = this.clampPoint(point);
    return clamped.distance(point);
  }

  containsPoint(point: Vec3): boolean {
    return point.x >= this.min.x && point.x <= this.max.x &&
           point.y >= this.min.y && point.y <= this.max.y &&
           point.z >= this.min.z && point.z <= this.max.z;
  }

  containsBox(box: BoundingBox): boolean {
    return this.min.x <= box.min.x && box.max.x <= this.max.x &&
           this.min.y <= box.min.y && box.max.y <= this.max.y &&
           this.min.z <= box.min.z && box.max.z <= this.max.z;
  }

  getCorners(): Vec3[] {
    return [
      new Vec3(this.min.x, this.min.y, this.min.z),
      new Vec3(this.max.x, this.min.y, this.min.z),
      new Vec3(this.min.x, this.max.y, this.min.z),
      new Vec3(this.max.x, this.max.y, this.min.z),
      new Vec3(this.min.x, this.min.y, this.max.z),
      new Vec3(this.max.x, this.min.y, this.max.z),
      new Vec3(this.min.x, this.max.y, this.max.z),
      new Vec3(this.max.x, this.max.y, this.max.z)
    ];
  }

  transform(mat4: import('./mat4').Mat4): BoundingBox {
    const corners = this.getCorners();
    const transformed = corners.map(p => p.applyMat4(mat4));
    return BoundingBox.fromPoints(transformed);
  }

  translate(offset: Vec3): this {
    this.min.add(offset);
    this.max.add(offset);
    return this;
  }

  equals(box: BoundingBox): boolean {
    return this.min.equals(box.min) && this.max.equals(box.max);
  }

  toArray(): number[] {
    return [this.min.x, this.min.y, this.min.z, this.max.x, this.max.y, this.max.z];
  }

  fromArray(array: number[]): this {
    this.min.set(array[0], array[1], array[2]);
    this.max.set(array[3], array[4], array[5]);
    return this;
  }

  toString(): string {
    return `BoundingBox(min: ${this.min.toString()}, max: ${this.max.toString()})`;
  }
}
