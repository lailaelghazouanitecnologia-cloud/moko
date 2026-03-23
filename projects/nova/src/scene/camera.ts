import { Mat4 } from '../math';
import { Component } from './component';

export class Camera extends Component {
  private _projectionMatrix: Mat4;
  private _viewMatrix: Mat4;
  private _position: Float32Array;

  constructor() {
    super();
    this._projectionMatrix = new Mat4();
    this._viewMatrix = new Mat4();
    this._position = new Float32Array([0, 0, 0]);
  }

  get projectionMatrix(): Mat4 {
    return this._projectionMatrix;
  }

  get viewMatrix(): Mat4 {
    return this._viewMatrix;
  }

  get position(): Float32Array {
    return this._position;
  }

  set position(pos: Float32Array) {
    this._position.set(pos);
  }

  update(): void {
    if (!this.entity) return;
    const worldTransform = this.entity.worldTransform;
    const invWorld = new Mat4();
    invWorld.invert(worldTransform);
    this._viewMatrix.copy(invWorld);
    const translation = new Float32Array(3);
    worldTransform.getTranslation(translation);
    this._position[0] = -translation[0];
    this._position[1] = -translation[1];
    this._position[2] = -translation[2];
  }

  lookAt(target: Float32Array, up: Float32Array = new Float32Array([0, 1, 0])): void {
    const eye = new Float32Array(3);
    if (this.entity) {
      this.entity.worldTransform.getTranslation(eye);
    } else {
      eye.set(this._position);
    }
    const zAxis = new Float32Array(3);
    zAxis[0] = eye[0] - target[0];
    zAxis[1] = eye[1] - target[1];
    zAxis[2] = eye[2] - target[2];
    const len = Math.sqrt(zAxis[0] * zAxis[0] + zAxis[1] * zAxis[1] + zAxis[2] * zAxis[2]);
    if (len > 0) {
      zAxis[0] /= len;
      zAxis[1] /= len;
      zAxis[2] /= len;
    }
    const xAxis = new Float32Array(3);
    xAxis[0] = up[1] * zAxis[2] - up[2] * zAxis[1];
    xAxis[1] = up[2] * zAxis[0] - up[0] * zAxis[2];
    xAxis[2] = up[0] * zAxis[1] - up[1] * zAxis[0];
    const xLen = Math.sqrt(xAxis[0] * xAxis[0] + xAxis[1] * xAxis[1] + xAxis[2] * xAxis[2]);
    if (xLen > 0) {
      xAxis[0] /= xLen;
      xAxis[1] /= xLen;
      xAxis[2] /= xLen;
    }
    const yAxis = new Float32Array(3);
    yAxis[0] = zAxis[1] * xAxis[2] - zAxis[2] * xAxis[1];
    yAxis[1] = zAxis[2] * xAxis[0] - zAxis[0] * xAxis[2];
    yAxis[2] = zAxis[0] * xAxis[1] - zAxis[1] * xAxis[0];
    const rot = new Mat4();
    rot.data[0] = xAxis[0];
    rot.data[1] = xAxis[1];
    rot.data[2] = xAxis[2];
    rot.data[3] = 0;
    rot.data[4] = yAxis[0];
    rot.data[5] = yAxis[1];
    rot.data[6] = yAxis[2];
    rot.data[7] = 0;
    rot.data[8] = zAxis[0];
    rot.data[9] = zAxis[1];
    rot.data[10] = zAxis[2];
    rot.data[11] = 0;
    rot.data[12] = 0;
    rot.data[13] = 0;
    rot.data[14] = 0;
    rot.data[15] = 1;
    const trans = new Mat4();
    trans.setIdentity();
    trans.data[12] = -eye[0];
    trans.data[13] = -eye[1];
    trans.data[14] = -eye[2];
    this._viewMatrix.mul2(rot, trans);
  }
}
