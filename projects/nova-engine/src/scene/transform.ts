import { Component } from './component';
import { Mat4 } from '../math/mat4';
import { Vec3 } from '../math/vec3';

export class Transform extends Component {
  position: Vec3 = new Vec3();
  rotation: Vec3 = new Vec3();
  scale: Vec3 = new Vec3(1, 1, 1);
  matrix: Mat4 = new Mat4();
  parent: Transform | null = null;
  dirty = true;

  onEnable(): void {}
  onDisable(): void {}

  update(dt: number): void {
    if (this.dirty) this.updateMatrix();
  }

  setParent(parent: Transform | null) {
    this.parent = parent;
    this.setDirty();
  }

  setPosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.setDirty();
  }

  setRotation(x: number, y: number, z: number) {
    this.rotation.set(x, y, z);
    this.setDirty();
  }

  setScale(x: number, y: number, z: number) {
    this.scale.set(x, y, z);
    this.setDirty();
  }

  setDirty() {
    this.dirty = true;
    for (const child of this.entity?.children || []) {
      child.transform.setDirty();
    }
  }

  private updateMatrix() {
    const t = Mat4.translation(this.position.x, this.position.y, this.position.z);
    const r = Mat4.euler(this.rotation.x, this.rotation.y, this.rotation.z);
    const s = Mat4.scale(this.scale.x, this.scale.y, this.scale.z);
    Mat4.mul(t, r, this.matrix);
    Mat4.mul(this.matrix, s, this.matrix);

    if (this.parent) {
      Mat4.mul(this.parent.matrix, this.matrix, this.matrix);
    }
    this.dirty = false;
  }
}
