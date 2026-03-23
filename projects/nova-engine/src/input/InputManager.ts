import { Keyboard } from './Keyboard';
import { Mouse } from './Mouse';
import { Touch } from './Touch';
import { Gamepad } from './Gamepad';

export class InputManager {
    private keyboard: Keyboard;
    private mouse: Mouse;
    private touch: Touch;
    private gamepad: Gamepad;
    private enabled: boolean;

    constructor() {
        this.keyboard = new Keyboard();
        this.mouse = new Mouse();
        this.touch = new Touch();
        this.gamepad = new Gamepad();
        this.enabled = true;
    }

    update(): void {
        if (!this.enabled) return;
        this.keyboard.update();
        this.mouse.update();
        this.touch.update();
        this.gamepad.update();
    }

    isAnyPressed(): boolean {
        if (!this.enabled) return false;
        return this.keyboard.isAnyPressed() || 
               this.mouse.isAnyPressed() || 
               this.touch.isAnyPressed() || 
               this.gamepad.isAnyPressed();
    }

    resetAll(): void {
        this.keyboard.reset();
        this.mouse.reset();
        this.touch.reset();
        this.gamepad.reset();
    }

    disable(): void {
        this.enabled = false;
    }

    enable(): void {
        this.enabled = true;
    }
}
