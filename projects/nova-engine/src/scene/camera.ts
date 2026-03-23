import { Component } from '../gameobject/Component';
import { Mat4 } from '../math/Mat4';
import { Vec2 } from '../math/Vec2';
import { Vec3 } from '../math/Vec3';
import { Color } from '../math/Color';
import { Rect } from '../math/Rect';
import { Frustum } from '../math/Frustum';
import { BoundingBox } from '../math/BoundingBox';
import { Ray } from '../math/Ray';

export class Camera extends Component {
    fov: number = 60;
    aspect: number = 1;
    near: number = 0.1;
    far: number = 1000;
    orthographic: boolean = false;
    orthoSize: number = 10;
    clearColor: Color = Color.BLACK;
    viewport: Rect = Rect.UNIT;
    frustum: Frustum | null = null;

    private _viewMatrix: Mat4 = new Mat4();
    private _projectionMatrix: Mat4 = new Mat4();
    private _viewProjectionMatrix: Mat4 = new Mat4();
    private _frustumPlanesDirty: boolean = true;

    getViewMatrix(): Mat4 {
        const transform = this.getGameObject().transform;
        const pos = transform.position;
        const rot = transform.rotation;
        
        const forward = new Vec3(0, 0, -1);
        rot.transformVector(forward);
        
        const up = new Vec3(0, 1, 0);
        rot.transformVector(up);
        
        const target = pos.clone().add(forward);
        
        this._viewMatrix.setLookAt(pos, target, up);
        return this._viewMatrix.clone();
    }

    getProjectionMatrix(): Mat4 {
        if (this.orthographic) {
            const halfWidth = this.orthoSize * this.aspect * 0.5;
            const halfHeight = this.orthoSize * 0.5;
            this._projectionMatrix.setOrtho(
                -halfWidth, halfWidth,
                -halfHeight, halfHeight,
                this.near, this.far
            );
        } else {
            this._projectionMatrix.setPerspective(
                this.fov * Math.PI / 180,
                this.aspect,
                this.near,
                this.far
            );
        }
        return this._projectionMatrix.clone();
    }

    getViewProjectionMatrix(): Mat4 {
        const view = this.getViewMatrix();
        const proj = this.getProjectionMatrix();
        this._viewProjectionMatrix.copy(proj).mul(view);
        return this._viewProjectionMatrix.clone();
    }

    screenToWorld(screen: Vec2, depth: number): Vec3 {
        const viewport = this.viewport;
        const x = (screen.x - viewport.x) / viewport.width * 2 - 1;
        const y = (screen.y - viewport.y) / viewport.height * 2 - 1;
        const z = 2 * depth - 1;

        const invVp = this.getViewProjectionMatrix().invert();
        const worldPos = new Vec3(x, y, z);
        invVp.transformPoint(worldPos);
        
        return worldPos;
    }

    worldToScreen(world: Vec3): Vec2 {
        const vp = this.getViewProjectionMatrix();
        const screenPos = world.clone();
        vp.transformPoint(screenPos);
        
        const viewport = this.viewport;
        return new Vec2(
            (screenPos.x + 1) * 0.5 * viewport.width + viewport.x,
            (screenPos.y + 1) * 0.5 * viewport.height + viewport.y
        );
    }

    getFrustumCorners(): Vec3[] {
        const corners: Vec3[] = [];
        const invVp = this.getViewProjectionMatrix().invert();
        
        const ndcCorners = [
            new Vec3(-1, -1, -1), new Vec3(1, -1, -1),
            new Vec3(1, 1, -1), new Vec3(-1, 1, -1),
            new Vec3(-1, -1, 1), new Vec3(1, -1, 1),
            new Vec3(1, 1, 1), new Vec3(-1, 1, 1)
        ];
        
        for (const ndc of ndcCorners) {
            const world = ndc.clone();
            invVp.transformPoint(world);
            corners.push(world);
        }
        
        return corners;
    }

    isVisible(bounds: BoundingBox): boolean {
        if (!this.frustum) {
            this.updateFrustum();
        }
        if (!this.frustum) return true;
        
        return this.frustum.containsBox(bounds);
    }

    setPerspective(fov: number, aspect: number, near: number, far: number): void {
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.orthographic = false;
        this._frustumPlanesDirty = true;
    }

    setOrthographic(size: number, near: number, far: number): void {
        this.orthoSize = size;
        this.near = near;
        this.far = far;
        this.orthographic = true;
        this._frustumPlanesDirty = true;
    }

    setViewport(x: number, y: number, width: number, height: number): void {
        this.viewport.set(x, y, width, height);
    }

    getScreenRay(screen: Vec2): Ray {
        const viewport = this.viewport;
        const x = (screen.x - viewport.x) / viewport.width * 2 - 1;
        const y = (screen.y - viewport.y) / viewport.height * 2 - 1;
        
        const invVp = this.getViewProjectionMatrix().invert();
        
        const near = new Vec3(x, y, -1);
        const far = new Vec3(x, y, 1);
        
        invVp.transformPoint(near);
        invVp.transformPoint(far);
        
        const dir = far.sub(near).normalize();
        return new Ray(near, dir);
    }

    updateFrustum(): void {
        if (!this._frustumPlanesDirty) return;
        
        if (!this.frustum) {
            this.frustum = new Frustum();
        }
        
        const vp = this.getViewProjectionMatrix();
        this.frustum.setFromMatrix(vp);
        this._frustumPlanesDirty = false;
    }
}
