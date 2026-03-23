import { Component } from './component';
import { Mat4 } from '../math/mat4';
import { Vec3 } from '../math/vec3';
import { Vec4 } from '../math/vec4';
import { Color } from '../math/color';
import { Ray } from '../math/ray';
import { Frustum } from '../math/frustum';

export class Camera extends Component {
    private _fov: number = 45;
    private _aspect: number = 1;
    private _near: number = 0.1;
    private _far: number = 1000;
    private _orthographic: boolean = false;
    private _orthoHeight: number = 10;
    private _viewport: Vec4 = new Vec4(0, 0, 1, 1);
    private _clearColor: Color = new Color(0, 0, 0, 1);
    private _clearDepth: number = 1;
    private _priority: number = 0;
    private _projectionMatrix: Mat4 = new Mat4();
    private _viewMatrix: Mat4 = new Mat4();
    private _frustum: Frustum = new Frustum();
    private _projectionDirty: boolean = true;
    private _viewDirty: boolean = true;
    private _frustumDirty: boolean = true;

    get fov(): number { return this._fov; }
    set fov(value: number) { this._fov = value; this._projectionDirty = true; this._frustumDirty = true; }

    get aspect(): number { return this._aspect; }
    set aspect(value: number) { this._aspect = value; this._projectionDirty = true; this._frustumDirty = true; }

    get near(): number { return this._near; }
    set near(value: number) { this._near = value; this._projectionDirty = true; this._frustumDirty = true; }

    get far(): number { return this._far; }
    set far(value: number) { this._far = value; this._projectionDirty = true; this._frustumDirty = true; }

    get orthographic(): boolean { return this._orthographic; }
    set orthographic(value: boolean) { this._orthographic = value; this._projectionDirty = true; this._frustumDirty = true; }

    get orthoHeight(): number { return this._orthoHeight; }
    set orthoHeight(value: number) { this._orthoHeight = value; this._projectionDirty = true; this._frustumDirty = true; }

    get viewport(): Vec4 { return this._viewport; }
    set viewport(value: Vec4) { this._viewport.copy(value); }

    get clearColor(): Color { return this._clearColor; }
    set clearColor(value: Color) { this._clearColor.copy(value); }

    get clearDepth(): number { return this._clearDepth; }
    set clearDepth(value: number) { this._clearDepth = value; }

    get priority(): number { return this._priority; }
    set priority(value: number) { this._priority = value; }

    getProjectionMatrix(): Mat4 {
        if (this._projectionDirty) {
            if (this._orthographic) {
                const halfHeight = this._orthoHeight * 0.5;
                const halfWidth = halfHeight * this._aspect;
                this._projectionMatrix.setOrtho(-halfWidth, halfWidth, -halfHeight, halfHeight, this._near, this._far);
            } else {
                this._projectionMatrix.setPerspective(this._fov * Math.PI / 180, this._aspect, this._near, this._far);
            }
            this._projectionDirty = false;
        }
        return this._projectionMatrix;
    }

    getViewMatrix(): Mat4 {
        if (this._viewDirty) {
            const worldTransform = this.node.getWorldTransform();
            this._viewMatrix.copy(worldTransform).invert();
            this._viewDirty = false;
        }
        return this._viewMatrix;
    }

    screenToWorld(x: number, y: number, z: number): Vec3 {
        const device = this.node.scene.app.graphicsDevice;
        const width = device.width;
        const height = device.height;

        const viewportX = this._viewport.x * width;
        const viewportY = this._viewport.y * height;
        const viewportWidth = this._viewport.z * width;
        const viewportHeight = this._viewport.w * height;

        const ndcX = ((x - viewportX) / viewportWidth) * 2 - 1;
        const ndcY = (1 - (y - viewportY) / viewportHeight) * 2 - 1;
        const ndcZ = z * 2 - 1;

        const invProjection = new Mat4().copy(this.getProjectionMatrix()).invert();
        const invView = new Mat4().copy(this.getViewMatrix()).invert();

        const point = new Vec3(ndcX, ndcY, ndcZ);
        invProjection.transformPoint(point, point);
        invView.transformPoint(point, point);

        return point;
    }

    worldToScreen(point: Vec3): Vec3 {
        const device = this.node.scene.app.graphicsDevice;
        const width = device.width;
        const height = device.height;

        const viewPoint = new Vec3();
        this.getViewMatrix().transformPoint(point, viewPoint);
        const clipPoint = new Vec3();
        this.getProjectionMatrix().transformPoint(viewPoint, clipPoint);

        const viewportX = this._viewport.x * width;
        const viewportY = this._viewport.y * height;
        const viewportWidth = this._viewport.z * width;
        const viewportHeight = this._viewport.w * height;

        const screenX = viewportX + (clipPoint.x * 0.5 + 0.5) * viewportWidth;
        const screenY = viewportY + (1 - (clipPoint.y * 0.5 + 0.5)) * viewportHeight;
        const screenZ = clipPoint.z * 0.5 + 0.5;

        return new Vec3(screenX, screenY, screenZ);
    }

    getFrustum(): Frustum {
        if (this._frustumDirty) {
            this._frustum.setFromMat4(new Mat4().mul2(this.getProjectionMatrix(), this.getViewMatrix()));
            this._frustumDirty = false;
        }
        return this._frustum;
    }

    setFov(degrees: number): void {
        this.fov = degrees;
    }

    setAspect(width: number, height: number): void {
        this.aspect = width / height;
    }

    setOrthographic(height: number): void {
        this.orthographic = true;
        this.orthoHeight = height;
    }

    setPerspective(): void {
        this.orthographic = false;
    }

    getScreenRay(x: number, y: number): Ray {
        const device = this.node.scene.app.graphicsDevice;
        const width = device.width;
        const height = device.height;

        const viewportX = this._viewport.x * width;
        const viewportY = this._viewport.y * height;
        const viewportWidth = this._viewport.z * width;
        const viewportHeight = this._viewport.w * height;

        const ndcX = ((x - viewportX) / viewportWidth) * 2 - 1;
        const ndcY = (1 - (y - viewportY) / viewportHeight) * 2 - 1;

        const invProjection = new Mat4().copy(this.getProjectionMatrix()).invert();
        const invView = new Mat4().copy(this.getViewMatrix()).invert();

        const nearPoint = new Vec3(ndcX, ndcY, -1);
        const farPoint = new Vec3(ndcX, ndcY, 1);

        invProjection.transformPoint(nearPoint, nearPoint);
        invProjection.transformPoint(farPoint, farPoint);
        invView.transformPoint(nearPoint, nearPoint);
        invView.transformPoint(farPoint, farPoint);

        const direction = new Vec3().sub2(farPoint, nearPoint).normalize();
        return new Ray(nearPoint, direction);
    }

    onEnable(): void {
        this.node.scene.cameras.push(this);
        this._viewDirty = true;
    }

    onDisable(): void {
        const cameras = this.node.scene.cameras;
        const index = cameras.indexOf(this);
        if (index !== -1) {
            cameras.splice(index, 1);
        }
    }

    onTransformChanged(): void {
        this._viewDirty = true;
        this._frustumDirty = true;
    }
}
