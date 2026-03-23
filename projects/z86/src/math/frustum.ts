import { Vec3 } from './vec3';
import { Mat4 } from './mat4';
import { BoundingBox } from './bounding-box';
import { BoundingSphere } from './bounding-sphere';

export class Frustum {
  private planes: Vec3[] = new Array(6);

  constructor(m?: Mat4) {
    for (let i = 0; i < 6; i++) {
      this.planes[i] = new Vec3();
    }
    if (m) {
      this.setFromMatrix(m);
    }
  }

  setFromMatrix(m: Mat4): void {
    const me = m.elements;
    const planes = this.planes;

    // Extract frustum planes from the view-projection matrix
    // Left plane
    planes[0].set(me[3] + me[0], me[7] + me[4], me[11] + me[8]).normalize();
    // Right plane
    planes[1].set(me[3] - me[0], me[7] - me[4], me[11] - me[8]).normalize();
    // Bottom plane
    planes[2].set(me[3] + me[1], me[7] + me[5], me[11] + me[9]).normalize();
    // Top plane
    planes[3].set(me[3] - me[1], me[7] - me[5], me[11] - me[9]).normalize();
    // Near plane
    planes[4].set(me[3] + me[2], me[7] + me[6], me[11] + me[10]).normalize();
    // Far plane
    planes[5].set(me[3] - me[2], me[7] - me[6], me[11] - me[10]).normalize();
  }

  containsPoint(point: Vec3): boolean {
    for (let i = 0; i < 6; i++) {
      const plane = this.planes[i];
      const distance = plane.x * point.x + plane.y * point.y + plane.z * point.z;
      if (distance < 0) {
        return false;
      }
    }
    return true;
  }

  intersectsSphere(sphere: BoundingSphere): boolean {
    const center = sphere.center;
    const negRadius = -sphere.radius;

    for (let i = 0; i < 6; i++) {
      const plane = this.planes[i];
      const distance = plane.x * center.x + plane.y * center.y + plane.z * center.z;
      if (distance < negRadius) {
        return false;
      }
    }
    return true;
  }

  intersectsBox(box: BoundingBox): boolean {
    const min = box.min;
    const max = box.max;

    for (let i = 0; i < 6; i++) {
      const plane = this.planes[i];
      const px = plane.x;
      const py = plane.y;
      const pz = plane.z;

      const x = px < 0 ? min.x : max.x;
      const y = py < 0 ? min.y : max.y;
      const z = pz < 0 ? min.z : max.z;

      const distance = px * x + py * y + pz * z;
      if (distance < 0) {
        return false;
      }
    }
    return true;
  }
}
