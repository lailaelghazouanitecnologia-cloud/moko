import { Vec3 } from './vec3';
import { Ray } from './ray';
import { Plane } from './plane';
import { Frustum } from './frustum';
import { Mat4 } from './mat4';
import { BoundingSphere } from './bounding-sphere';

export class BoundingBox {
  min: Vec3;
  max: Vec3;

  constructor(min?: Vec3, max?: Vec3) {
    this.min = min ? min.clone() : new Vec3();
    this.max = max ? max.clone() : new Vec3();
  }

  static fromCenterAndSize(center: Vec3, size: Vec3): BoundingBox {
    const halfSize = size.clone().mulScalar(0.5);
    return new BoundingBox(center.clone().sub(halfSize), center.clone().add(halfSize));
  }

  static fromPoints(points: Vec3[]): BoundingBox {
    if (points.length === 0) {
      return new BoundingBox();
    }
    const min = points[0].clone();
    const max = points[0].clone();
    for (let i = 1; i < points.length; i++) {
      min.min(points[i]);
      max.max(points[i]);
    }
    return new BoundingBox(min, max);
  }

  clone(): BoundingBox {
    return new BoundingBox(this.min.clone(), this.max.clone());
  }

  copy(box: BoundingBox): BoundingBox {
    this.min.copy(box.min);
    this.max.copy(box.max);
    return this;
  }

  set(min: Vec3, max: Vec3): BoundingBox {
    this.min.copy(min);
    this.max.copy(max);
    return this;
  }

  getCenter(): Vec3 {
    return this.min.clone().add(this.max).mulScalar(0.5);
  }

  getSize(): Vec3 {
    return this.max.clone().sub(this.min);
  }

  getExtent(): Vec3 {
    return this.getSize().mulScalar(0.5);
  }

  getWidth(): number {
    return this.max.x - this.min.x;
  }

  getHeight(): number {
    return this.max.y - this.min.y;
  }

  getDepth(): number {
    return this.max.z - this.min.z;
  }

  getVolume(): number {
    const size = this.getSize();
    return size.x * size.y * size.z;
  }

  getSurfaceArea(): number {
    const size = this.getSize();
    return 2 * (size.x * size.y + size.x * size.z + size.y * size.z);
  }

  isEmpty(): boolean {
    return this.min.x >= this.max.x || this.min.y >= this.max.y || this.min.z >= this.max.z;
  }

  isDegenerate(): boolean {
    return this.isEmpty();
  }

  isValid(): boolean {
    return !this.isEmpty() && this.min.isFinite() && this.max.isFinite();
  }

  isFinite(): boolean {
    return this.min.isFinite() && this.max.isFinite();
  }

  expand(point: Vec3): BoundingBox {
    this.min.min(point);
    this.max.max(point);
    return this;
  }

  expandByScalar(scalar: number): BoundingBox {
    this.min.subScalar(scalar);
    this.max.addScalar(scalar);
    return this;
  }

  expandByBox(box: BoundingBox): BoundingBox {
    this.min.min(box.min);
    this.max.max(box.max);
    return this;
  }

  containsPoint(point: Vec3): boolean {
    return point.x >= this.min.x && point.x <= this.max.x &&
           point.y >= this.min.y && point.y <= this.max.y &&
           point.z >= this.min.z && point.z <= this.max.z;
  }

  containsBox(box: BoundingBox): boolean {
    return this.min.x <= box.min.x && this.min.y <= box.min.y && this.min.z <= box.min.z &&
           this.max.x >= box.max.x && this.max.y >= box.max.y && this.max.z >= box.max.z;
  }

  intersectsBox(box: BoundingBox): boolean {
    return this.min.x <= box.max.x && this.max.x >= box.min.x &&
           this.min.y <= box.max.y && this.max.y >= box.min.y &&
           this.min.z <= box.max.z && this.max.z >= box.min.z;
  }

  intersectsRay(ray: Ray): boolean {
    const invDirX = 1 / ray.direction.x;
    const invDirY = 1 / ray.direction.y;
    const invDirZ = 1 / ray.direction.z;

    let t1 = (this.min.x - ray.origin.x) * invDirX;
    let t2 = (this.max.x - ray.origin.x) * invDirX;
    let tmin = Math.min(t1, t2);
    let tmax = Math.max(t1, t2);

    t1 = (this.min.y - ray.origin.y) * invDirY;
    t2 = (this.max.y - ray.origin.y) * invDirY;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));

    t1 = (this.min.z - ray.origin.z) * invDirZ;
    t2 = (this.max.z - ray.origin.z) * invDirZ;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));

    return tmax >= Math.max(0, tmin);
  }

  intersectsPlane(plane: Plane): boolean {
    const center = this.getCenter();
    const extent = this.getExtent();
    const r = Math.abs(extent.x * plane.normal.x) + Math.abs(extent.y * plane.normal.y) + Math.abs(extent.z * plane.normal.z);
    const d = plane.normal.dot(center) - plane.constant;
    return Math.abs(d) <= r;
  }

  intersectsFrustum(frustum: Frustum): boolean {
    const planes = frustum.getPlanes();
    for (let i = 0; i < 6; i++) {
      if (!this.intersectsPlane(planes[i])) {
        return false;
      }
    }
    return true;
  }

  intersectsSphere(sphere: BoundingSphere): boolean {
    const closest = this.clampPoint(sphere.center);
    return closest.distanceTo(sphere.center) <= sphere.radius;
  }

  clampPoint(point: Vec3): Vec3 {
    return point.clone().clamp(this.min, this.max);
  }

  distanceToPoint(point: Vec3): number {
    const clamped = this.clampPoint(point);
    return clamped.distanceTo(point);
  }

  distanceToBox(box: BoundingBox): number {
    const thisCenter = this.getCenter();
    const boxCenter = box.getCenter();
    const thisExtent = this.getExtent();
    const boxExtent = box.getExtent();

    const dx = Math.max(0, Math.abs(thisCenter.x - boxCenter.x) - (thisExtent.x + boxExtent.x));
    const dy = Math.max(0, Math.abs(thisCenter.y - boxCenter.y) - (thisExtent.y + boxExtent.y));
    const dz = Math.max(0, Math.abs(thisCenter.z - boxCenter.z) - (thisExtent.z + boxExtent.z));

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  transform(matrix: Mat4): BoundingBox {
    const vertices = this.getVertices();
    const transformedVertices = vertices.map(v => v.transformMat4(matrix));
    return BoundingBox.fromPoints(transformedVertices);
  }

  translate(offset: Vec3): BoundingBox {
    this.min.add(offset);
    this.max.add(offset);
    return this;
  }

  scale(scale: Vec3): BoundingBox {
    const center = this.getCenter();
    const extent = this.getExtent();
    const newExtent = extent.mul(scale);
    this.min.copy(center.sub(newExtent));
    this.max.copy(center.add(newExtent));
    return this;
  }

  getVertices(): Vec3[] {
    return [
      new Vec3(this.min.x, this.min.y, this.min.z),
      new Vec3(this.max.x, this.min.y, this.min.z),
      new Vec3(this.max.x, this.max.y, this.min.z),
      new Vec3(this.min.x, this.max.y, this.min.z),
      new Vec3(this.min.x, this.min.y, this.max.z),
      new Vec3(this.max.x, this.min.y, this.max.z),
      new Vec3(this.max.x, this.max.y, this.max.z),
      new Vec3(this.min.x, this.max.y, this.max.z)
    ];
  }

  getEdges(): Vec3[][] {
    const vertices = this.getVertices();
    return [
      [vertices[0], vertices[1]],
      [vertices[1], vertices[2]],
      [vertices[2], vertices[3]],
      [vertices[3], vertices[0]],
      [vertices[4], vertices[5]],
      [vertices[5], vertices[6]],
      [vertices[6], vertices[7]],
      [vertices[7], vertices[4]],
      [vertices[0], vertices[4]],
      [vertices[1], vertices[5]],
      [vertices[2], vertices[6]],
      [vertices[3], vertices[7]]
    ];
  }

  getCorners(): Vec3[] {
    return this.getVertices();
  }

  toSphere(): BoundingSphere {
    const center = this.getCenter();
    const extent = this.getExtent();
    const radius = extent.length();
    return new BoundingSphere(center, radius);
  }

  fromArray(array: number[], offset: number = 0): BoundingBox {
    this.min.fromArray(array, offset);
    this.max.fromArray(array, offset + 3);
    return this;
  }

  toArray(array: number[] = [], offset: number = 0): number[] {
    this.min.toArray(array, offset);
    this.max.toArray(array, offset + 3);
    return array;
  }

  fromBuffer(buffer: ArrayBuffer, offset: number = 0): BoundingBox {
    const array = new Float32Array(buffer, offset, 6);
    return this.fromArray(Array.from(array));
  }

  toBuffer(buffer: ArrayBuffer = new ArrayBuffer(24), offset: number = 0): ArrayBuffer {
    const array = new Float32Array(buffer, offset, 6);
    const boxArray = this.toArray();
    for (let i = 0; i < 6; i++) {
      array[i] = boxArray[i];
    }
    return buffer;
  }

  fromJSON(json: any): BoundingBox {
    this.min.fromJSON(json.min);
    this.max.fromJSON(json.max);
    return this;
  }

  toJSON(): any {
    return {
      min: this.min.toJSON(),
      max: this.max.toJSON()
    };
  }

  fromString(str: string): BoundingBox {
    const parts = str.split(',').map(Number);
    this.min.set(parts[0], parts[1], parts[2]);
    this.max.set(parts[3], parts[4], parts[5]);
    return this;
  }

  toString(): string {
    return `${this.min.x},${this.min.y},${this.min.z},${this.max.x},${this.max.y},${this.max.z}`;
  }

  equals(box: BoundingBox): boolean {
    return this.min.equals(box.min) && this.max.equals(box.max);
  }

  isIntersection(box: BoundingBox): boolean {
    return this.intersectsBox(box);
  }

  getIntersection(box: BoundingBox): BoundingBox {
    const min = this.min.clone().max(box.min);
    const max = this.max.clone().min(box.max);
    return new BoundingBox(min, max);
  }

  getUnion(box: BoundingBox): BoundingBox {
    const min = this.min.clone().min(box.min);
    const max = this.max.clone().max(box.max);
    return new BoundingBox(min, max);
  }

  merge(box: BoundingBox): BoundingBox {
    return this.getUnion(box);
  }

  encapsulate(point: Vec3): BoundingBox {
    this.min.min(point);
    this.max.max(point);
    return this;
  }

  encapsulateBox(box: BoundingBox): BoundingBox {
    this.min.min(box.min);
    this.max.max(box.max);
    return this;
  }

  inflate(amount: number): BoundingBox {
    this.min.subScalar(amount);
    this.max.addScalar(amount);
    return this;
  }

  deflate(amount: number): BoundingBox {
    this.min.addScalar(amount);
    this.max.subScalar(amount);
    return this;
  }

  fitInside(container: BoundingBox): BoundingBox {
    const size = this.getSize();
    const containerSize = container.getSize();
    const scale = Math.min(
      containerSize.x / size.x,
      containerSize.y / size.y,
      containerSize.z / size.z
    );
    return this.scale(new Vec3(scale, scale, scale));
  }

  centerInside(container: BoundingBox): BoundingBox {
    const center = this.getCenter();
    const containerCenter = container.getCenter();
    const offset = containerCenter.sub(center);
    return this.translate(offset);
  }

  alignToGrid(gridSize: number): BoundingBox {
    this.min.x = Math.floor(this.min.x / gridSize) * gridSize;
    this.min.y = Math.floor(this.min.y / gridSize) * gridSize;
    this.min.z = Math.floor(this.min.z / gridSize) * gridSize;
    this.max.x = Math.ceil(this.max.x / gridSize) * gridSize;
    this.max.y = Math.ceil(this.max.y / gridSize) * gridSize;
    this.max.z = Math.ceil(this.max.z / gridSize) * gridSize;
    return this;
  }

  snapToGrid(gridSize: number): BoundingBox {
    return this.alignToGrid(gridSize);
  }

  reset(): BoundingBox {
    this.min.set(0, 0, 0);
    this.max.set(0, 0, 0);
    return this;
  }

  clear(): BoundingBox {
    return this.reset();
  }

  dispose(): void {
    this.min = null as any;
    this.max = null as any;
  }
}
