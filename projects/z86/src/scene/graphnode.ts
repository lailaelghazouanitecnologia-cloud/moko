import { Transform } from './transform';
import { Entity } from './entity';
import { Component } from './component';

export class GraphNode {
  private _entity: Entity | null = null;
  private _parent: GraphNode | null = null;
  private _children: GraphNode[] = [];
  private _transform: Transform = new Transform();

  constructor(entity?: Entity) {
    if (entity) {
      this._entity = entity;
    }
  }

  get entity(): Entity | null {
    return this._entity;
  }

  get parent(): GraphNode | null {
    return this._parent;
  }

  get children(): readonly GraphNode[] {
    return this._children;
  }

  get transform(): Transform {
    return this._transform;
  }

  setEntity(entity: Entity): void {
    this._entity = entity;
  }

  addChild(child: GraphNode): void {
    if (child._parent === this) return;
    if (child._parent) {
      child._parent.removeChild(child);
    }
    this._children.push(child);
    child._parent = this;
    child._transform.setParent(this._transform);
  }

  removeChild(child: GraphNode): void {
    const index = this._children.indexOf(child);
    if (index === -1) return;
    this._children.splice(index, 1);
    child._parent = null;
    child._transform.setParent(null);
  }

  removeFromParent(): void {
    if (this._parent) {
      this._parent.removeChild(this);
    }
  }

  clearChildren(): void {
    for (const child of this._children) {
      child._parent = null;
      child._transform.setParent(null);
    }
    this._children.length = 0;
  }

  getChild(index: number): GraphNode | null {
    return this._children[index] || null;
  }

  getChildCount(): number {
    return this._children.length;
  }

  findChild(predicate: (node: GraphNode) => boolean): GraphNode | null {
    for (const child of this._children) {
      if (predicate(child)) return child;
    }
    return null;
  }

  findInChildren(predicate: (node: GraphNode) => boolean): GraphNode | null {
    for (const child of this._children) {
      if (predicate(child)) return child;
      const found = child.findInChildren(predicate);
      if (found) return found;
    }
    return null;
  }

  traverse(callback: (node: GraphNode) => void): void {
    callback(this);
    for (const child of this._children) {
      child.traverse(callback);
    }
  }

  traverseDepthFirst(callback: (node: GraphNode) => void): void {
    for (const child of this._children) {
      child.traverseDepthFirst(callback);
    }
    callback(this);
  }

  getRoot(): GraphNode {
    let root: GraphNode = this;
    while (root._parent) {
      root = root._parent;
    }
    return root;
  }

  isDescendantOf(ancestor: GraphNode): boolean {
    let node: GraphNode | null = this._parent;
    while (node) {
      if (node === ancestor) return true;
      node = node._parent;
    }
    return false;
  }

  isAncestorOf(descendant: GraphNode): boolean {
    return descendant.isDescendantOf(this);
  }

  getPathTo(target: GraphNode): GraphNode[] | null {
    if (this === target) return [this];
    for (const child of this._children) {
      const childPath = child.getPathTo(target);
      if (childPath) return [this, ...childPath];
    }
    return null;
  }

  getCommonAncestor(other: GraphNode): GraphNode | null {
    const thisPath = this.getPathToRoot();
    const otherPath = other.getPathToRoot();
    let common: GraphNode | null = null;
    for (let i = 0; i < Math.min(thisPath.length, otherPath.length); i++) {
      if (thisPath[i] === otherPath[i]) {
        common = thisPath[i];
      } else {
        break;
      }
    }
    return common;
  }

  private getPathToRoot(): GraphNode[] {
    const path: GraphNode[] = [];
    let node: GraphNode | null = this;
    while (node) {
      path.unshift(node);
      node = node._parent;
    }
    return path;
  }

  updateWorldTransform(): void {
    this._transform.updateWorldMatrix();
    for (const child of this._children) {
      child.updateWorldTransform();
    }
  }

  getComponent<T extends Component>(type: new (...args: any[]) => T): T | null {
    return this._entity ? this._entity.getComponent(type) : null;
  }

  hasComponent<T extends Component>(type: new (...args: any[]) => T): boolean {
    return this._entity ? this._entity.hasComponent(type) : false;
  }

  getComponents<T extends Component>(type: new (...args: any[]) => T): T[] {
    return this._entity ? this._entity.getComponents(type) : [];
  }

  addComponent<T extends Component>(component: T): T {
    if (!this._entity) {
      this._entity = new Entity();
    }
    return this._entity.addComponent(component);
  }

  removeComponent<T extends Component>(type: new (...args: any[]) => T): boolean {
    return this._entity ? this._entity.removeComponent(type) : false;
  }
}
