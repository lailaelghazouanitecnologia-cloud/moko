import { Vec3 } from '../math/vec3';
import { Mat4 } from '../math/mat4';
// UNRESOLVED: import { AABB } from './aabb';
import { BoundingSphere } from '../math/bounding-sphere';
import { Ray } from '../math/ray';
import { RaycastResult } from './raycast-result';

/**
 * CollisionMesh is a triangle mesh used for collision detection in 3D space.
 * It stores vertices and indices to define the geometry and provides methods
 for intersection tests with rays, spheres, and boxes.
 */
export class CollisionMesh {
  vertices: Float32Array;
  indices: Uint32Array;
  bounds: AABB;
  triangleCount: number;

  /**
   * Creates a new CollisionMesh.
   * @param vertices - Flat array of vertex positions (x,y,z for each vertex). If not provided, an empty array is used.
   * @param indices - Flat array of triangle indices (3 per triangle). If not provided, an empty array is used.
   */
  constructor(vertices?: Float32Array, indices?: Uint32Array) {
    this.vertices = vertices || new Float32Array(0);
    this.indices = indices || new Uint32Array(0);
    this.bounds = new AABB();
    this.triangleCount = Math.floor(this.indices.length / 3);
    this.buildAABB();
  }

  /**
   * Computes the axis-aligned bounding box (AABB) that encloses all vertices.
   * @returns The computed AABB.
   */
  buildAABB(): AABB {
    if (this.vertices.length === 0) {
      this.bounds = new AABB();
      return this.bounds;
    }

    let minX = this.vertices[0];
    let minY = this.vertices[1];
    let minZ = this.isFinite(this.vertices[2]) ? this.vertices[2] : 0;
    let maxX = this.vertices[0];
    let maxY = this.vertices[1];
    let maxZ = this.isFinite(this.vertices[2]) ? this.vertices[2] : 0;

    for (let i = 3; i < this.vertices.length; i += 3) {
      const x = this.vertices[i];
      const y = this.vertices[i + 1];
      const z = this.vertices[i + 2];

      if (!this.isFinite(x) || !this.isFinite(y) || !this.isFinite(z)) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }

    this.bounds.min.set(minX, minY, minZ);
    this.bounds.max.set(maxX, maxY, maxZ);
    return this.bounds;
  }

  /**
   * Performs a raycast intersection test against the mesh.
   * @param ray - The ray to test.
   * @returns A RaycastResult with hit information or a miss.
   */
  intersectRay(ray: Ray): RaycastResult {
    if (!ray) {
      throw new Error('Ray must be provided');
    }

    let hit = false;
    let closestDistance = Number.MAX_VALUE;
    let hitPoint = new Vec3();
    let hitNormal = new Vec3();
    let hitTriangle = -1;

    for (let i = 0; i < this.indices.length; i += 3) {
      const i0 = this.indices[i];
      const i1 = this.indices[i + 1];
      const i2 = this.indices[i + 2];

      if (!this.isValidTriangleIndex(i0) || !this.isValidTriangleIndex(i1) || !this.isValidTriangleIndex(i2)) {
        continue;
      }

      const v0 = new Vec3(this.vertices[i0 * 3], this.vertices[i0 * 3 + 1], this.vertices[i0 * 3 + 2]);
      const v1 = new Vec3(this.vertices[i1 * 3], this.vertices[i1 * 3 + 1], this.vertices[i1 * 3 + 2]);
      const v2 = new Vec3(this.vertices[i2 * 3], this.vertices[i2 * 3 + 1], this.vertices[i2 * 3 + 2]);

      const edge1 = new Vec3().sub2(v1, v0);
      const edge2 = new Vec3().sub2(v2, v0);
      const h = new Vec3().cross2(ray.direction, edge2);
      const a = edge1.dot(h);

      if (Math.abs(a) < 0.00001) continue;

      const f = 1 / a;
      const s = new Vec3().sub2(ray.origin, v0);
      const u = f * s.dot(h);

      if (u < 0 || u > 1) continue;

      const q = new Vec3().cross2(s, edge1);
      const v = f * ray.direction.dot(q);

      if (v < 0 || u + v > 1) continue;

      const t = f * edge2.dot(q);

      if (t > 0.00001 && t < closestDistance) {
        hit = true;
        closestDistance = t;
        hitPoint.copy(ray.origin).add(ray.direction.clone().scale(t));
        
        const normal = new Vec3().cross2(edge1, edge2).normalize();
        hitNormal.copy(normal);
        hitTriangle = Math.floor(i / 3);
      }
    }

    if (hit) {
      return RaycastResult.hit(hitPoint, hitNormal, closestDistance, null);
    } else {
      return RaycastResult.miss();
    }
  }

  /**
   * Tests if a sphere overlaps any part of the mesh.
   * @param sphere - The sphere to test.
   * @returns True if the sphere intersects the mesh, false otherwise.
   */
  intersectSphere(sphere: BoundingSphere): boolean {
    if (!sphere) {
      throw new Error('Sphere must be provided');
    }

    const closestPoint = new Vec3();
    let minDistanceSq = Number.MAX_VALUE;

    for (let i = 0; i < this.indices.length; i += 3) {
      const i0 = this.indices[i];
      const i1 = this.indices[i + 1];
      const i2 = this.indices[i + 2];

      if (!this.isValidTriangleIndex(i0) || !this.isValidTriangleIndex(i1) || !this.isValidTriangleIndex(i2)) {
        continue;
      }

      const v0 = new Vec3(this.vertices[i0 * 3], this.vertices[i0 * 3 + 1], this.vertices[i0 * 3 + 2]);
      const v1 = new Vec3(this.vertices[i1 * 3], this.vertices[i1 * 3 + 1], this.vertices[i1 * 3 + 2]);
      const v2 = new Vec3(this.vertices[i2 * 3], this.vertices[i2 * 3 + 1], this.vertices[i2 * 3 + 2]);

      const edge1 = new Vec3().sub2(v1, v0);
      const edge2 = new Vec3().sub2(v2, v0);
      const normal = new Vec3().cross2(edge1, edge2).normalize();

      const distance = Math.abs(new Vec3().sub2(sphere.center, v0).dot(normal));
      if (distance <= sphere.radius) {
        return true;
      }

      const pointOnTriangle = this.closestPointOnTriangle(sphere.center, v0, v1, v2);
      const distanceSq = pointOnTriangle.distanceSq(sphere.center);
      minDistanceSq = Math.min(minDistanceSq, distanceSq);
    }

    return minDistanceSq <= sphere.radius * sphere.radius;
  }

  /**
   * Tests if an AABB overlaps any part of the mesh.
   * @param box - The AABB to test.
   * @returns True if the box intersects the mesh, false otherwise.
   */
  intersectBox(box: AABB): boolean {
    if (!box) {
      throw new Error('Box must be provided');
    }

    const boxCenter = new Vec3();
    box.getCenter(boxCenter);

    for (let i = 0; i < this.indices.length; i += 3) {
      const i0 = this.indices[i];
      const i1 = this.indices[i + 1];
      const i2 = this.indices[i + 2];

      if (!this.isValidTriangleIndex(i0) || !this.isValidTriangleIndex(i1) || !this.isValidTriangleIndex(i2)) {
        continue;
      }

      const v0 = new Vec3(this.vertices[i0 * 3], this.vertices[i0 * 3 + 1], this.vertices[i0 * 3 + 2]);
      const v1 = new Vec3(this.vertices[i1 * 3], this.vertices[i1 * 3 + 1], this.vertices[i1 * 3 + 2]);
      const v2 = new Vec3(this.vertices[i2 * 3], this.vertices[i2 * 3 + 1], this.vertices[i2 * 3 + 2]);

      if (this.triangleIntersectsAABB(v0, v1, v2, box)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Retrieves the vertices of a triangle by index.
   * @param index - The triangle index (0 to triangleCount - 1).
   * @returns An object with v0, v1, v2 as Vec3.
   */
  getTriangle(index: number): { v0: Vec3, v1: Vec3, v2: Vec3 } {
    if (!Number.isInteger(index) || index < 0 || index >= this.triangleCount) {
      throw new Error('Triangle index out of range');
    }

    const i0 = this.indices[index * 3];
    const i1 = this.indices[index * 3 + 1];
    const i2 = this.indices[index * 3 + 2];

    return {
      v0: new Vec3(this.vertices[i0 * 3], this.vertices[i0 * 3 + 1], this.vertices[i0 * 3 + 2]),
      v1: new Vec3(this.vertices[i1 * 3], this.vertices[i1 * 3 + 1], this.vertices[i1 * 3 + 2]),
      v2: new Vec3(this.vertices[i2 * 3], this.vertices[i2 * 3 + 1], this.vertices[i2 * 3 + 2])
    };
  }

  /**
   * Applies a transformation matrix to the vertices of the mesh.
   * @param matrix - The transformation matrix to apply.
   * @returns A new Collision with transformed vertices.
   * @throws Error if matrix is not provided.
   */
  transform(matrix: Mat4): CollisionMesh {
    if (!matrix) {
      throw new Error('Transform matrix must be provided');
    }

    const transformedVertices = new Float32Array(this.vertices.length);

    for (let i = 0; i < this.vertices.length; i += 3) {
      const point = new Vec3(this.vertices[i], this.vertices[i + 1], this.vertices[i + 2]);
      const transformed = matrix.transformPoint(point);
      transformedVertices[i] = transformed.x;
      transformedVertices[i + 1] = transformed.y;
      transformedVertices[i + 2] = transformed.z;
    }

    const result = new CollisionMesh(transformedVertices, this.indices);
    return result;
  }

  /**
   * Serializes the mesh into a binary ArrayBuffer.
   * Format: 4 bytes (vertex buffer size) + 4 bytes (index buffer size) + vertex data + index data.
   * @returns The serialized ArrayBuffer.
   */
  serialize(): ArrayBuffer {
    const vertexBuffer = this.vertices;
    const indexBuffer = this.indices;
    
    const vertexSize = vertexBuffer.byteLength;
    const indexSize = indexBuffer.byteLength;
    
    const totalSize = 8 + vertexSize + indexSize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    
    view.setUint32(0, vertexSize, true);
    view.setUint32(4, indexSize, true);
    
    const vertexBytes = new Uint8Array(vertexBuffer);
    const indexBytes = new Uint8Array(indexBuffer);
    
    let offset = 8;
    for (let i = 0; i < vertexBytes.length; i++) {
      view.setUint8(offset++, vertexBytes[i]);
    }
    
    for (let i = 0; i < indexBytes.length; i++) {
      view.setUint8(offset++, indexBytes[i]);
    }
    
    return buffer;
  }

  /**
   * Deserializes a CollisionMesh from an ArrayBuffer.
   * @param buffer - The ArrayBuffer to deserialize from.
   * @returns A new Collision instance.
   * @throws Error if buffer is invalid or too small.
   */
  static deserialize(buffer: ArrayBuffer): CollisionMesh {
    if (!buffer || buffer.byteLength < 8) {
      throw new Error('Invalid buffer: too small');
    }

    const view = new DataView(buffer);
    
    const vertexSize = view.getUint32(0, true);
    const indexSize = view.getUint32(4, true);
    
    const expectedSize = 8 + vertexSize + indexSize;
    if (buffer.byteLength < expectedSize) {
      throw new Error('Invalid buffer: truncated data');
    }
    
    let offset = 8;
    
    const vertexBytes = new Uint8Array(vertexSize);
    for (let i = 0; i < vertexSize; i++) {
      vertexBytes[i] = view.getUint8(offset++);
    }
    
    const indexBytes = new Uint8Array(indexSize);
    for (let i = 0; i < indexSize; i++) {
      indexBytes[i] = view.getUint8(offset++);
    }
    
    const vertices = new Float32Array(vertexBytes.buffer, vertexBytes.byteOffset, vertexSize / 4);
    const indices = new Uint32Array(indexBytes.buffer, indexBytes.byteOffset, indexSize / 4);
    
    return new CollisionMesh(vertices, indices);
  }

  /**
   * Finds the closest point on a triangle to a given point.
   * @param point - The point to test.
   * @param a - First vertex of the triangle.
   * @param b - Second vertex of the triangle.
   * @param c - Third vertex of the triangle.
   * @returns The closest point on the triangle.
   */
  private closestPointOnTriangle(point: Vec3, a: Vec3, b: Vec3, c: Vec3): Vec3 {
    const ab = new Vec3().sub2(b, a);
    const ac = new Vec3().sub2(c, a);
    const ap = new Vec3().sub2(point, a);

    const d1 = ab.dot(ap);
    const d2 = ac.dot(ap);
    if (d1 <= 0 && d2 <= 0) return a.clone();

    const bp = new Vec3().sub2(point, b);
    const d3 = ab.dot(bp);
    const d4 = ac.dot(bp);
    if (d3 >= 0 && d4 <= d3) return b.clone();

    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
      const v = d1 / (d1 - d3);
      return new Vec3().add2(a, ab.scale(v));
    }

    const cp = new Vec3().sub2(point, c);
    const d5 = ab.dot(cp);
    const d6 = ac.dot(cp);
    if (d6 >= 0 && d5 <= d6) return c.clone();

    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
      const w = d2 / (d2 - d6);
      return new Vec3().add2(a, ac.scale(w));
    }

    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
      const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
      return new Vec3().add2(b, new Vec3().sub2(c, b).scale(w));
    }

    const denom = 1 / (va + vb + vc);
    const v = vb * denom;
    const w = vc * denom;
    return new Vec3().add2(a, ab.scale(v)).add(ac.scale(w));
  }

  /**
   * Tests if a triangle intersects an AABB using a simple AABB-triangle overlap.
   * @param v0 - First vertex of the triangle.
   * @param v1 - Second vertex of the triangle.
   * @param v2 - Third vertex of the triangle.
   * @param box - The AABB to test against.
   * @returns True if the triangle intersects the box, false otherwise.
   */
  private triangleIntersectsAABB(v0: Vec3, v1: Vec3, v2: Vec3, box: AABB): boolean {
    const boxMin = box.min;
    const boxMax = box.max;

    const triMin = new Vec3(
      Math.min(v0.x, Math.min(v1.x, v2.x)),
      Math.min(v0.y, Math.min(v1.y, v2.y)),
      Math.min(v0.z, Math.min(v1.z, v2.z))
    );

    const triMax = new Vec3(
      Math.max(v0.x, Math.max(v1.x, v2.x)),
      Math.max(v0.y, Math.max(v1.y, v2.y)),
      Math.max(v0.z, Math.max(v1.z, v2.z))
    );

    if (triMax.x < boxMin.x || triMin.x > boxMax.x) return false;
    if (triMax.y < boxMin.y || triMin.y > boxMax.y) return false;
    if (triMax.z < boxMin.z || triMin.z > boxMax.z) return false;

    return true;
  }

  /**
   * Checks if a number is finite (not NaN or Infinity).
   * @param n - The number to check.
   * @returns True if the number is finite, false otherwise.
   */
  private isFinite(n: number): boolean {
    return Number.isFinite(n);
  }

  /**
   * Validates if a triangle index is within the valid range of vertices.
   * @param index - The index to validate.
   * @returns True if the index is valid, false otherwise.
   */
  private isValidTriangleIndex(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < this.vertices.length / 3;
  }
}
