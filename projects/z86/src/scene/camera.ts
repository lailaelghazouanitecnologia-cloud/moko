import { EventEmitter } from '../core/event-emitter';
import { Vec3 } from '../math/vec3';
import { Mat4 } from '../math/mat4';
import { Quat } from '../math/quat';
import { Component } from './component';
import { Entity } from './entity';

export class Camera extends Component {
  private _projectionMatrix: Mat4 = new Mat4();
  private _viewMatrix: Mat4 = new Mat4();
  private _position: Vec3 = new Vec3();
  private _rotation: Quat = new Quat();
  private _aspectRatio: number = 16 / 9;
  private _fov: number = 45;
  private _nearClip: number = 0.1;
  private _farClip: number = 1000;
  private _orthographic: boolean = false;
  private _orthoHeight: number = 10;
  private _clearColor: number[] = [0, 0, 0, 1];
  private _clearDepth: number = 1;
  private _clearStencil: number = 0;
  private _renderTarget: any = null;
  private _priority: number = 0;
  private _viewport: number[] = [0, 0, 1, 1];
  private _scissor: number[] = [0, 0, 1, 1];
  private _frustumCulling: boolean = true;
  private _cullingMask: number = 0xffffffff;
  private _layers: number[] = [];
  private _postEffects: any[] = [];
  private _enabled: boolean = true;

  constructor(entity: Entity) {
    super(entity);
    this._updateProjectionMatrix();
    this._updateViewMatrix();
  }

  get projectionMatrix(): Mat4 {
    return this._projectionMatrix.clone();
  }

  get viewMatrix(): Mat4 {
    return this._viewMatrix.clone();
  }

  get position(): Vec3 {
    return this._position.clone();
  }

  set position(pos: Vec3) {
    this._position.copy(pos);
    this._updateViewMatrix();
  }

  get rotation(): Quat {
    return this._rotation.clone();
  }

  set rotation(rot: Quat) {
    this._rotation.copy(rot);
    this._updateViewMatrix();
  }

  get aspectRatio(): number {
    return this._aspectRatio;
  }

  set aspectRatio(value: number) {
    this._aspectRatio = value;
    this._updateProjectionMatrix();
  }

  get fov(): number {
    return this._fov;
  }

  set fov(value: number) {
    this._fov = value;
    this._updateProjectionMatrix();
  }

  get nearClip(): number {
    return this._nearClip;
  }

  set nearClip(value: number) {
    this._nearClip = value;
    this._updateProjectionMatrix();
  }

  get farClip(): number {
    return this._farClip;
  }

  set farClip(value: number) {
    this._farClip = value;
    this._updateProjectionMatrix();
  }

  get orthographic(): boolean {
    return this._orthographic;
  }

  set orthographic(value: boolean) {
    this._orthographic = value;
    this._updateProjectionMatrix();
  }

  get orthoHeight(): number {
    return this._orthoHeight;
  }

  set orthoHeight(value: number) {
    this._orthoHeight = value;
    this._updateProjectionMatrix();
  }

  get clearColor(): number[] {
    return this._clearColor.slice();
  }

  set clearColor(value: number[]) {
    this._clearColor = value.slice();
  }

  get clearDepth(): number {
    return this._clearDepth;
  }

  set clearDepth(value: number) {
    this._clearDepth = value;
  }

  get clearStencil(): number {
    return this._clearStencil;
  }

  set clearStencil(value: number) {
    this._clearStencil = value;
  }

  get renderTarget(): any {
    return this._renderTarget;
  }

  set renderTarget(value: any) {
    this._renderTarget = value;
  }

  get priority(): number {
    return this._priority;
  }

  set priority(value: number) {
    this._priority = value;
  }

  get viewport(): number[] {
    return this._viewport.slice();
  }

  set viewport(value: number[]) {
    this._viewport = value.slice();
  }

  get scissor(): number[] {
    return this._scissor.slice();
  }

  set scissor(value: number[]) {
    this._scissor = value.slice();
  }

  get frustumCulling(): boolean {
    return this._frustumCulling;
  }

  set frustumCulling(value: boolean) {
    this._frustumCulling = value;
  }

  get cullingMask(): number {
    return this._cullingMask;
  }

  set cullingMask(value: number) {
    this._cullingMask = value;
  }

  get layers(): number[] {
    return this._layers.slice();
  }

  set layers(value: number[]) {
    this._layers = value.slice();
  }

  get postEffects(): any[] {
    return this._postEffects.slice();
  }

  set postEffects(value: any[]) {
    this._postEffects = value.slice();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  private _updateProjectionMatrix(): void {
    if (this._orthographic) {
      const halfHeight = this._orthoHeight * 0.5;
      const halfWidth = halfHeight * this._aspectRatio;
      this._projectionMatrix.setOrtho(
        -halfWidth,
        halfWidth,
        -halfHeight,
        halfHeight,
        this._nearClip,
        this._farClip
      );
    } else {
      this._projectionMatrix.setPerspective(
        this._fov,
        this._aspectRatio,
        this._nearClip,
        this._farClip
      );
    }
  }

  private _updateViewMatrix(): void {
    const transform = this.entity.getWorldTransform();
    const pos = new Vec3();
    const rot = new Quat();
    transform.getTranslation(pos);
    transform.getRotation(rot);
    const forward = new Vec3(0, 0, -1);
    rot.transformVector(forward);
    const up = new Vec3(0, 1, 0);
    rot.transformVector(up);
    this._viewMatrix.setLookAt(pos, pos.add(forward), up);
  }

  setPosition(x: number, y: number, z: number): void {
    this._position.set(x, y, z);
    this._updateViewMatrix();
  }

  setRotation(x: number, y: number, z: number, w: number): void {
    this._rotation.set(x, y, z, w);
    this._updateViewMatrix();
  }

  lookAt(target: Vec3, up?: Vec3): void {
    const upVec = up || new Vec3(0, 1, 0);
    const transform = this.entity.getWorldTransform();
    const pos = new Vec3();
    transform.getTranslation(pos);
    this._viewMatrix.setLookAt(pos, target, upVec);
    const forward = target.sub(pos).normalize();
    const right = forward.cross(upVec).normalize();
    const newUp = right.cross(forward).normalize();
    const rot = new Quat();
    rot.setFromAxes(right, newUp, forward.neg());
    this._rotation.copy(rot);
  }

  worldToScreen(worldPos: Vec3, viewportWidth: number, viewportHeight: number): Vec3 {
    const transform = this.entity.getWorldTransform();
    const pos = new Vec3();
    transform.getTranslation(pos);
    const viewProj = this._projectionMatrix.clone().mul(this._viewMatrix);
    const clipPos = viewProj.transformPoint(worldPos);
    const screenX = (clipPos.x * 0.5 + 0.5) * viewportWidth;
    const screenY = (1 - (clipPos.y * 0.5 + 0.5)) * viewportHeight;
    const screenZ = clipPos.z;
    return new Vec3(screenX, screenY, screenZ);
  }

  screenToWorld(screenX: number, screenY: number, viewportWidth: number, viewportHeight: number, depth: number = 1): Vec3 {
    const x = (screenX / viewportWidth) * 2 - 1;
    const y = (1 - screenY / viewportHeight) * 2 - 1;
    const z = depth;
    const invViewProj = this._projectionMatrix.clone().mul(this._viewMatrix).invert();
    const worldPos = invViewProj.transformPoint(new Vec3(x, y, z));
    return worldPos;
  }

  getFrustumCorners(near: number = this._nearClip, far: number = this._farClip): Vec3[] {
    const corners: Vec3[] = [];
    if (this._orthographic) {
      const halfHeight = this._orthoHeight * 0.5;
      const halfWidth = halfHeight * this._aspectRatio;
      corners.push(new Vec3(-halfWidth, -halfHeight, -near));
      corners.push(new Vec3(halfWidth, -halfHeight, -near));
      corners.push(new Vec3(halfWidth, halfHeight, -near));
      corners.push(new Vec3(-halfWidth, halfHeight, -near));
      corners.push(new Vec3(-halfWidth, -halfHeight, -far));
      corners.push(new Vec3(halfWidth, -halfHeight, -far));
      corners.push(new Vec3(halfWidth, halfHeight, -far));
      corners.push(new Vec3(-halfWidth, halfHeight, -far));
    } else {
      const tanHalfFov = Math.tan((this._fov * Math.PI / 180) * 0.5);
      const nearHeight = 2 * near * tanHalfFov;
      const nearWidth = nearHeight * this._aspectRatio;
      const farHeight = 2 * far * tanHalfFov;
      const farWidth = farHeight * this._aspectRatio;
      corners.push(new Vec3(-nearWidth * 0.5, -nearHeight * 0.5, -near));
      corners.push(new Vec3(nearWidth * 0.5, -nearHeight * 0.5, -near));
      corners.push(new Vec3(nearWidth * 0.5, nearHeight * 0.5, -near));
      corners.push(new Vec3(-nearWidth * 0.5, nearHeight * 0.5, -near));
      corners.push(new Vec3(-farWidth * 0.5, -farHeight * 0.5, -far));
      corners.push(new Vec3(farWidth * 0.5, -farHeight * 0.5, -far));
      corners.push(new Vec3(farWidth * 0.5, farHeight * 0.5, -far));
      corners.push(new Vec3(-farWidth * 0.5, farHeight * 0.5, -far));
    }
    return corners;
  }

  getFrustumPlanes(): { normal: Vec3; distance: number }[] {
    const corners = this.getFrustumCorners();
    const planes: { normal: Vec3; distance: number }[] = [];
    const nearPlane = {
      normal: new Vec3(0, 0, 1),
      distance: this._nearClip
    };
    const farPlane = {
      normal: new Vec3(0, 0, -1),
      distance: this._farClip
    };
    const leftPlane = {
      normal: corners[0].sub(corners[3]).cross(corners[0].sub(corners[4])).normalize(),
      distance: 0
    };
    leftPlane.distance = leftPlane.normal.dot(corners[0]);
    const rightPlane = {
      normal: corners[1].sub(corners[5]).cross(corners[1].sub(corners[2])).normalize(),
      distance: 0
    };
    rightPlane.distance = rightPlane.normal.dot(corners[1]);
    const topPlane = {
      normal: corners[2].sub(corners[3]).cross(corners[2].sub(corners[6])).normalize(),
      distance: 0
    };
    topPlane.distance = topPlane.normal.dot(corners[2]);
    const bottomPlane = {
      normal: corners[0].sub(corners[4]).cross(corners[0].sub(corners[1])).normalize(),
      distance: 0
    };
    bottomPlane.distance = bottomPlane.normal.dot(corners[0]);
    planes.push(nearPlane, farPlane, leftPlane, rightPlane, topPlane, bottomPlane);
    return planes;
  }

  clone(): Camera {
    const cloned = new Camera(this.entity);
    cloned._projectionMatrix.copy(this._projectionMatrix);
    cloned._viewMatrix.copy(this._viewMatrix);
    cloned._position.copy(this._position);
    cloned._rotation.copy(this._rotation);
    cloned._aspectRatio = this._aspectRatio;
    cloned._fov = this._fov;
    cloned._nearClip = this._nearClip;
    cloned._farClip = this._farClip;
    cloned._orthographic = this._orthographic;
    cloned._orthoHeight = this._orthoHeight;
    cloned._clearColor = this._clearColor.slice();
    cloned._clearDepth = this._clearDepth;
    cloned._clearStencil = this._clearStencil;
    cloned._renderTarget = this._renderTarget;
    cloned._priority = this._priority;
    cloned._viewport = this._viewport.slice();
    cloned._scissor = this._scissor.slice();
    cloned._frustumCulling = this._frustumCulling;
    cloned._cullingMask = this._cullingMask;
    cloned._layers = this._layers.slice();
    cloned._postEffects = this._postEffects.slice();
    cloned._enabled = this._enabled;
    return cloned;
  }

  destroy(): void {
    this._renderTarget = null;
    this._postEffects = [];
    this._layers = [];
    this._clearColor = [];
    this._viewport = [];
    this._scissor = [];
  }
}
