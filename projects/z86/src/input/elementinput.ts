import { EventEmitter } from '../core/eventemitter';
import { Vec2 } from '../math/vec2';

export class ElementInput extends EventEmitter {
  private _element: HTMLElement | null = null;
  private _attached = false;
  private _events: Array<{ name: string; handler: EventListener }> = [];

  constructor(element?: HTMLElement) {
    super();
    if (element) {
      this.attach(element);
    }
  }

  attach(element: HTMLElement): void {
    if (this._attached) {
      this.detach();
    }
    this._element = element;
    this._attached = true;

    const events = [
      { name: 'mousedown', handler: this._onMouseDown.bind(this) },
      { name: 'mouseup', handler: this._onMouseUp.bind(this) },
      { name: 'mousemove', handler: this._onMouseMove.bind(this) },
      { name: 'click', handler: this._onClick.bind(this) },
      { name: 'dblclick', handler: this._onDblClick.bind(this) },
      { name: 'contextmenu', handler: this._onContextMenu.bind(this) },
      { name: 'wheel', handler: this._onWheel.bind(this) },
      { name: 'touchstart', handler: this._onTouchStart.bind(this) },
      { name: 'touchend', handler: this._onTouchEnd.bind(this) },
      { name: 'touchmove', handler: this._onTouchMove.bind(this) },
      { name: 'keydown', handler: this._onKeyDown.bind(this) },
      { name: 'keyup', handler: this._onKeyUp.bind(this) },
      { name: 'focus', handler: this._onFocus.bind(this) },
      { name: 'blur', handler: this._onBlur.bind(this) }
    ];

    events.forEach(({ name, handler }) => {
      this._element!.addEventListener(name, handler, { passive: false });
      this._events.push({ name, handler });
    });
  }

  detach(): void {
    if (!this._attached || !this._element) return;
    this._events.forEach(({ name, handler }) => {
      this._element!.removeEventListener(name, handler);
    });
    this._events.length = 0;
    this._element = null;
    this._attached = false;
  }

  private _onMouseDown(event: MouseEvent): void {
    this.fire('mousedown', { x: event.clientX, y: event.clientY, button: event.button, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey });
  }

  private _onMouseUp(event: MouseEvent): void {
    this.fire('mouseup', { x: event.clientX, y: event.clientY, button: event.button, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey });
  }

  private _onMouseMove(event: MouseEvent): void {
    this.fire('mousemove', { x: event.clientX, y: event.clientY, movementX: event.movementX, movementY: event.movementY, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey });
  }

  private _onClick(event: MouseEvent): void {
    this.fire('click', { x: event.clientX, y: event.clientY, button: event.button, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey });
  }

  private _onDblClick(event: MouseEvent): void {
    this.fire('dblclick', { x: event.clientX, y: event.clientY, button: event.button, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey });
  }

  private _onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.fire('contextmenu', { x: event.clientX, y: event.clientY, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey });
  }

  private _onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.fire('wheel', { x: event.clientX, y: event.clientY, deltaX: event.deltaX, deltaY: event.deltaY, deltaZ: event.deltaZ, deltaMode: event.deltaMode, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey });
  }

  private _onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touches = Array.from(event.touches).map(t => new Vec2(t.clientX, t.clientY));
    this.fire('touchstart', { touches, targetTouches: Array.from(event.targetTouches).map(t => new Vec2(t.clientX, t.clientY)), changedTouches: Array.from(event.changedTouches).map(t => new Vec2(t.clientX, t.clientY)), shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey });
  }

  private _onTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    const touches = Array.from(event.touches).map(t => new Vec2(t.clientX, t.clientY));
    this.fire('touchend', { touches, targetTouches: Array.from(event.targetTouches).map(t => new Vec2(t.clientX, t.clientY)), changedTouches: Array.from(event.changedTouches).map(t => new Vec2(t.clientX, t.clientY)), shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey });
  }

  private _onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touches = Array.from(event.touches).map(t => new Vec2(t.clientX, t.clientY));
    this.fire('touchmove', { touches, targetTouches: Array.from(event.targetTouches).map(t => new Vec2(t.clientX, t.clientY)), changedTouches: Array.from(event.changedTouches).map(t => new Vec2(t.clientX, t.clientY)), shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey });
  }

  private _onKeyDown(event: KeyboardEvent): void {
    event.preventDefault();
    this.fire('keydown', { key: event.key, code: event.code, location: event.location, repeat: event.repeat, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey });
  }

  private _onKeyUp(event: KeyboardEvent): void {
    event.preventDefault();
    this.fire('keyup', { key: event.key, code: event.code, location: event.location, repeat: event.repeat, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey });
  }

  private _onFocus(event: FocusEvent): void {
    this.fire('focus', {});
  }

  private _onBlur(event: FocusEvent): void {
    this.fire('blur', {});
  }
}
