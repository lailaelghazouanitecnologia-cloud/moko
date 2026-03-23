import { Entity } from '../scene';
import { Vec3, Quat, BoundingBox } from '../math';
import { CollisionMesh } from './collision-mesh';
import { ColliderShape } from './collider-shape';
import { PhysicsMaterial } from './physics-material';
import { RaycastResult } from './raycast-result';

export class Collider {
  entity: Entity | null = null;
  shape: ColliderShape = ColliderShape.BOX;
  size: Vec3 = new Vec3(1, 1, 1);
  radius: number = 0.5;
  height: number = 2.0;
  mesh: CollisionMesh | null = null;
  offset: Vec3 = new Vec3(0, 0, 0);
  orientation: Quat = new Quat(0, 0, 0, 1);
  material: PhysicsMaterial | null = null;
  isTrigger: boolean = false;

  setShape(shape: ColliderShape): void {
    this.shape = shape;
  }

  getShape(): ColliderShape {
    return this.shape;
  }

  setSize(size: Vec3): void {
    this.size.copy(size);
  }

  getSize(): Vec3 {
    return this.size.clone();
  }

  setRadius(radius: number): void {
    this.radius = radius;
  }

  getRadius(): number {
    return this.radius;
  }

  setHeight(height: number): void {
    this.height = height;
  }

  getHeight(): number {
    return this.height;
  }

  setMesh(mesh: CollisionMesh): void {
    this.mesh = mesh;
  }

  getMesh(): CollisionMesh | null {
    return this.mesh;
  }

  setOffset(offset: Vec3): void {
    this.offset.copy(offset);
  }

  getOffset(): Vec3 {
    return this.offset.clone();
  }

  setOrientation(orientation: Quat): void {
    this.orientation.copy(orientation);
  }

  getOrientation(): Quat {
    return this.orientation.clone();
  }

  setMaterial(material: PhysicsMaterial): void {
    this.material = material;
  }

  getMaterial(): PhysicsMaterial | null {
    return this.material;
  }

  setTrigger(trigger: boolean): void {
    this.isTrigger = trigger;
  }

  isTrigger(): boolean {
    return this.isTrigger;
  }

  getAABB(): BoundingBox {
    const box = new BoundingBox();
    const worldPos = this.entity ? this.entity.getPosition() : new Vec3(0, 0, 0);
    const worldScale = this.entity ? this.entity.getLocalScale() : new Vec3(1, 1, 1);
    
    switch (this.shape) {
      case ColliderShape.BOX:
        box.center.copy(worldPos).add(this.offset);
        box.halfExtents.set(
          this.size.x * worldScale.x * 0.5,
          this.size.y * worldScale.y * 0.5,
          this.size.z * worldScale.z * 0.5
        );
        break;
      case ColliderShape.SPHERE:
        box.center.copy(worldPos).add(this.offset);
        box.halfExtents.set(this.radius * worldScale.x, this.radius * worldScale.y, this.radius * worldScale.z);
        break;
      case ColliderShape.CAPSULE:
      case ColliderShape.CYLINDER:
        box.center.copy(worldPos).add(this.offset);
        box.halfExtents.set(
          this.radius * worldScale.x,
          this.height * worldScale.y * 0.5,
          this.radius * worldScale.z
        );
        break;
      default:
        box.center.copy(worldPos);
        box.halfExtents.set(0.5, 0.5, 0.5);
    }
    
    return box;
  }

  raycast(from: Vec3, to: Vec3): RaycastResult | null {
    const aabb = this.getAABB();
    const dir = new Vec3().sub2(to, from).normalize();
    const invDir = new Vec3(1 / dir.x, 1 / dir.y, 1 / dir.z);
    
    const min = new Vec3(
      aabb.center.x - aabb.halfExtents.x,
      aabb.center.y - aabb.halfExtents.y,
      aabb.center.z - aabb.halfExtents.z
    );
    const max = new Vec3(
      aabb.center.x + aabb.halfExtents.x,
      aabb.center.y + aabb.halfExtents.y,
      aabb.center.z + aabb.halfExtents.z
    );
    
    let t1 = (min.x - from.x) * invDir.x;
    let t2 = (max.x - from.x) * invDir.x;
    let t3 = (min.y - from.y) * invDir.y;
    let t4 = (max.y - from.y) * invDir.y;
    let t5 = (min.z - from.z) * invDir.z;
    let t6 = (max.z - from.z) * invDir.z;
    
    let tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
    let tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));
    
    if (tmax < 0 || tmin > tmax) return null;
    
    const t = tmin < 0 ? tmax : tmin;
    if (t < 0 || t > 1) return null;
    
    const hit = new Vec3().lerp(from, to, t);
    const normal = new Vec3();
    
    const c = aabb.center;
    const e = aabb.halfExtents;
    const p = hit;
    
    const d = new Vec3(
      (p.x - c.x) / e.x,
      (p.y - c.y) / e.y,
      (p.z - c.z) / e.z
    );
    
    const absDx = Math.abs(d.x);
    const absDy = Math.abs(d.y);
    const absDz = Math.abs(d.z);
    
    if (absDx >= absDy && absDx >= absDz) {
      normal.set(d.x > 0 ? 1 : -1, 0, 0);
    } else if (absDy >= absDx && absDy >= absDz) {
      normal.set(0, d.y > 0 ? 1 : -1, 0);
    } else {
      normal.set(0, 0, d.z > 0 ? 1 : -1);
    }
    
    const result = new RaycastResult();
    result.point.copy(hit);
    result.normal.copy(normal);
    result.distance = t * from.distance(to);
    result.entity = this.entity;
    
    return result;
  }
}
