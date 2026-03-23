import { EventEmitter } from '../core';
import { Vec3, Mat4 } from '../math';
import { GraphNode } from './graph-node';

export class Camera extends GraphNode {
  private _projectionMatrix: Mat4;
  private _viewMatrix: Mat4;
  private _position: Vec3;
  private _target: Vec3;
  private _up: Vec3;

  constructor() {
    super();
    this._projectionMatrix = new Mat4();
    this._viewMatrix = new Mat4();
    this._position = new Vec3(0, 0, 1);
    this._target = new Vec3(0, 0, 0);
    this._up = new Vec3(0, 1, 0);
    this.update();
  }

  get projectionMatrix(): Mat4 {
    return this._projectionMatrix;
  }

  get viewMatrix(): Mat4 {
    return this._viewMatrix;
  }

  get position(): Vec3 {
    return this._position;
  }

  set position(pos: Vec3) {
    this._position.copy(pos);
    this.update();
  }

  setPerspective(fov: number, aspect: number, near: number, far: number): void {
    this._projectionMatrix.setPerspective(fov, aspect, near, far);
  }

  setOrthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): void {
    this._projectionMatrix.setOrtho(left, right, bottom, top, near, far);
  }

  lookAt(target: Vec3, up?: Vec3): void {
    if (up) this._up.copy(up);
    this._target.copy(target);
    this.update();
  }

  update(): void {
    const zAxis = new Vec3().sub2(this._position, this._target).normalize();
    const xAxis = new Vec3().cross(this._up, zAxis).normalize();
    const yAxis = new Vec3().cross(zAxis, xAxis);

    this._viewMatrix.data[0] = xAxis.x;
    this._viewMatrix.data[1] = yAxis.x;
    this._viewMatrix.data[2] = zAxis.x;
    this._viewMatrix.data[3] = 0;
    this._viewMatrix.data[4] = xAxis.y;
    this._viewMatrix.data[5] = yAxis.y;
    this._viewMatrix.data[6] = zAxis.y;
    this._viewMatrix.data[7] = 0;
    this._viewMatrix.data[8] = xAxis.z;
    this._viewMatrix.data[9] = yAxis.z;
    this._viewMatrix.data[10] = zAxis.z;
    this._viewMatrix.data[11] = 0;
    this._viewMatrix.data[12] = -xAxis.dot(this._position);
    this._viewMatrix.data[13] = -yAxis.dot(this._position);
    this._viewMatrix.data[14] = -zAxis.dot(this._position);
    this._viewMatrix.data[15] = 1;
  }
}
