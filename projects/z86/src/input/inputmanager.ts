import { EventEmitter } from '../core/eventemitter';
import { Keyboard } from './keyboard';
import { Mouse } from './mouse';
import { Touch } from './touch';
import { Gamepad } from './gamepad';
import { ElementInput } from './elementinput';

export class InputManager extends EventEmitter {
    private _keyboard: Keyboard;
    private _mouse: Mouse;
    private _touch: Touch;
    private _gamepad: Gamepad;
    private _elementInput: ElementInput;
    private _enabled: boolean = true;

    constructor() {
        super();
        this._keyboard = new Keyboard();
        this._mouse = new Mouse();
        this._touch = new Touch();
        this._gamepad = new Gamepad();
        this._elementInput = new ElementInput();
    }

    get keyboard(): Keyboard {
        return this._keyboard;
    }

    get mouse(): Mouse {
        return this._mouse;
    }

    get touch(): Touch {
        return this._touch;
    }

    get gamepad(): Gamepad {
        return this._gamepad;
    }

    get elementInput(): ElementInput {
        return this._elementInput;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        this._enabled = value;
    }

    update(): void {
        if (!this._enabled) return;
        this._keyboard.update();
        this._mouse.update();
        this._touch.update();
        this._gamepad.update();
        this._elementInput.update();
    }

    destroy(): void {
        this._keyboard.destroy();
        this._mouse.destroy();
        this._touch.destroy();
        this._gamepad.destroy();
        this._elementInput.destroy();
        this.off();
    }
}
