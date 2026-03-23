import { EventEmitter } from 'events';

export class Mouse extends EventEmitter {
  private _x: number = 0;
  private _y: number = 0;
  private _pressed: boolean = false;

  constructor() {
    super();
    this.attachListeners();
  }

  private attachListeners(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('mousemove', this.handleMove.bind(this));
    window.addEventListener('mousedown', this.handleDown.bind(this));
    window.addEventListener('mouseup', this.handleUp.bind(this));
  }

  private handleMove(evt: MouseEvent): void {
    this._x = evt.clientX;
    this._y = evt.clientY;
    this.emit('move', { x: this._x, y: this._y });
  }

  private handleDown(evt: MouseEvent): void {
    this._pressed = true;
    this.emit('down', { x: this._x, y: this._y, button: evt.button });
  }

  private handleUp(evt: MouseEvent): void {
    this._pressed = false;
    this.emit('up', { x: this._x, y: this._y, button: evt.button });
  }

  public onMove(callback: (pos: { x: number; y: number }) => void): void {
    this.on('move', callback);
  }

  public onDown(callback: (evt: { x: number; y: number; button: number }) => void): void {
    this.on('down', callback);
  }

  public onUp(callback: (evt: { x: number; y: number; button: number }) => void): void {
    this.on('up', callback);
  }

  public position(): { x: number; y: number } {
    return { x: this._x, y: this._y };
  }

  public isPressed(): boolean {
    return this._pressed;
  }

  public destroy(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('mousemove', this.handleMove.bind(this));
    window.removeEventListener('mousedown', this.handleDown.bind(this));
    window.removeEventListener('mouseup', this.handleUp.bind(this));
    this.removeAllListeners();
  }
}
