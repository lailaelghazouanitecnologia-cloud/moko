import { EventEmitter } from '../core';
import { Vec2 } from '../math';

export class Mouse extends EventEmitter {
  private _position: Vec2 = new Vec2(0, 0);
  private _delta: Vec2 = new Vec2(0, 0);
  private _lastPosition: Vec2 = new Vec2(0, 0);
  private _buttons: Map<number, boolean> = new Map();
  private _wheel: number = 0;
  private _wheelDelta: number = 0;
  private _element: HTMLElement | null = null;
  private _enabled: boolean = true;

  constructor(element?: HTMLElement) {
    super();
    if (element) {
      this.attach(element);
    }
  }

  attach(element: HTMLElement): void {
    this.detach();
    this._element = element;
    this._element.addEventListener('mousemove', this._onMouseMove);
    this._element.addEventListener('mousedown', this._onMouseDown);
    this._element.addEventListener('mouseup', this._onMouseUp);
    this._element.addEventListener('wheel', this._onWheel);
    this._element.addEventListener('mouseleave', this._onMouseLeave);
    this._element.addEventListener('contextmenu', this._onContextMenu);
  }

  detach(): void {
    if (this._element) {
      this._element.removeEventListener('mousemove', this._onMouseMove);
      this._element.removeEventListener('mousedown', this._onMouseDown);
      this._element.removeEventListener('mouseup', this._onMouseUp);
      this._element.removeEventListener('wheel', this._onWheel);
      this._element.removeEventListener('mouseleave', this._onMouseLeave);
      this._element.removeEventListener('contextmenu', this._onContextMenu);
      this._element = null;
    }
  }

  private _onMouseMove = (event: MouseEvent) => {
    if (!this._enabled) return;
    const rect = this._element!.getBoundingClientRect();
    this._position.x = event.clientX - rect.left;
    this._position.y = event.clientY - rect.top;
    this._delta.x = this._position.x - this._lastPosition.x;
    this._delta.y = this._position.y - this._lastPosition.y;
    this._lastPosition.copy(this._position);
    this.emit('move', this._position.x, this._position.y);
  };

  private _onMouseDown = (event: MouseEvent) => {
    if (!this._enabled) return;
    this._buttons.set(event.button, true);
    this.emit('down', event.button, this._position.x, this._position.y);
  };

  private _onMouseUp = (event: MouseEvent) => {
    if (!this._enabled) return;
    this._buttons.set(event.button, false);
    this.emit('up', event.button, this._position.x, this._position.y);
  };

  private _onWheel = (event: WheelEvent) => {
    if (!this._enabled) return;
    event.preventDefault();
    this._wheelDelta = -event.deltaY;
    this._wheel += this._wheelDelta;
    this.emit('wheel', this._wheelDelta);
  };

  private _onMouseLeave = () => {
    if (!this._enabled) return;
    this._buttons.clear();
    this.emit('leave');
  };

  private _onContextMenu = (event: Event) => {
    event.preventDefault();
  };

  update(): void {
    this._delta.set(0, 0);
    this._wheelDelta = 0;
  }

  get position(): Vec2 {
    return this._position.clone();
  }

  get delta(): Vec2 {
    return this._delta.clone();
  }

  get x(): number {
    return this._position.x;
  }

  get y(): number {
    return this._position.y;
  }

  get dx(): number {
    return this._delta.x;
  }

  get dy(): number {
    return this._delta.y;
  }

  isPressed(button: number): boolean {
    return this._buttons.get(button) || false;
  }

  wasPressed(button: number): boolean {
    return this._buttons.has(button) && this._buttons.get(button) === true;
  }

  wasReleased(button: number): boolean {
    return this._buttons.has(button) && this._buttons.get(button) === false;
  }

  get wheel(): number {
    return this._wheel;
  }

  get wheelDelta(): number {
    return this._wheelDelta;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  dispose(): void {
    this.detach();
    this.removeAllListeners();
  }
}
