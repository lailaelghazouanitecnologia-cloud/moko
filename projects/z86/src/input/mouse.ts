import { EventEmitter } from '../core/event-emitter';
import { Vec2 } from '../math/vec2';

export interface MouseEvent {
    position: Vec2;
    delta: Vec2;
    button: number;
    buttons: number;
    wheel: number;
    shiftKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    metaKey: boolean;
}

export class Mouse extends EventEmitter {
    private _position: Vec2 = new Vec2(0, 0);
    private _lastPosition: Vec2 = new Vec2(0, 0);
    private _delta: Vec2 = new Vec2(0, 0);
    private _wheel: number = 0;
    private _buttons: Set<number> = new Set();
    private _element: HTMLElement | null = null;
    private _enabled: boolean = true;
    private _attached: boolean = false;

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
        this._bindEvents();
    }

    detach(): void {
        if (!this._attached || !this._element) return;
        this._unbindEvents();
        this._attached = false;
        this._element = null;
    }

    private _bindEvents(): void {
        if (!this._element) return;
        this._element.addEventListener('mousedown', this._onMouseDown);
        this._element.addEventListener('mousemove', this._onMouseMove);
        this._element.addEventListener('mouseup', this._onMouseUp);
        this._element.addEventListener('wheel', this._onWheel);
        this._element.addEventListener('contextmenu', this._onContextMenu);
    }

    private _unbindEvents(): void {
        if (!this._element) return;
        this._element.removeEventListener('mousedown', this._onMouseDown);
        this._element.removeEventListener('mousemove', this._onMouseMove);
        this._element.removeEventListener('mouseup', this._onMouseUp);
        this._element.removeEventListener('wheel', this._onWheel);
        this._element.removeEventListener('contextmenu', this._onContextMenu);
    }

    private _onMouseDown = (event: globalThis.MouseEvent) => {
        if (!this._enabled) return;
        this._buttons.add(event.button);
        this._updatePosition(event);
        this.emit('mousedown', this._createEvent(event));
    };

    private _onMouseMove = (event: globalThis.MouseEvent) => {
        if (!this._enabled) return;
        this._updatePosition(event);
        this.emit('mousemove', this._createEvent(event));
    };

    private _onMouseUp = (event: globalThis.MouseEvent) => {
        if (!this._enabled) return;
        this._buttons.delete(event.button);
        this._updatePosition(event);
        this.emit('mouseup', this._createEvent(event));
    };

    private _onWheel = (event: WheelEvent) => {
        if (!this._enabled) return;
        event.preventDefault();
        this._wheel = event.deltaY;
        this.emit('wheel', this._createWheelEvent(event));
    };

    private _onContextMenu = (event: globalThis.MouseEvent) => {
        event.preventDefault();
    };

    private _updatePosition(event: globalThis.MouseEvent): void {
        const rect = this._element!.getBoundingClientRect();
        this._lastPosition.copy(this._position);
        this._position.set(
            event.clientX - rect.left,
            event.clientY - rect.top
        );
        this._delta.copy(this._position).sub(this._lastPosition);
    }

    private _createEvent(event: globalThis.MouseEvent): MouseEvent {
        return {
            position: this._position.clone(),
            delta: this._delta.clone(),
            button: event.button,
            buttons: this.buttons,
            wheel: this._wheel,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        };
    }

    private _createWheelEvent(event: WheelEvent): MouseEvent {
        return {
            position: this._position.clone(),
            delta: this._delta.clone(),
            button: -1,
            buttons: this.buttons,
            wheel: this._wheel,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        };
    }

    get position(): Vec2 {
        return this._position.clone();
    }

    get delta(): Vec2 {
        return this._delta.clone();
    }

    get wheel(): number {
        return this._wheel;
    }

    get buttons(): number {
        let mask = 0;
        this._buttons.forEach(b => mask |= 1 << b);
        return mask;
    }

    isPressed(button: number): boolean {
        return this._buttons.has(button);
    }

    isAnyPressed(): boolean {
        return this._buttons.size > 0;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        this._enabled = value;
    }

    get attached(): boolean {
        return this._attached;
    }

    update(): void {
        this._wheel = 0;
        this._delta.set(0, 0);
    }

    dispose(): void {
        this.detach();
        this.removeAllListeners();
    }
}
