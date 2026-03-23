import { EventEmitter } from 'events';

export class Keyboard extends EventEmitter {
  private _pressed: Set<string> = new Set();

  constructor() {
    super();
    this._attachListeners();
  }

  private _attachListeners(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', this._onKeyDown.bind(this));
    window.addEventListener('keyup', this._onKeyUp.bind(this));
  }

  private _detachListeners(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', this._onKeyDown.bind(this));
    window.removeEventListener('keyup', this._onKeyUp.bind(this));
  }

  private _onKeyDown(event: KeyboardEvent): void {
    const key = event.code;
    if (!this._pressed.has(key)) {
      this._pressed.add(key);
      this.emit('keydown', key);
    }
  }

  private _onKeyUp(event: KeyboardEvent): void {
    const key = event.code;
    if (this._pressed.has(key)) {
      this._pressed.delete(key);
      this.emit('keyup', key);
    }
  }

  public keyDown(key: string): boolean {
    return this._pressed.has(key);
  }

  public keyUp(key: string): boolean {
    return !this._pressed.has(key);
  }

  public isPressed(key: string): boolean {
    return this._pressed.has(key);
  }

  public reset(): void {
    const keys = Array.from(this._pressed);
    this._pressed.clear();
    keys.forEach(key => this.emit('keyup', key));
  }

  public destroy(): void {
    this._detachListeners();
    this.removeAllListeners();
  }
}
