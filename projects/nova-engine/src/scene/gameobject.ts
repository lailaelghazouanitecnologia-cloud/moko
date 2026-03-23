import { Component } from './component';
import { Transform } from './transform';

export class GameObject {
  name: string = '';
  components: Map<string, Component> = new Map();
  transform: Transform;
  parent: GameObject | null = null;
  children: GameObject[] = [];

  constructor(name?: string) {
    this.name = name || 'GameObject';
    this.transform = new Transform();
    this.transform.entity = this;
  }

  addComponent<T extends Component>(type: new () => T): T {
    const comp = new type();
    comp.entity = this;
    this.components.set(type.name, comp);
    if (comp.enabled) comp.onEnable();
    return comp;
  }

  getComponent<T extends Component>(type: new () => T): T | null {
    return this.components.get(type.name) as T | null;
  }

  addChild(child: GameObject) {
    if (child.parent) child.parent.removeChild(child);
    child.parent = this;
    this.children.push(child);
    child.transform.setParent(this.transform);
  }

  removeChild(child: GameObject) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parent = null;
      child.transform.setParent(null);
    }
  }

  update(dt: number) {
    for (const comp of this.components.values()) {
      if (comp.enabled) comp.update(dt);
    }
    for (const child of this.children) {
      child.update(dt);
    }
  }
}
