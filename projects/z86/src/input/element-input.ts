import { EventEmitter } from '../core';
import { Vec2 } from '../math';

export class ElementInput extends EventEmitter {
    private _element: HTMLElement | null = null;
    private _attached = false;
    private _events = new Map<string, EventListener>();

    constructor() {
        super();
    }

    attach(element: HTMLElement): void {
        if (this._attached) {
            this.detach();
        }

        this._element = element;
        this._attached = true;

        this._events.set('mousedown', this._onMouseDown.bind(this));
        this._events.set('mouseup', this._onMouseUp.bind(this));
        this._events.set('mousemove', this._onMouseMove.bind(this));
        this._events.set('click', this._onClick.bind(this));
        this._events.set('dblclick', this._onDblClick.bind(this));
        this._events.set('wheel', this._onWheel.bind(this));
        this._events.set('touchstart', this._onTouchStart.bind(this));
        this._events.set('touchend', this._onTouchEnd.bind(this));
        this._events.set('touchmove', this._onTouchMove.bind(this));
        this._events.set('keydown', this._onKeyDown.bind(this));
        this._events.set('keyup', this._onKeyUp.bind(this));
        this._events.set('keypress', this._onKeyPress.bind(this));
        this._events.set('focus', this._onFocus.bind(this));
        this._events.set('blur', this._onBlur.bind(this));

        this._events.forEach((listener, event) => {
            this._element!.addEventListener(event, listener);
        });
    }

    detach(): void {
        if (!this._attached || !this._element) {
            return;
        }

        this._events.forEach((listener, event) => {
            this._element!.removeEventListener(event, listener);
        });

        this._element = null;
        this._attached = false;
    }

    private _onMouseDown(event: MouseEvent): void {
        this.emit('mousedown', {
            x: event.clientX,
            y: event.clientY,
            button: event.button,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        });
    }

    private _onMouseUp(event: MouseEvent): void {
        this.emit('mouseup', {
            x: event.clientX,
            y: event.clientY,
            button: event.button,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        });
    }

    private _onMouseMove(event: MouseEvent): void {
        this.emit('mousemove', {
            x: event.clientX,
            y: event.clientY,
            dx: event.movementX,
            dy: event.movementY,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        });
    }

    private _onClick(event: MouseEvent): void {
        this.emit('click', {
            x: event.clientX,
            y: event.clientY,
            button: event.button,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        });
    }

    private _onDblClick(event: MouseEvent): void {
        this.emit('dblclick', {
            x: event.clientX,
            y: event.clientY,
            button: event.button,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        });
    }

    private _onWheel(event: WheelEvent): void {
        this.emit('wheel', {
            x: event.clientX,
            y: event.clientY,
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            deltaZ: event.deltaZ,
            deltaMode: event.deltaMode,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        });
    }

    private _onTouchStart(event: TouchEvent): void {
        const touches = Array.from(event.touches).map(touch => ({
            id: touch.identifier,
            x: touch.clientX,
            y: touch.clientY
        }));

        this.emit('touchstart', {
            touches: touches,
            changedTouches: Array.from(event.changedTouches).map(touch => ({
                id: touch.identifier,
                x: touch.clientX,
                y: touch.clientY
            })),
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        });
    }

    private _onTouchEnd(event: TouchEvent): void {
        const touches = Array.from(event.touches).map(touch => ({
            id: touch.identifier,
            x: touch.clientX,
            y: touch.clientY
        }));

        this.emit('touchend', {
            touches: touches,
            changedTouches: Array.from(event.changedTouches).map(touch => ({
                id: touch.identifier,
                x: touch.clientX,
                y: touch.clientY
            })),
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        });
    }

    private _onTouchMove(event: TouchEvent): void {
        const touches = Array.from(event.touches).map(touch => ({
            id: touch.identifier,
            x: touch.clientX,
            y: touch.clientY
        }));

        this.emit('touchmove', {
            touches: touches,
            changedTouches: Array.from(event.changedTouches).map(touch => ({
                id: touch.identifier,
                x: touch.clientX,
                y: touch.clientY
            })),
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        });
    }

    private _onKeyDown(event: KeyboardEvent): void {
        this.emit('keydown', {
            key: event.key,
            code: event.code,
            keyCode: event.keyCode,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            repeat: event.repeat
        });
    }

    private _onKeyUp(event: KeyboardEvent): void {
        this.emit('keyup', {
            key: event.key,
            code: event.code,
            keyCode: event.keyCode,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            repeat: event.repeat
        });
    }

    private _onKeyPress(event: KeyboardEvent): void {
        this.emit('keypress', {
            key: event.key,
            code: event.code,
            keyCode: event.keyCode,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            repeat: event.repeat
        });
    }

    private _onFocus(event: FocusEvent): void {
        this.emit('focus', {});
    }

    private _onBlur(event: FocusEvent): void {
        this.emit('blur', {});
    }

    get attached(): boolean {
        return this._attached;
    }

    get element(): HTMLElement | null {
        return this._element;
    }
}
