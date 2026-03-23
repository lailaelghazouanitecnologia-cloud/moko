import { EventHandler } from '../core';

export class GamepadButton {
    pressed: boolean;
    value: number;
    touched?: boolean;

    constructor(pressed: boolean = false, value: number = 0, touched?: boolean) {
        this.pressed = pressed;
        this.value = value;
        this.touched = touched;
    }
}

export class Gamepad {
    id: string;
    index: number;
    connected: boolean;
    timestamp: number;
    buttons: Map<number, GamepadButton>;
    axes: Map<number, number>;
    prevButtons: Map<number, GamepadButton>;
    prevAxes: Map<number, number>;
    events: EventHandler;

    static readonly BUTTON_A = 0;
    static readonly BUTTON_B = 1;
    static readonly BUTTON_X = 2;
    static readonly BUTTON_Y = 3;
    static readonly AXIS_LEFT_X = 0;
    static readonly AXIS_LEFT_Y = 1;
    static readonly AXIS_RIGHT_X = 2;
    static readonly AXIS_RIGHT_Y = 3;

    constructor(id: string, index: number = 0) {
        this.id = id;
        this.index = index;
        this.connected = false;
        this.timestamp = 0;
        this.buttons = new Map();
        this.axes = new Map();
        this.prevButtons = new Map();
        this.prevAxes = new Map();
        this.events = new EventHandler();
    }

    isPressed(button: number): boolean {
        const btn = this.buttons.get(button);
        return btn ? btn.pressed : false;
    }

    wasPressed(button: number): boolean {
        const current = this.buttons.get(button);
        const prev = this.prevButtons.get(button);
        return (current && current.pressed) && (!prev || !prev.pressed);
    }

    wasReleased(button: number): boolean {
        const current = this.buttons.get(button);
        const prev = this.prevButtons.get(button);
        return (!current || !current.pressed) && (prev && prev.pressed);
    }

    getAxis(axis: number): number {
        return this.axes.get(axis) || 0;
    }

    getAxisDelta(axis: number): number {
        const current = this.axes.get(axis) || 0;
        const prev = this.prevAxes.get(axis) || 0;
        return current - prev;
    }

    update(gamepad: any): void {
        // Store previous state
        this.prevButtons.clear();
        this.prevAxes.clear();
        
        for (const [key, value] of this.buttons) {
            this.prevButtons.set(key, new GamepadButton(value.pressed, value.value, value.touched));
        }
        for (const [key, value] of this.axes) {
            this.prevAxes.set(key, value);
        }

        // Update current state
        this.connected = gamepad.connected;
        this.timestamp = gamepad.timestamp;

        // Update buttons
        this.buttons.clear();
        if (gamepad.buttons) {
            for (let i = 0; i < gamepad.buttons.length; i++) {
                const btn = gamepad.buttons[i];
                this.buttons.set(i, new GamepadButton(btn.pressed, btn.value, btn.touched));
            }
        }

        // Update axes
        this.axes.clear();
        if (gamepad.axes) {
            for (let i = 0; i < gamepad.axes.length; i++) {
                this.axes.set(i, gamepad.axes[i]);
            }
        }

        // Fire events for button changes
        for (const [key, current] of this.buttons) {
            const prev = this.prevButtons.get(key);
            if (!prev || prev.pressed !== current.pressed) {
                this.events.fire(current.pressed ? 'buttondown' : 'buttonup', {
                    button: key,
                    gamepad: this
                });
            }
        }
    }

    vibrate(duration: number, weak: number, strong: number): void {
        if (navigator.getGamepads && this.connected) {
            const gamepad = navigator.getGamepads()[this.index];
            if (gamepad && gamepad.vibrationActuator) {
                gamepad.vibrationActuator.playEffect('dual-rumble', {
                    duration: duration,
                    strongMagnitude: strong,
                    weakMagnitude: weak
                }).catch(() => {
                    // Ignore vibration errors
                });
            }
        }
    }

    destroy(): void {
        this.events.off();
        this.buttons.clear();
        this.axes.clear();
        this.prevButtons.clear();
        this.prevAxes.clear();
    }
}
