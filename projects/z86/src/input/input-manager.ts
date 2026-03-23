import { EventEmitter } from '../core';
import { Keyboard } from './keyboard';
import { Mouse } from './mouse';
import { Touch } from './touch';
import { Gamepad } from './gamepad';
import { ElementInput } from './element-input';

export class InputManager extends EventEmitter {
    keyboard: Keyboard;
    mouse: Mouse;
    touch: Touch;
    gamepad: Gamepad;
    elementInput: ElementInput;
    private _attached: boolean = false;
    private _targetElement: HTMLElement | null = null;

    constructor() {
        super();
        this.keyboard = new Keyboard();
        this.mouse = new Mouse();
        this.touch = new Touch();
        this.gamepad = new Gamepad();
        this.elementInput = new ElementInput();
    }

    attach(targetElement?: HTMLElement): void {
        if (this._attached) {
            this.detach();
        }

        this._targetElement = targetElement || document.body;
        this._attached = true;

        this.keyboard.attach(this._targetElement);
        this.mouse.attach(this._targetElement);
        this.touch.attach(this._targetElement);
        this.gamepad.attach();

        this._targetElement.addEventListener('contextmenu', this._onContextMenu);
        this._targetElement.addEventListener('selectstart', this._onSelectStart);
        this._targetElement.addEventListener('dragstart', this._onDragStart);
    }

    detach(): void {
        if (!this._attached) {
            return;
        }

        this.keyboard.detach();
        this.mouse.detach();
        this.touch.detach();
        this.gamepad.detach();

        if (this._targetElement) {
            this._targetElement.removeEventListener('contextmenu', this._onContextMenu);
            this._targetElement.removeEventListener('selectstart', this._onSelectStart);
            this._targetElement.removeEventListener('dragstart', this._onDragStart);
        }

        this._attached = false;
        this._targetElement = null;
    }

    update(): void {
        if (!this._attached) {
            return;
        }

        this.keyboard.update();
        this.mouse.update();
        this.touch.update();
        this.gamepad.update();
    }

    isAttached(): boolean {
        return this._attached;
    }

    getTargetElement(): HTMLElement | null {
        return this._targetElement;
    }

    private _onContextMenu = (event: Event): void => {
        event.preventDefault();
    };

    private _onSelectStart = (event: Event): void => {
        event.preventDefault();
    };

    private _onDragStart = (event: Event): void => {
        event.preventDefault();
    };
}
