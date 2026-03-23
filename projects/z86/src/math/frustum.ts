import { Vec3 } from './vec3';
import { Mat4 } from './mat4';
import { BoundingBox } from './bounding-box';
import { BoundingSphere } from './bounding-sphere';

export class Frustum {
  private planes: Vec4[];

  constructor() {
    this.planes = [
      new Vec4(0, 0, 0, 0),
      new Vec4(0, 0, 0, 0),
      new Vec4(0, 0, 0, 0),
      new Vec4(0, 0, 0, 0),
      new Vec4(0, 0, 0, 0),
      new Vec4(0, 0, 0, 0)
    ];
  }

  static fromMatrix(m: Mat4): Frustum {
    const f = new Frustum();
    const me = m.elements;
    const planes = f.planes;

    planes[0].set(me[3] - me[0], me[7] - me[4], me[11] - me[8], me[15] - me[12]).normalize();
    planes[1].set(me[3] + me[0], me[7] + me[4], me[11] + me[8], me[15] + me[12]).normalize();
    planes[2].set(me[3] + me[1], me[7] + me[5], me[11] + me[9], me[15] + me[13]).normalize();
    planes[3].set(me[3] - me[1], me[7] - me[5], me[11] - me[9], me[15] - me[13]).normalize();
    planes[4].set(me[3] - me[2], me[7] - me[6], me[11] - me[10], me[15] - me[14]).normalize();
    planes[5].set(me[3] + me[2], me[7] + me[6], me[11] + me[10], me[15] + me[14]).normalize();

    return f;
  }

  intersectsBox(box: BoundingBox): boolean {
    const planes = this.planes;
    const min = box.min;
    const max = box.max;

    for (let i = 0; i < 6; i++) {
      const p = planes[i];
      const x = p.x > 0 ? max.x : min.x;
      const y = p.y > 0 ? max.y : min.y;
      const z = p.z > 0 ? max.z : min.z;
      if (p.x * x + p.y * y + p.z * z + p.w < 0) {
        return false;
      }
    }
    return true;
  }

  intersectsSphere(sphere: BoundingSphere): boolean {
    const planes = this.planes;
    const center = sphere.center;
    const negRadius = -sphere.radius;

    for (let i = 0; i < 6; i++) {
      const p = planes[i];
      const distance = p.x * center.x + p.y * center.y + p.z * center.z + p.w;
      if (distance < negRadius) {
        return false;
      }
    }
    return true;
  }

  containsPoint(point: Vec3): boolean {
    const planes = this.planes;

    for (let i = 0; i < 6; i++) {
      const p = planes[i];
      if (p.x * point.x + p.y * point.y + p.z * point.z + p.w < 0) {
        return false;
      }
    }
    return true;
  }

  set(p0: Vec4, p1: Vec4, p2: Vec4, p3: Vec4, p4: Vec4, p5: Vec4): Frustum {
    this.planes[0].copy(p0);
    this.planes[1].copy(p1);
    this.planes[2].copy(p2);
    this.planes[3].copy(p3);
    this.planes[4].copy(p4);
    this.planes[5].copy(p5);
    return this;
  }

  copy(frustum: Frustum): Frustum {
    for (let i = 0; i < 6; i++) {
      this.planes[i].copy(frustum.planes[i]);
    }
    return this;
  }

  clone(): Frustum {
    return new Frustum().copy(this);
  }

  equals(frustum: Frustum): boolean {
    for (let i = 0; i < 6; i++) {
      if (!this.planes[i].equals(frustum.planes[i])) {
        return false;
      }
    }
    return true;
  }
}
