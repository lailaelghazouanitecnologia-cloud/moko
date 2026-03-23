import { EventEmitter } from '../core';
import { Vec3, Quat, Mat4 } from '../math';

export class Bone {
  private _name: string;
  private _skeleton: Skeleton | null = null;
  private _parent: Bone | null = null;
  private _children: Bone[] = [];
  private _localPosition: Vec3 = new Vec3();
  private _localRotation: Quat = new Quat();
  private _localScale: Vec3 = new Vec3(1, 1, 1);
  private _worldPosition: Vec3 = new Vec3();
  private _worldRotation: Quat = new Quat();
  private _worldScale: Vec3 = new Vec3(1, 1, 1);
  private _localTransform: Mat4 = new Mat4();
  private _worldTransform: Mat4 = new Mat4();
  private _worldTransformDirty: boolean = true;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  get skeleton(): Skeleton | null {
    return this._skeleton;
  }

  set skeleton(value: Skeleton | null) {
    this._skeleton = value;
  }

  get parent(): Bone | null {
    return this._parent;
  }

  get children(): ReadonlyArray<Bone> {
    return this._children;
  }

  addChild(child: Bone): void {
    if (child._parent === this) return;
    if (child._parent) {
      child._parent.removeChild(child);
    }
    this._children.push(child);
    child._parent = this;
    child._skeleton = this._skeleton;
    child._markWorldTransformDirty();
  }

  removeChild(child: Bone): void {
    const index = this._children.indexOf(child);
    if (index !== -1) {
      this._children.splice(index, 1);
      child._parent = null;
      child._skeleton = null;
      child._markWorldTransformDirty();
    }
  }

  getLocalPosition(): Vec3 {
    return this._localPosition.clone();
  }

  setLocalPosition(x: number | Vec3, y?: number, z?: number): void {
    if (x instanceof Vec3) {
      this._localPosition.copy(x);
    } else if (y !== undefined && z !== undefined) {
      this._localPosition.set(x, y, z);
    }
    this._updateLocalTransform();
    this._markWorldTransformDirty();
  }

  getLocalRotation(): Quat {
    return this._localRotation.clone();
  }

  setLocalRotation(quat: Quat): void {
    this._localRotation.copy(quat);
    this._updateLocalTransform();
    this._markWorldTransformDirty();
  }

  getLocalScale(): Vec3 {
    return this._localScale.clone();
  }

  setLocalScale(x: number | Vec3, y?: number, z?: number): void {
    if (x instanceof Vec3) {
      this._localScale.copy(x);
    } else if (y !== undefined && z !== undefined) {
      this._localScale.set(x, y, z);
    }
    this._updateLocalTransform();
    this._markWorldTransformDirty();
  }

  getWorldPosition(): Vec3 {
    this._updateWorldTransform();
    return this._worldPosition.clone();
  }

  getWorldRotation(): Quat {
    this._updateWorldTransform();
    return this._worldRotation.clone();
  }

  getWorldScale(): Vec3 {
    this._updateWorldTransform();
    return this._worldScale.clone();
  }

  getLocalTransform(): Mat4 {
    return this._localTransform.clone();
  }

  getWorldTransform(): Mat4 {
    this._updateWorldTransform();
    return this._worldTransform.clone();
  }

  private _updateLocalTransform(): void {
    this._localTransform.setTRS(this._localPosition, this._localRotation, this._localScale);
  }

  private _updateWorldTransform(): void {
    if (!this._worldTransformDirty) return;

    this._updateLocalTransform();

    if (this._parent) {
      this._parent._updateWorldTransform();
      this._worldTransform.mul2(this._parent._worldTransform, this._localTransform);
      this._worldTransform.getTranslation(this._worldPosition);
      this._worldTransform.getScale(this._worldScale);
      const rotMat = new Mat4();
      this._worldTransform.getRotation(rotMat);
      this._worldRotation.setFromMat4(rotMat);
    } else {
      this._worldTransform.copy(this._localTransform);
      this._worldPosition.copy(this._localPosition);
      this._worldRotation.copy(this._localRotation);
      this._worldScale.copy(this._localScale);
    }

    this._worldTransformDirty = false;

    for (const child of this._children) {
      child._markWorldTransformDirty();
    }
  }

  private _markWorldTransformDirty(): void {
    this._worldTransformDirty = true;
    for (const child of this._children) {
      child._markWorldTransformDirty();
    }
  }

  lookAt(target: Vec3, up: Vec3 = Vec3.UP): void {
    const m = new Mat4();
    m.setLookAt(this._worldPosition, target, up);
    const q = new Quat();
    q.setFromMat4(m);
    if (this._parent) {
      const invParentRot = this._parent.getWorldRotation().clone().invert();
      this.setLocalRotation(invParentRot.mul(q));
    } else {
      this.setLocalRotation(q);
    }
  }

  translate(x: number | Vec3, y?: number, z?: number): void {
    if (x instanceof Vec3) {
      this.setLocalPosition(this._localPosition.add(x));
    } else if (y !== undefined && z !== undefined) {
      this.setLocalPosition(this._localPosition.add(new Vec3(x, y, z)));
    }
  }

  rotate(x: number | Vec3, y?: number, z?: number): void {
    const rotation = new Quat();
    if (x instanceof Vec3) {
      rotation.setFromEulerAngles(x.x, x.y, x.z);
    } else if (y !== undefined && z !== undefined) {
      rotation.setFromEulerAngles(x, y, z);
    }
    this.setLocalRotation(this._localRotation.mul(rotation));
  }
}
