import { Mat4 } from '../math';
import { GraphNode } from './graph-node';

export class GraphNode {
  private _parent: GraphNode | null = null;
  private _children: GraphNode[] = [];
  private _localMatrix: Mat4 = new Mat4();
  private _worldMatrix: Mat4 = new Mat4();
  private _dirty: boolean = true;

  get parent(): GraphNode | null {
    return this._parent;
  }

  get children(): readonly GraphNode[] {
    return this._children;
  }

  get localMatrix(): Mat4 {
    return this._localMatrix;
  }

  get worldMatrix(): Mat4 {
    if (this._dirty) {
      this.updateWorldMatrix();
    }
    return this._worldMatrix;
  }

  addChild(child: GraphNode): void {
    if (child._parent === this) return;
    if (child._parent) {
      child._parent.removeChild(child);
    }
    this._children.push(child);
    child._parent = this;
    child._setDirty();
  }

  removeChild(child: GraphNode): void {
    const idx = this._children.indexOf(child);
    if (idx === -1) return;
    this._children.splice(idx, 1);
    child._parent = null;
    child._setDirty();
  }

  updateWorldMatrix(): void {
    if (!this._dirty) return;
    if (this._parent) {
      this._worldMatrix.copy(this._parent.worldMatrix).mul(this._localMatrix);
    } else {
      this._worldMatrix.copy(this._localMatrix);
    }
    this._dirty = false;
    for (const child of this._children) {
      child._setDirty();
      child.updateWorldMatrix();
    }
  }

  private _setDirty(): void {
    if (this._dirty) return;
    this._dirty = true;
    for (const child of this._children) {
      child._setDirty();
    }
  }
}
