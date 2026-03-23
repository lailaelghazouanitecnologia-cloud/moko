import { EventEmitter } from '../core';
import { Vec2, Vec3, Vec4 } from '../math';

export class Element extends EventEmitter {
  private _parent: Element | null = null;
  private _children: Element[] = [];
  private _attached = false;
  private _domElement: HTMLElement | null = null;
  private _style: Record<string, string> = {};
  private _eventListeners: Map<string, EventListener[]> = new Map();

  constructor() {
    super();
  }

  attachToDom(container: HTMLElement): void {
    if (this._attached) return;
    this._domElement = document.createElement('div');
    this._applyStyles();
    container.appendChild(this._domElement);
    this._attached = true;
    this.emit('attach');
  }

  detachFromDom(): void {
    if (!this._attached || !this._domElement) return;
    this._domElement.remove();
    this._domElement = null;
    this._attached = false;
    this.emit('detach');
  }

  private _applyStyles(): void {
    if (!this._domElement) return;
    Object.assign(this._domElement.style, this._style);
  }

  setStyle(property: string, value: string): void {
    this._style[property] = value;
    if (this._domElement) {
      (this._domElement.style as any)[property] = value;
    }
  }

  getStyle(property: string): string {
    return this._style[property] || '';
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this._eventListeners.has(type)) {
      this._eventListeners.set(type, []);
    }
    this._eventListeners.get(type)!.push(listener);
    if (this._domElement) {
      this._domElement.addEventListener(type, listener);
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    const listeners = this._eventListeners.get(type);
    if (!listeners) return;
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
      if (this._domElement) {
        this._domElement.removeEventListener(type, listener);
      }
    }
  }

  addChild(child: Element): void {
    if (child._parent) {
      child._parent.removeChild(child);
    }
    this._children.push(child);
    child._parent = this;
    if (this._domElement && child._domElement) {
      this._domElement.appendChild(child._domElement);
    }
  }

  removeChild(child: Element): void {
    const index = this._children.indexOf(child);
    if (index === -1) return;
    this._children.splice(index, 1);
    child._parent = null;
    if (this._domElement && child._domElement) {
      this._domElement.removeChild(child._domElement);
    }
  }

  getChildren(): Element[] {
    return [...this._children];
  }

  getParent(): Element | null {
    return this._parent;
  }

  isAttached(): boolean {
    return this._attached;
  }

  destroy(): void {
    this.detachFromDom();
    for (const child of this._children) {
      child.destroy();
    }
    this._children.length = 0;
    this._eventListeners.clear();
    this.emit('destroy');
  }
}
