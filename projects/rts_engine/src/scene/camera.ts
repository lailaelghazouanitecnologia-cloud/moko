import { Mat4 } from '../math/mat4';
import { Vec3 } from '../vec3';
import { Vec4 } from '../vec4';
import { Vec2 } from '../vec2';
import { Frustum } from '../math/frustum';
import { Transform } from './transform';

export class Camera {
    fov: number = 45;
    aspect: number = 1;
    near: number = 0.1;
    far: number = 1000;
    projectionMatrix: Mat4 = new Mat4();
    viewMatrix: Mat4 = new Mat4();

    constructor() {
        this.projectionMatrix.identity();
        this.validateProjectionMatrix();
        this.viewMatrix.identity();
    }

    /**
     * Configure perspective projection
     * @param fov Field of view in degrees
     * @param aspect Aspect ratio (width/height)
     * @param near Near clipping plane
     * @param far Far clipping plane
     * @throws {RangeError} If any parameter is invalid
     */
    setPerspective(fov: number, aspect: number, near: number, far: number): void {
        this.validatePerspectiveParams(fov, aspect, near, far);
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        
        const f = 1.0 / Math.tan((fov * Math.PI / 180) / 2);
        const rangeInv = 1 / (near - far);
        
        this.projectionMatrix.data[0] = f / aspect;
        this.projectionMatrix.data[1] = 0;
        this.projectionMatrix.data[2] = 0;
        this.projectionMatrix.data[3] = 0;
        this.projectionMatrix.data[4] = 0;
        this.projectionMatrix.data[5] = f;
        this.projectionMatrix.data[6] = 0;
        this.projectionMatrix.data[7] = 0;
        this.projectionMatrix.data[8] = 0;
        this.projectionMatrix.data[9] = 0;
        this.projectionMatrix.data[10] = (far + near) * rangeInv;
        this.projectionMatrix.data[11] = -1;
        this.projectionMatrix.data[12] = 0;
        this.projectionMatrix.data[13] = 0;
        this.projectionMatrix.data[14] = 2 * far * near * rangeInv;
        this.projectionMatrix.data[15] = 0;
        
        this.validateProjectionMatrix();
    }

    /**
     * Configure orthographic projection
     * @param left Left clipping plane
     * @param right Right clipping plane
     * @param bottom Bottom clipping plane
     * @param top Top clipping plane
     * @param near Near clipping plane
     * @param far Far clipping plane
     * @throws {RangeError} If any parameter is invalid
     */
    setOrthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): void {
        this.validateOrthographicParams(left, right, bottom, top, near, far);
        
        const width = right - left;
        const height = top - bottom;
        const depth = far - near;
        
        this.projectionMatrix.data[0] = 2 / width;
        this.projectionMatrix.data[1] = 0;
        this.projectionMatrix.data[2] = 0;
        this.projectionMatrix.data[3] = 0;
        this.projectionMatrix.data[4] = 0;
        this.projectionMatrix.data[5] = 2 / height;
        this.projectionMatrix.data[6] = 0;
        this.projectionMatrix.data[7] = 0;
        this.projectionMatrix.data[8] = 0;
        this.projectionMatrix.data[9] = 0;
        this.projectionMatrix.data[10] = -2 / depth;
        this.projectionMatrix.data[11] = 0;
        this.projectionMatrix.data[12] = -(right + left) / width;
        this.projectionMatrix.data[13] = -(top + bottom) / height;
        this.projectionMatrix.data[14] = -(far + near) / depth;
        this.projectionMatrix.data[15] = 1;
        
        this.validateProjectionMatrix();
    }

    /**
     * Refresh view matrix from transform
     * @param transform Transform to update from
     * @throws {TypeError} If transform is invalid
     */
    updateMatrices(transform: Transform): void {
        if (!transform || typeof transform.worldTransform !== 'object') {
            throw new TypeError('Invalid transform provided');
        }
        
        const world = transform.worldTransform || transform;
        this.viewMatrix.copy(world).invert();
        
        if (!this.viewMatrix.isValid()) {
            throw new Error('Invalid view matrix after inversion');
        }
    }

    /**
     * Convert screen point to world coordinates
     * @param x Screen x coordinate
     * @param y Screen y coordinate
     * @param depth Depth value (0-1)
     * @returns World position
     * @throws {RangeError} If coordinates are invalid
     */
    screenToWorld(x: number, y: number, depth: number): Vec3 {
        this.validateScreenCoords(x, y, depth);
        
        const invProjection = new Mat4();
        invProjection.copy(this.projectionMatrix).invert();
        
        const ndcX = (x / (this.aspect * 2)) * 2 - 1;
        const ndcY = (1 - y / 2) * 2 - 1;
        const ndcZ = depth * 2 - 1;
        
        const world = new Vec3();
        const w = new Vec4();
        
        w.x = ndcX;
        w.y = ndcY;
        w.z = ndcZ;
        w.w = 0;
        
        const invView = new Mat4();
        invView.copy(this.viewMatrix).invert();
        
        const m = new Mat4();
        m.multiply(invView, invProjection);
        
        const result = new Vec4();
        result.x = m.data[0] * w.x + m.data[4] * w.y + m.data[8] * w.z + m.data[12] * w.w;
        result.y = m.data[1] * w.x + m.data[5] * w.y + m.data[9] * w.z + m.data[13] * w.w;
        result.z = m.data[2] * w.x + m.data[6] * w.y + m.data[10] * w.z + m.data[14] * w.w;
        result.w = m.data[3] * w.x + m.data[7] * w.y + m.data[11] * w.z + m.data[15] * w.w;
        
        if (result.w !== 0) {
            result.x /= result.w;
            result.y /= result.w;
            result.z /= result.w;
        }
        
        world.set(result.x, result.y, result.z);
        return world;
    }

    /**
     * Project world point to screen coordinates
     * @param point World position
     * @returns Screen coordinates
     * @throws {TypeError} If point is invalid
     */
    worldToScreen(point: Vec3): Vec2 {
        if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
            throw new TypeError('Invalid point provided');
        }
        
        const view = new Vec4();
        view.x = this.viewMatrix.data[0] * point.x + this.viewMatrix.data[4] * point.y + this.viewMatrix.data[8] * point.z + this.viewMatrix.data[12];
        view.y = this.viewMatrix.data[1] * point.x + this.viewMatrix.data[5] * point.y + this.viewMatrix.data[9] * point.z + this.viewMatrix.data[13];
        view.z = this.viewMatrix.data[2] * point.x + this.viewMatrix.data[6] * point.y + this.viewMatrix.data[10] * point.z + this.viewMatrix.data[14];
        view.w = this.viewMatrix.data[3] * point.x + this.viewMatrix.data[7] * point.y + this.viewMatrix.data[11] * point.z + this.viewMatrix.data[15];
        
        const clip = new Vec4();
        clip.x = this.projectionMatrix.data[0] * view.x + this.projectionMatrix.data[4] * view.y + this.projectionMatrix.data[8] * view.z + this.projectionMatrix.data[12] * view.w;
        clip.y = this.projectionMatrix.data[1] * view.x + this.projectionMatrix.data[5] * view.y + this.projectionMatrix.data[9] * view.z + this.projectionMatrix.data[13] * view.w;
        clip.z = this.projectionMatrix.data[2] * view.x + this.projectionMatrix.data[6] * view.y + this.projectionMatrix.data[10] * view.z + this.projectionMatrix.data[14] * view.w;
        clip.w = this.projectionMatrix.data[3] * view.x + this.projectionMatrix.data[7] * view.y + this.projectionMatrix.data[11] * view.z + this.projectionMatrix.data[15] * view.w;
        
        if (clip.w !== 0) {
            clip.x /= clip.w;
            clip.y /= clip.w;
            clip.z /= clip.w;
        }
        
        const screen = new Vec2();
        screen.x = (clip.x + 1) * 0.5 * this.aspect;
        screen.y = (1 - clip.y) * 0.5 * 2;
        
        return screen;
    }

    /**
     * Extract frustum planes from view-projection matrix
     * @returns Frustum planes
     */
    getFrustum(): Frustum {
        const frustum = new Frustum();
        const m = new Mat4();
        m.multiply(this.projectionMatrix, this.viewMatrix);
        frustum.setFromProjection(m);
        return frustum;
    }

    /**
     * Validate perspective parameters
     * @private
     */
    private validatePerspectiveParams(fov: number, aspect: number, near: number, far: number): void {
        if (fov <= 0 || fov >= 180) {
            throw new RangeError('FOV must be between 0 and 180');
        }
        if (aspect <= 0 || !isFinite(aspect)) {
            throw new RangeError('Aspect ratio must be positive and finite');
        }
        if (near <= 0 || far <= 0 || near >= far) {
            throw new RangeError('Near must be less than far and both must be positive');
        }
    }

    /**
     * Validate orthographic parameters
     * @private
     */
    private validateOrthographicParams(left: number, right: number, bottom: number, top: number, near: number, far: number): void {
        if (left >= right || bottom >= top || near >= far) {
            throw new RangeError('Invalid orthographic parameters');
        }
        if (!isFinite(left) || !isFinite(right) || !isFinite(bottom) || !isFinite(top) || !isFinite(near) || !isFinite(far)) {
            throw new RangeError('All parameters must be finite');
        }
    }

    /**
     * Validate screen coordinates
     * @private
     */
    private validateScreenCoords(x: number, y: number, depth: number): void {
        if (!isFinite(x) || !isFinite(y) || !isFinite(depth)) {
            throw new RangeError('Coordinates must be finite');
        }
        if (depth < 0 || depth > 1) {
            throw new RangeError('Depth must be between 0 and 1');
        }
    }

    /**
     * Validate projection matrix for NaN or invalid values
     * @private
     */
    private validateProjectionMatrix(): void {
        for (let i = 0; i < 16; i++) {
            if (!isFinite(this.projectionMatrix.data[i])) {
                throw new Error('Invalid projection matrix: contains non-finite value');
            }
        }
    }
}
