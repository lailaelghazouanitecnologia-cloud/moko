import { Keyboard } from './keyboard';
import { Mouse } from './mouse';
import { Touch } from './touch';
import { Gamepad } from './gamepad';
import { EventHandler } from '../core';

export class InputManager {
    private keyboard: Keyboard;
    private mouse: Mouse;
    private touch: Touch;
    private gamepads: Gamepad[];
    private enabled: boolean;
    private events: EventHandler;

    constructor() {
        this.keyboard = new Keyboard();
        this.mouse = new Mouse();
        this.touch = new Touch();
        this.gamepads = [];
        this.enabled = true;
        this.events = new EventHandler();
    }

    update(dt: number): void {
        if (!this.enabled) return;

        this.keyboard.update();
        this.mouse.update();
        this.touch.update();

        for (const gamepad of this.gamepads) {
            if (gamepad) {
                gamepad.update();
            }
        }
    }

    isAnyKeyPressed(): boolean {
        return this.keyboard.isAnyKeyPressed();
    }

    wasAnyKeyPressed(): boolean {
        return this.keyboard.wasAnyKeyPressed();
    }

    getGamepad(index: number): Gamepad | undefined {
        return this.gamepads[index];
    }

    getGamepads(): Gamepad[] {
        return this.gamepads.filter(gamepad => gamepad !== undefined);
    }

    scanGamepads(): void {
        if (typeof navigator === 'undefined' || !navigator.getGamepads) return;

        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (gamepad) {
                if (!this.gamepads[i]) {
                    const newGamepad = new Gamepad(gamepad);
                    this.gamepads[i] = newGamepad;
                    this.onGamepadConnected(newGamepad);
                } else {
                    this.gamepads[i].updateGamepad(gamepad);
                }
            } else if (this.gamepads[i]) {
                const disconnectedGamepad = this.gamepads[i];
                this.gamepads[i] = undefined;
                this.onGamepadDisconnected(disconnectedGamepad);
            }
        }
    }

    attach(element: HTMLElement): void {
        this.keyboard.attach(element);
        this.mouse.attach(element);
        this.touch.attach(element);
    }

    detach(): void {
        this.keyboard.detach();
        this.mouse.detach();
        this.touch.detach();
    }

    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
    }

    destroy(): void {
        this.keyboard.destroy();
        this.mouse.destroy();
        this.touch.destroy();

        for (const gamepad of this.gamepads) {
            if (gamepad) {
                gamepad.destroy();
            }
        }
        this.gamepads = [];

        this.events.destroy();
    }

    onGamepadConnected(gamepad: Gamepad): void {
        this.events.fire('gamepadconnected', gamepad);
    }

    onGamepadDisconnected(gamepad: Gamepad): void {
        this.events.fire('gamepaddisconnected', gamepad);
    }
}
