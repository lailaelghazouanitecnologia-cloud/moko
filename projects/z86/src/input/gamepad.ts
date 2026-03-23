import { EventEmitter } from '../core/EventEmitter';
import { Vec2 } from '../math/Vec2';

export interface GamepadButton {
    pressed: boolean;
    touched: boolean;
    value: number;
}

export interface GamepadAxis {
    x: number;
    y: number;
}

export class Gamepad extends EventEmitter {
    private index: number;
    private gamepad: globalThis.Gamepad | null = null;
    private buttons: GamepadButton[] = [];
    private axes: number[] = [];
    private connected: boolean = false;
    private timestamp: number = 0;

    constructor(index: number = 0) {
        super();
        this.index = index;
        this.update();
    }

    update(): void {
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.index];

        if (gamepad) {
            if (!this.connected) {
                this.connected = true;
                this.emit('connected', { gamepad: this });
            }

            this.gamepad = gamepad;
            this.timestamp = gamepad.timestamp;

            // Update buttons
            this.buttons = gamepad.buttons.map(button => ({
                pressed: button.pressed,
                touched: button.touched,
                value: button.value
            }));

            // Update axes
            this.axes = [...gamepad.axes];
        } else {
            if (this.connected) {
                this.connected = false;
                this.emit('disconnected', { gamepad: this });
            }
            this.gamepad = null;
            this.buttons = [];
            this.axes = [];
        }
    }

    getButton(buttonIndex: number): GamepadButton {
        if (buttonIndex < 0 || buttonIndex >= this.buttons.length) {
            return { pressed: false, touched: false, value: 0 };
        }
        return this.buttons[buttonIndex];
    }

    getAxis(axisIndex: number): number {
        if (axisIndex < 0 || axisIndex >= this.axes.length) {
            return 0;
        }
        return this.axes[axisIndex];
    }

    getAxes(): number[] {
        return [...this.axes];
    }

    getButtons(): GamepadButton[] {
        return this.buttons.map(b => ({ ...b }));
    }

    isConnected(): boolean {
        return this.connected;
    }

    getIndex(): number {
        return this.index;
    }

    getId(): string {
        return this.gamepad?.id || '';
    }

    getMapping(): string {
        return this.gamepad?.mapping || '';
    }

    getTimestamp(): number {
        return this.timestamp;
    }

    vibrate(duration: number, weakMagnitude: number = 0.5, strongMagnitude: number = 0.5): Promise<boolean> {
        if (!this.gamepad || !('vibrationActuator' in this.gamepad)) {
            return Promise.resolve(false);
        }

        const actuator = (this.gamepad as any).vibrationActuator;
        if (!actuator) {
            return Promise.resolve(false);
        }

        return actuator.playEffect('dual-rumble', {
            duration: duration,
            weakMagnitude: weakMagnitude,
            strongMagnitude: strongMagnitude
        });
    }
}
