import { Vec3 } from './vec3';
import { Mat4 } from './mat4';
import { BoundingBox } from './bounding-box';
import { BoundingSphere } from './bounding-sphere';

export interface HitResult {
  point: Vec3;
  distance: number;
  normal: Vec3;
}

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

  set(origin: Vec3, direction: Vec3): Ray {
    this.origin.copy(origin);
    this.direction.copy(direction).normalize();
    return this;
  }

  copy(ray: Ray): Ray {
    this.origin.copy(ray.origin);
    this.direction.copy(ray.direction);
    return this;
  }

  at(t: number, out: Vec3 = new Vec3()): Vec3 {
    return out.copy(this.direction).scale(t).add(this.origin);
  }

  transform(mat: Mat4): Ray {
    const inv = new Mat4().copy(mat).invert();
    this.origin.applyMat4(inv);
    this.direction.transformDirection(inv).normalize();
    return this;
  }

  intersectsBoundingBox(box: BoundingBox): HitResult | null {
    let tmin = -Infinity;
    let tmax = Infinity;

    for (let i = 0; i < 3; i++) {
      const invD = 1 / this.direction.data[i];
      let t1 = (box.min.data[i] - this.origin.data[i]) * invD;
      let t2 = (box.max.data[i] - this.origin.data[i]) * invD;

      if (invD < 0) [t1, t2] = [t2, t1];

      tmin = Math.max(t1, tmin);
      tmax = Math.min(t2, tmax);

      if (tmax < tmin) return null;
    }

    const point = this.at(tmin);
    const normal = new Vec3();
    const center = box.getCenter(new Vec3());
    const size = box.getSize(new Vec3()).scale(0.5);

    for (let i = 0; i < 3; i++) {
      const d = (point.data[i] - center.data[i]) / size.data[i];
      if (Math.abs(d) > 0.999) {
        normal.data[i] = Math.sign(d);
        break;
      }
    }

    return { point, distance: tmin, normal };
  }

  intersectsBoundingSphere(sphere: BoundingSphere): HitResult | null {
    const oc = new Vec3().subVectors(this.origin, sphere.center);
    const a = this.direction.dot(this.direction);
    const b = 2 * oc.dot(this.direction);
    const c = oc.dot(oc) - sphere.radius * sphere.radius;
    const disc = b * b - 4 * a * c;

    if (disc < 0) return null;

    const t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t < 0) return null;

    const point = this.at(t);
    const normal = new Vec3().subVectors(point, sphere.center).normalize();
    return { point, distance: t, normal };
  }

  intersectsPlane(plane: { normal: Vec3; constant: number }): HitResult | null {
    const denom = plane.normal.dot(this.direction);
    if (Math.abs(denom) < 1e-6) return null;

    const t = -(plane.normal.dot(this.origin) + plane.constant) / denom;
    if (t < 0) return null;

    const point = this.at(t);
    return { point, distance: t, normal: plane.normal.clone() };
  }

  intersectsTriangle(triangle: { a: Vec3; b: Vec3; c: Vec3 }): HitResult | null {
    const edge1 = new Vec3().subVectors(triangle.b, triangle.a);
    const edge2 = new Vec3().subVectors(triangle.c, triangle.a);
    const h = new Vec3().crossVectors(this.direction, edge2);
    const a = edge1.dot(h);

    if (Math.abs(a) < 1e-6) return null;

    const f = 1 / a;
    const s = new Vec3().subVectors(this.origin, triangle.a);
    const u = f * s.dot(h);

    if (u < 0 || u > 1) return null;

    const q = new Vec3().crossVectors(s, edge1);
    const v = f * this.direction.dot(q);

    if (v < 0 || u + v > 1) return null;

    const t = f * edge2.dot(q);
    if (t < 0) return null;

    const point = this.at(t);
    const normal = new Vec3().crossVectors(edge1, edge2).normalize();
    return { point, distance: t, normal };
  }

  distanceToPoint(point: Vec3): number {
    const v = new Vec3().subVectors(point, this.origin);
    const t = v.dot(this.direction);
    const proj = new Vec3().copy(this.direction).scale(t);
    return new Vec3().subVectors(v, proj).length();
  }

  intersectsTransform(transform: { position: Vec3; rotation: Quat; scale: Vec3 }): HitResult | null {
    const invPos = new Vec3().copy(transform.position).negate();
    const invScale = new Vec3(1 / transform.scale.x, 1 / transform.scale.y, 1 / transform.scale.z);
    const localOrigin = this.origin.clone().add(invPos).data;
    const localDir = this.direction.clone().data;

    const localRay = new Ray(new Vec3(...localOrigin), new Vec3(...localDir));
    const unitBox = new BoundingBox(new Vec3(-0.5, -0.5, -0.5), new Vec3(0.5, 0.5, 0.5));
    const hit = localRay.intersectsBoundingBox(unitBox);
    if (!hit) return null;

    hit.point.applyMat4(transform);
    hit.normal.transformDirection(transform);
    return hit;
  }
}
