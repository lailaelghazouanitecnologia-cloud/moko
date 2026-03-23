import { Vec3 } from './vec3';
import { Vec4 } from './vec4';
import { Mat4 } from './mat4';
import { BoundingBox } from './bounding-box';
import { BoundingSphere } from './bounding-sphere';

export class Frustum {
  planes: Vec4[];

  constructor(planes?: Vec4[]) {
    this.planes = planes ? planes.slice() : [
      new Vec4(0, 0, 1, 1),   // near
      new Vec4(0, 0, -1, 1), // far
      new Vec4(1, 0, 0, 1),   // left
      new Vec4(-1, 0, 0, 1),  // right
      new Vec4(0, 1, 0, 1),   // bottom
      new Vec4(0, -1, 0, 1)   // top
    ];
  }

  static fromProjectionMatrix(m: Mat4): Frustum {
    const planes: Vec4[] = [];

    // Extract planes from projection matrix
    // Near plane
    planes.push(new Vec4(
      m.m03 + m.m02,
      m.m13 + m.m12,
      m.m23 + m.m22,
      m.m33 + m.m32
    ).normalize());

    // Far plane
    planes.push(new Vec4(
      m.m03 - m.m02,
      m.m13 - m.m12,
      m.m23 - m.m22,
      m.m33 - m.m32
    ).normalize());

    // Left plane
    planes.push(new Vec4(
      m.m03 + m.m00,
      m.m13 + m.m10,
      m.m23 + m.m20,
      m.m33 + m.m30
    ).normalize());

    // Right plane
    planes.push(new Vec4(
      m.m03 - m.m00,
      m.m13 - m.m10,
      m.m23 - m.m20,
      m.m33 - m.m30
    ).normalize());

    // Bottom plane
    planes.push(new Vec4(
      m.m03 + m.m01,
      m.m13 + m.m11,
      m.m23 + m.m21,
      m.m33 + m.m31
    ).normalize());

    // Top plane
    planes.push(new Vec4(
      m.m03 - m.m01,
      m.m13 - m.m11,
      m.m23 - m.m21,
      m.m33 - m.m31
    ).normalize());

    return new Frustum(planes);
  }

  intersectsBoundingBox(box: BoundingBox): boolean {
    const center = box.center;
    const extent = new Vec3(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z).scale(0.5);

    for (const plane of this.planes) {
      const normal = new Vec3(plane.x, plane.y, plane.z);
      const d = plane.w;

      const r = Math.abs(normal.x * extent.x) + Math.abs(normal.y * extent.y) + Math.abs(normal.z * extent.z);
      const s = normal.dot(center) + d;

      if (s - r > 0) continue;
      if (s + r < 0) return false;
    }

    return true;
  }

  intersectsBoundingSphere(sphere: BoundingSphere): boolean {
    for (const plane of this.planes) {
      const normal = new Vec3(plane.x, plane.y, plane.z);
      const distance = normal.dot(sphere.center) + plane.w;
      if (distance < -sphere.radius) {
        return false;
      }
    }
    return true;
  }

  containsPoint(point: Vec3): boolean {
    for (const plane of this.planes) {
      const normal = new Vec3(plane.x, plane.y, plane.z);
      const distance = normal.dot(point) + plane.w;
      if (distance < 0) {
        return false;
      }
    }
    return true;
  }

  clone(): Frustum {
    return new Frustum(this.planes.map(p => p.clone()));
  }

  equals(other: Frustum): boolean {
    if (this.planes.length !== other.planes.length) return false;
    for (let i = 0; i < this.planes.length; i++) {
      if (!this.planes[i].equals(other.planes[i])) return false;
    }
    return true;
  }

  toString(): string {
    return `Frustum(${this.planes.map(p => p.toString()).join(', ')})`;
  }
}
