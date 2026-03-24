import { Mat4 } from '../math/mat4';
import { Vec3 } from '../math/vec3';
import { Vec4 } from '../math/vec4';
import { Quat } from '../math/quat';
import { Entity } from '../scene/entity';

export class Camera {
  private _projectionMatrix: Mat4 = new Mat4();
  private _viewMatrix: Mat4 = new Mat4();
  private _viewProjectionMatrix: Mat4 = new Mat4();
  private _aspectRatio: number = 16 / 9;
  private _fieldOfView: number = 45;
  private _nearClip: number = 0.1;
  private _farClip: number = 1000;
  private _isOrthographic: boolean = false;
  private _orthographicSize: number = 10;
  private _clearColor: Vec3 = new Vec3(0.1, 0.1, 0.1);
  private _clearDepth: number = 1.0;
  private _clearStencil: number = 0;
  private _priority: number = 0;
  private _enabled: boolean = true;
  private _renderTarget: any = null;
  private _viewport: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 1, height: 1 };

  constructor(entity: Entity) {
  }

  init(): void {
    this.calculateProjectionMatrix();
    this.updateViewMatrix();
  }

  update(dt: number): void {
    this.updateViewMatrix();
  }

  destroy(): void {
    if (this._renderTarget) {
      this._renderTarget = null;
    }
  }

  private calculateProjectionMatrix(): void {
    if (this._isOrthographic) {
      const halfSize = this._orthographicSize * 0.5;
      const aspect = this._aspectRatio;
      this._projectionMatrix.setOrtho(
        -halfSize * aspect,
        halfSize * aspect,
        -halfSize,
        halfSize,
        this._nearClip,
        this._farClip
      );
    } else {
      this._projectionMatrix.setPerspective(
        this._fieldOfView,
        this._aspectRatio,
        this._nearClip,
        this._farClip
      );
    }
  }

  private updateViewMatrix(): void {
    const worldTransform = this.entity.getWorldTransform();
    const invWorld = new Mat4();
    invWorld.copy(worldTransform).invert();
    this._viewMatrix.copy(invWorld);
    this._viewProjectionMatrix.copy(this._projectionMatrix).mul(this._viewMatrix);
  }

  getProjectionMatrix(): Mat4 {
    return this._projectionMatrix;
  }

  getViewMatrix(): Mat4 {
    return this._viewMatrix;
  }

  getViewProjectionMatrix(): Mat4 {
    return this._viewProjectionMatrix;
  }

  setAspectRatio(aspect: number): void {
    this._aspectRatio = aspect;
    this.calculateProjectionMatrix();
  }

  getAspectRatio(): number {
    return this._aspectRatio;
  }

  setFieldOfView(fov: number): void {
    this._fieldOfView = fov;
    this.calculateProjectionMatrix();
  }

  getFieldOfView(): number {
    return this._fieldOfView;
  }

  setNearClip(near: number): void {
    this._nearClip = near;
    this.calculateProjectionMatrix();
  }

  getNearClip(): number {
    return this._nearClip;
  }

  setFarClip(far: number): void {
    this._farClip = far;
    this.calculateProjectionMatrix();
  }

  getFarClip(): number {
    return this._farClip;
  }

  setOrthographic(orthographic: boolean): void {
    this._isOrthographic = orthographic;
    this.calculateProjectionMatrix();
  }

  isOrthographic(): boolean {
    return this._isOrthographic;
  }

  setOrthographicSize(size: number): void {
    this._orthographicSize = size;
    this.calculateProjectionMatrix();
  }

  getOrthographicSize(): number {
    return this._orthographicSize;
  }

  setClearColor(color: Vec3): void {
    this._clearColor.copy(color);
  }

  getClearColor(): Vec3 {
    return this._clearColor;
  }

  setClearDepth(depth: number): void {
    this._clearDepth = depth;
  }

  getClearDepth(): number {
    return this._clearDepth;
  }

  setClearStencil(stencil: number): void {
    this._clearStencil = stencil;
  }

  getClearStencil(): number {
    return this._clearStencil;
  }

  setPriority(priority: number): void {
    this._priority = priority;
  }

  getPriority(): number {
    return this._priority;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setRenderTarget(renderTarget: any): void {
    this._renderTarget = renderTarget;
  }

  getRenderTarget(): any {
    return this._renderTarget;
  }

  setViewport(x: number, y: number, width: number, height: number): void {
    this._viewport.x = x;
    this._viewport.y = y;
    this._viewport.width = width;
    this._viewport.height = height;
  }

  getViewport(): { x: number, y: number, width: number, height: number } {
    return this._viewport;
  }

  screenToWorld(screenPos: Vec3, viewportWidth: number, viewportHeight: number): Vec3 {
    const x = (screenPos.x / viewportWidth) * 2 - 1;
    const y = 1 - (screenPos.y / viewportHeight) * 2;
    const z = screenPos.z;

    const worldPos = new Vec3(x, y, z);
    const invViewProj = new Mat4();
    invViewProj.copy(this._viewProjectionMatrix).invert();
    
    const result = new Vec3();
    invViewProj.transformPoint(worldPos, result);
    return result;
  }

  worldToScreen(worldPos: Vec3, viewportWidth: number, viewportHeight: number): Vec3 {
    const viewPos = new Vec3();
    this._viewMatrix.transformPoint(worldPos, viewPos);
    
    const clipPos = new Vec3();
    this._projectionMatrix.transformPoint(viewPos, clipPos);
    
    const screenPos = new Vec3();
    screenPos.x = (clipPos.x + 1) * 0.5 * viewportWidth;
    screenPos.y = (1 - clipPos.y) * 0.5 * viewportHeight;
    screenPos.z = clipPos.z;
    
    return screenPos;
  }

  getFrustumCorners(): Vec3[] {
    const corners: Vec3[] = [];
    const ndcCorners = [
      new Vec3(-1, -1, -1), new Vec3(1, -1, -1),
      new Vec3(1, 1, -1), new Vec3(-1, 1, -1),
      new Vec3(-1, -1, 1), new Vec3(1, -1, 1),
      new Vec3(1, 1, 1), new Vec3(-1, 1, 1)
    ];

    const invViewProj = new Mat4();
    invViewProj.copy(this._viewProjectionMatrix).invert();

    for (const ndc of ndcCorners) {
      const world = new Vec3();
      invViewProj.transformPoint(ndc, world);
      corners.push(world);
    }

    return corners;
  }

  getFrustumPlanes(): Vec4[] {
    const planes: Vec4[] = [];
    const m = this._viewProjectionMatrix.data;

    // Left plane
    planes.push(new Vec4(m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]));
    // Right plane
    planes.push(new Vec4(m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]));
    // Bottom plane
    planes.push(new Vec4(m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]));
    // Top plane
    planes.push(new Vec4(m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]));
    // Near plane
    planes.push(new Vec4(m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]));
    // Far plane
    planes.push(new Vec4(m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]));

    // Normalize planes
    for (const plane of planes) {
      const length = Math.sqrt(plane.x * plane.x + plane.y * plane.y + plane.z * plane.z);
      if (length > 0) {
        plane.x /= length;
        plane.y /= length;
        plane.z /= length;
        plane.w /= length;
      }
    }

    return planes;
  }

  isVisible(worldPos: Vec3, radius: number = 0): boolean {
    const planes = this.getFrustumPlanes();
    
    for (const plane of planes) {
      const distance = plane.x * worldPos.x + plane.y * worldPos.y + plane.z * worldPos.z + plane.w;
      if (distance < -radius) {
        return false;
      }
    }
    
    return true;
  }

  setPosition(pos: Vec3): void {
    this.entity.setPosition(pos);
  }

  setRotation(rot: Quat): void {
    this.entity.setRotation(rot);
  }

  lookAt(target: Vec3, up: Vec3 = new Vec3(0, 1, 0)): void {
    const position = this.entity.getWorldPosition();
    const zAxis = new Vec3().sub2(position, target).normalize();
    const xAxis = new Vec3().cross(up, zAxis).normalize();
    const yAxis = new Vec3().cross(zAxis, xAxis).normalize();

    const rotation = new Mat4();
    rotation.set(
      xAxis.x, xAxis.y, xAxis.z, 0,
      yAxis.x, yAxis.y, yAxis.z, 0,
      zAxis.x, zAxis.y, zAxis.z, 0,
      0, 0, 0, 1
    );

    const quat = new Quat();
    quat.setFromRotationMatrix(rotation);
    this.setRotation(quat);
  }

  getScreenRay(screenX: number, screenY: number, viewportWidth: number, viewportHeight: number): any {
    const start = this.screenToWorld(new Vec3(screenX, screenY, 0), viewportWidth, viewportHeight);
    const end = this.screenToWorld(new Vec3(screenX, screenY, 1), viewportWidth, viewportHeight);
    const direction = new Vec3().sub2(end, start).normalize();
    
    return { origin: start, direction: direction };
  }
}
