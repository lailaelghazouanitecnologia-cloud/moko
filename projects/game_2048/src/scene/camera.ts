import { Mat4 } from '../math/mat4';
import { Vec2 } from '../math/vec2';
import { Vec3 } from '../math/vec3';
import { Vec4 } from '../math/vec4';
import { Frustum } from '../math/frustum';
import { Transform } from './transform';

/**
 * Scene viewpoint for rendering.
 * Manages projection and view matrices for perspective and orthographic cameras.
 */
export class Camera {
  fov: number = 45;
  aspect: number = 16 / 9;
  near: number = 0.1;
  far: number = 1000;
  projectionMatrix: Mat4 = new Mat4();
  viewMatrix: Mat4 = new Mat4();

  /**
   * Configure perspective projection.
   * @param fov - Field of view in degrees
   * @param aspect - Aspect ratio (width / height)
   * @param near - Near clipping plane distance
   * @param far - Far clipping plane distance
   * @throws {Error} If any parameter is NaN, infinite, or if near/far are not positive with far > near
   */
  setPerspective(fov: number, aspect: number, near: number, far: number): void {
    this.validateProjectionParams(fov, aspect, near, far);
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.projectionMatrix.setPerspective(fov, aspect, near, far);
  }

  /**
   * Configure orthographic projection.
   * @param left - Left clipping plane
   * @param right - Right clipping plane
   * @param bottom - Bottom clipping plane
   * @param top - Top clipping plane
   * @param near - Near clipping plane distance
   * @param far - Far clipping plane distance
   * @throws {Error} If any parameter is NaN or infinite
   */
  setOrthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): void {
    this.validateOrthographicParams(left, right, bottom, top, near, far);
    this.near = near;
    this.far = far;
    this.projectionMatrix.setOrthographic(left, right, bottom, top, near, far);
  }

  /**
   * Recalculate view matrix based on transform.
   * @param transform - Transform component providing world position and rotation
   * @throws {Error} If transform is null or undefined
   */
  updateMatrices(transform: Transform): void {
    if (!transform) {
      throw new Error('Transform cannot be null or undefined');
    }

    const worldPos = transform.getWorldPosition();
    const worldRot = transform.getWorldRotation();
    const lookAt = new Vec3(0, 0, -1);
    const up = new Vec3(0, 1, 0);
    worldRot.transformVector(lookAt, lookAt);
    lookAt.add(worldPos);
    this.viewMatrix.setLookAt(worldPos, lookAt, up);
  }

  /**
   * Convert screen coordinates to world space.
   * @param screen - 2D screen coordinates
   * @param depth - Normalized depth value (0 to 1)
   * @returns World space position
   * @throws {Error} If screen is null/undefined or depth is not between 0 and 1
   */
  screenToWorld(screen: Vec2, depth: number): Vec3 {
    if (!screen) {
      throw new Error('Screen vector cannot be null or undefined');
    }
    if (typeof depth !== 'number' || isNaN(depth) || !isFinite(depth)) {
      throw new Error('Depth must be a valid number');
    }
    if (depth < 0 || depth > 1) {
      throw new Error('Depth must be between 0 and 1');
    }

    const invProj = new Mat4();
    const invView = new Mat4();
    invProj.copy(this.projectionMatrix).invert();
    invView.copy(this.viewMatrix).invert();
    const clipX = (screen.data[0] / (this.aspect * 100)) * 2 - 1;
    const clipY = 1 - (screen.data[1] / 100) * 2;
    const clipPos = new Vec4(clipX, clipY, depth * 2 - 1, 1);
    const viewPos = new Vec4();
    const worldPos = new Vec4();
    invProj.transformVec4(clipPos, viewPos);
    viewPos.data[3] = 1;
    invView.transformVec4(viewPos, worldPos);
    return new Vec3(worldPos.data[0], worldPos.data[1], worldPos.data[2]);
  }

  /**
   * Convert world position to screen coordinates.
   * @param world - 3D world position
   * @returns 2D screen coordinates
   * @throws {Error} If world vector is null or undefined
   */
  worldToScreen(world: Vec3): Vec2 {
    if (!world) {
      throw new Error('World vector cannot be null or undefined');
    }

    const viewPos = new Vec4();
    const clipPos = new Vec4();
    const world4 = new Vec4(world.data[0], world.data[1], world.data[2], 1);
    this.viewMatrix.transformVec4(world4, viewPos);
    this.projectionMatrix.transformVec4(viewPos, clipPos);
    const ndcX = clipPos.data[0] / clipPos.data[3];
    const ndcY = clipPos.data[1] / clipPos.data[3];
    const screenX = (ndcX + 1) * 0.5 * (this.aspect * 100);
    const screenY = (1 - ndcY) * 0.5 * 100;
    return new Vec2(screenX, screenY);
  }

  /**
   * Extract frustum planes from projection matrix.
   * @returns Frustum object containing six clipping planes
   * @throws {Error} If projection matrix is invalid
   */
  getFrustum(): Frustum {
    if (!this.projectionMatrix) {
      throw new Error('Projection matrix is not initialized');
    }

    const frustum = new Frustum();
    const m = this.projectionMatrix;
    const m0 = m.data[0], m1 = m.data[1], m2 = m.data[2], m3 = m.data[3];
    const m4 = m.data[4], m5 = m.data[5], m6 = m.data[6], m7 = m.data[7];
    const m8 = m.data[8], m9 = m.data[9], m10 = m.data[10], m11 = m.data[11];
    const m12 = m.data[12], m13 = m.data[13], m14 = m.data[14], m15 = m.data[15];
    const planes = frustum.planes;
    planes[0].set(m3 + m0, m7 + m4, m11 + m8, m15 + m12).normalize();
    planes[1].set(m3 - m0, m7 - m4, m11 - m8, m15 - m12).normalize();
    planes[2].set(m3 - m1, m7 - m5, m11 - m9, m15 - m13).normalize();
    planes[3].set(m3 + m1, m7 + m5, m11 + m9, m15 + m13).normalize();
    planes[4].set(m3 + m2, m7 + m6, m11 + m10, m15 + m14).normalize();
    planes[5].set(m3 - m2, m7 - m6, m11 - m10, m15 - m14).normalize();
    return frustum;
  }

  /**
   * Validates perspective projection parameters.
   * @private
   */
  private validateProjectionParams(fov: number, aspect: number, near: number, far: number): void {
    if ([fov, aspect, near, far].some(v => typeof v !== 'number' || isNaN(v) || !isFinite(v))) {
      throw new Error('All perspective parameters must be valid numbers');
    }
    if (fov <= 0 || fov >= 180) {
      throw new Error('Field of view must be between 0 and 180 degrees');
    }
    if (aspect <= 0) {
      throw new Error('Aspect ratio must be positive');
    }
    if (near <= 0 || far <= 0) {
      throw new Error('Near and far planes must be positive');
    }
    if (near >= far) {
      throw new Error('Far plane must be greater than near plane');
    }
  }

  /**
   * Validates orthographic projection parameters.
   * @private
   */
  private validateOrthographicParams(left: number, right: number, bottom: number, top: number, near: number, far: number): void {
    if ([left, right, bottom, top, near, far].some(v => typeof v !== 'number' || isNaN(v) || !isFinite(v))) {
      throw new Error('All orthographic parameters must be valid numbers');
    }
    if (left >= right) {
      throw new Error('Left must be less than right');
    }
    if (bottom >= top) {
      throw new Error('Bottom must be less than top');
    }
    if (near >= far) {
      throw new Error('Far plane must be greater than near plane');
    }
  }
}
