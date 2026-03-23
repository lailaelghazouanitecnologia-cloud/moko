import { Vec3 } from './vec3';

export class Ray {
  origin: Vec3;
  direction: Vec3;

  constructor(origin: Vec3 = new Vec3(), direction: Vec3 = new Vec3(0, 0, -1)) {
    this.origin = origin.clone();
    this.direction = direction.clone().normalize();
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

  at(t: number, target: Vec3 = new Vec3()): Vec3 {
    return target.copy(this.direction).multiplyScalar(t).add(this.origin);
  }

  lookAt(v: Vec3): Ray {
    this.direction.copy(v).sub(this.origin).normalize();
    return this;
  }

  recast(t: number): Ray {
    this.origin.copy(this.at(t));
    return this;
  }

  closestPointToPoint(point: Vec3, target: Vec3 = new Vec3()): Vec3 {
    const v = target.subVectors(point, this.origin);
    const t = v.dot(this.direction);
    if (t < 0) {
      return target.copy(this.origin);
    }
    return target.copy(this.direction).multiplyScalar(t).add(this.origin);
  }

  distanceToPoint(point: Vec3): number {
    return Math.sqrt(this.distanceSqToPoint(point));
  }

  distanceSqToPoint(point: Vec3): number {
    const v = new Vec3().subVectors(point, this.origin);
    const t = v.dot(this.direction);
    if (t < 0) {
      return this.origin.distanceToSquared(point);
    }
    const projected = new Vec3().copy(this.direction).multiplyScalar(t).add(this.origin);
    return projected.distanceToSquared(point);
  }

  distanceSqToSegment(v0: Vec3, v1: Vec3, optionalPointOnRay?: Vec3, optionalPointOnSegment?: Vec3): number {
    const segCenter = new Vec3().addVectors(v0, v1).multiplyScalar(0.5);
    const segDir = new Vec3().subVectors(v1, v0).normalize();
    const diff = new Vec3().subVectors(this.origin, segCenter);

    const segExtent = v0.distanceTo(v1) * 0.5;
    const a01 = -this.direction.dot(segDir);
    const b0 = diff.dot(this.direction);
    const b1 = -diff.dot(segDir);
    const c = diff.lengthSq();
    const det = Math.abs(1 - a01 * a01);
    let s0, s1, sqrDist, extDet;

    if (det > 0) {
      s0 = a01 * b1 - b0;
      s1 = a01 * b0 - b1;
      extDet = segExtent * det;

      if (s0 >= 0) {
        if (s1 >= -extDet) {
          if (s1 <= extDet) {
            const invDet = 1 / det;
            s0 *= invDet;
            s1 *= invDet;
            sqrDist = s0 * (s0 + a01 * s1 + 2 * b0) + s1 * (a01 * s0 + s1 + 2 * b1) + c;
          } else {
            s1 = segExtent;
            s0 = Math.max(0, -(a01 * s1 + b0));
            sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
          }
        } else {
          s1 = -segExtent;
          s0 = Math.max(0, -(a01 * s1 + b0));
          sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
        }
      } else {
        s1 = b0 < 0 ? -segExtent : segExtent;
        s0 = Math.max(0, -(a01 * s1 + b0));
        sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
      }
    } else {
      s1 = a01 > 0 ? -segExtent : segExtent;
      s0 = Math.max(0, -(a01 * s1 + b0));
      sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
    }

    if (optionalPointOnRay) {
      optionalPointOnRay.copy(this.direction).multiplyScalar(s0).add(this.origin);
    }

    if (optionalPointOnSegment) {
      optionalPointOnSegment.copy(segDir).multiplyScalar(s1).add(segCenter);
    }

    return sqrDist;
  }

  intersectSphere(sphere: { center: Vec3; radius: number }, target: Vec3 = new Vec3()): Vec3 | null {
    const v1 = new Vec3().subVectors(sphere.center, this.origin);
    const tca = v1.dot(this.direction);
    const d2 = v1.dot(v1) - tca * tca;
    const radius2 = sphere.radius * sphere.radius;

    if (d2 > radius2) return null;

    const thc = Math.sqrt(radius2 - d2);
    const t0 = tca - thc;
    const t1 = tca + thc;

    if (t0 < 0 && t1 < 0) return null;

    if (t0 < 0) return this.at(t1, target);
    return this.at(t0, target);
  }

  intersectsSphere(sphere: { center: Vec3; radius: number }): boolean {
    return this.distanceSqToPoint(sphere.center) <= (sphere.radius * sphere.radius);
  }

  distanceToPlane(plane: { normal: Vec3; constant: number }): number {
    const denominator = plane.normal.dot(this.direction);

    if (denominator === 0) {
      return plane.normal.dot(this.origin) + plane.constant === 0 ? 0 : -1;
    }

    const t = -(plane.normal.dot(this.origin) + plane.constant) / denominator;
    return t >= 0 ? t : -1;
  }

  intersectPlane(plane: { normal: Vec3; constant: number }, target: Vec3 = new Vec3()): Vec3 | null {
    const t = this.distanceToPlane(plane);

    if (t === -1) return null;

    return this.at(t, target);
  }

  intersectsPlane(plane: { normal: Vec3; constant: number }): boolean {
    const distToPoint = plane.normal.dot(this.origin) + plane.constant;
    return distToPoint === 0 || (distToPoint > 0 ? 1 : -1) !== (plane.normal.dot(this.direction) > 0 ? 1 : -1);
  }

  intersectBox(box: { min: Vec3; max: Vec3 }, target: Vec3 = new Vec3()): Vec3 | null {
    let tmin, tmax, t1, t2;
    const invdirx = 1 / this.direction.x;
    const invdiry = 1 / this.direction.y;
    const invdirz = 1 / this.direction.z;

    const origin = this.origin;

    if (invdirx >= 0) {
      tmin = (box.min.x - origin.x) * invdirx;
      tmax = (box.max.x - origin.x) * invdirx;
    } else {
      tmin = (box.max.x - origin.x) * invdirx;
      tmax = (box.min.x - origin.x) * invdirx;
    }

    if (invdiry >= 0) {
      t1 = (box.min.y - origin.y) * invdiry;
      t2 = (box.max.y - origin.y) * invdiry;
    } else {
      t1 = (box.max.y - origin.y) * invdiry;
      t2 = (box.min.y - origin.y) * invdiry;
    }

    if (tmin > t2 || t1 > tmax) return null;
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;

    if (invdirz >= 0) {
      t1 = (box.min.z - origin.z) * invdirz;
      t2 = (box.max.z - origin.z) * invdirz;
    } else {
      t1 = (box.max.z - origin.z) * invdirz;
      t2 = (box.min.z - origin.z) * invdirz;
    }

    if (tmin > t2 || t1 > tmax) return null;
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;

    if (tmax < 0) return null;
    return this.at(tmin >= 0 ? tmin : tmax, target);
  }

  intersectsBox(box: { min: Vec3; max: Vec3 }): boolean {
    return this.intersectBox(box) !== null;
  }

  intersectTriangle(a: Vec3, b: Vec3, c: Vec3, backfaceCulling: boolean = false, target: Vec3 = new Vec3()): Vec3 | null {
    const edge1 = new Vec3().subVectors(b, a);
    const edge2 = new Vec3().subVectors(c, a);
    const normal = new Vec3().crossVectors(edge1, edge2);

    let DdN = this.direction.dot(normal);
    let sign;

    if (DdN > 0) {
      if (backfaceCulling) return null;
      sign = 1;
    } else if (DdN < 0) {
      sign = -1;
      DdN = -DdN;
    } else {
      return null;
    }

    const diff = new Vec3().subVectors(this.origin, a);
    const DdQxE2 = sign * this.direction.dot(edge2.crossVectors(diff, edge2));

    if (DdQxE2 < 0) return null;

    const DdE1xQ = sign * this.direction.dot(edge1.cross(diff));

    if (DdE1xQ < 0) return null;

    if (DdQxE2 + DdE1xQ > DdN) return null;

    const QdN = -sign * diff.dot(normal);

    if (QdN < 0) return null;

    return this.at(QdN / DdN, target);
  }

  applyMatrix4(matrix: Mat4): Ray {
    this.origin.applyMatrix4(matrix);
    this.direction.transformDirection(matrix);
    return this;
  }

  equals(ray: Ray): boolean {
    return ray.origin.equals(this.origin) && ray.direction.equals(this.direction);
  }

  toArray(array: number[] = [], offset: number = 0): number[] {
    array[offset] = this.origin.x;
    array[offset + 1] = this.origin.y;
    array[offset + 2] = this.origin.z;
    array[offset + 3] = this.direction.x;
    array[offset + 4] = this.direction.y;
    array[offset + 5] = this.direction.z;
    return array;
  }

  fromArray(array: number[], offset: number = 0): Ray {
    this.origin.x = array[offset];
    this.origin.y = array[offset + 1];
    this.origin.z = array[offset + 2];
    this.direction.x = array[offset + 3];
    this.direction.y = array[offset + 4];
    this.direction.z = array[offset + 5];
    return this;
  }
}
