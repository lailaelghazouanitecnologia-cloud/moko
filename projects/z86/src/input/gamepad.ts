import { EventEmitter } from '../core';
import { Vec2 } from '../math';

export interface GamepadButton {
    pressed: boolean;
    touched: boolean;
    value: number;
}

export interface GamepadAxes {
    leftStick: Vec2;
    rightStick: Vec2;
    leftTrigger: number;
    rightTrigger: number;
}

export class Gamepad extends EventEmitter {
    private gamepad: Gamepad | null = null;
    private index: number;
    private buttons: GamepadButton[] = [];
    private axes: number[] = [];
    private prevButtons: GamepadButton[] = [];
    private prevAxes: number[] = [];
    private connected: boolean = false;
    private mapping: string = 'standard';

    constructor(index: number = 0) {
        super();
        this.index = index;
        this.setupEventListeners();
        this.checkConnection();
    }

    private setupEventListeners(): void {
        window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
            if (e.gamepad.index === this.index) {
                this.gamepad = e.gamepad;
                this.connected = true;
                this.initializeState();
                this.emit('connected', this);
            }
        });

        window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
            if (e.gamepad.index === this.index) {
                this.connected = false;
                this.emit('disconnected', this);
            }
        });
    }

    private checkConnection(): void {
        const gamepads = navigator.getGamepads();
        if (gamepads[this.index]) {
            this.gamepad = gamepads[this.index];
            this.connected = true;
            this.initializeState();
        }
    }

    private initializeState(): void {
        if (!this.gamepad) return;
        
        this.buttons = new Array(this.gamepad.buttons.length);
        this.prevButtons = new Array(this.gamepad.buttons.length);
        this.axes = new Array(this.gamepad.axes.length);
        this.prevAxes = new Array(this.gamepad.axes.length);

        for (let i = 0; i < this.gamepad.buttons.length; i++) {
            this.buttons[i] = {
                pressed: this.gamepad.buttons[i].pressed,
                touched: this.gamepad.buttons[i].touched,
                value: this.gamepad.buttons[i].value
            };
            this.prevButtons[i] = { ...this.buttons[i] };
        }

        for (let i = 0; i < this.gamepad.axes.length; i++) {
            this.axes[i] = this.gamepad.axes[i];
            this.prevAxes[i] = this.axes[i];
        }
    }

    update(): void {
        if (!this.connected) {
            this.checkConnection();
            return;
        }

        const gamepads = navigator.getGamepads();
        this.gamepad = gamepads[this.index];

        if (!this.gamepad) {
            this.connected = false;
            this.emit('disconnected', this);
            return;
        }

        // Store previous state
        for (let i = 0; i < this.buttons.length; i++) {
            this.prevButtons[i] = { ...this.buttons[i] };
        }
        for (let i = 0; i < this.axes.length; i++) {
            this.prevAxes[i] = this.axes[i];
        }

        // Update current state
        for (let i = 0; i < this.gamepad.buttons.length; i++) {
            const button = this.gamepad.buttons[i];
            this.buttons[i] = {
                pressed: button.pressed,
                touched: button.touched,
                value: button.value
            };

            // Emit button events
            if (button.pressed && !this.prevButtons[i].pressed) {
                this.emit('buttonDown', i, this.buttons[i]);
            } else if (!button.pressed && this.prevButtons[i].pressed) {
                this.emit('buttonUp', i, this.buttons[i]);
            }
        }

        for (let i = 0; i < this.gamepad.axes.length; i++) {
            this.axes[i] = this.gamepad.axes[i];
            
            // Emit axis events for significant changes
            const delta = Math.abs(this.axes[i] - this.prevAxes[i]);
            if (delta > 0.01) {
                this.emit('axisMove', i, this.axes[i], this.prevAxes[i]);
            }
        }
    }

    getButton(index: number): GamepadButton {
        if (index < 0 || index >= this.buttons.length) {
            return { pressed: false, touched: false, value: 0 };
        }
        return this.buttons[index];
    }

    getAxis(index: number): number {
        if (index < 0 || index >= this.axes.length) {
            return 0;
        }
        return this.axes[index];
    }

    getAxes(): GamepadAxes {
        return {
            leftStick: new Vec2(this.getAxis(0), this.getAxis(1)),
            rightStick: new Vec2(this.getAxis(2), this.getAxis(3)),
            leftTrigger: this.getAxis(4),
            rightTrigger: this.getAxis(5)
        };
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
        return this.mapping;
    }

    getTimestamp(): number {
        return this.gamepad?.timestamp || 0;
    }

    vibracte(duration: number = 200, weakMagnitude: number = 0.5, strongMagnitude: number = 0.5): Promise<boolean> {
        if (!this.gamepad || !('vibrationActuator' in this.gamepad)) {
            return Promise.resolve(false);
        }

        const actuator = (this.gamepad as any).vibrationActuator;
        if (!actuator || actuator.type !== 'dual-rumble') {
            return Promise.resolve(false);
        }

        return actuator.playEffect('dual-rumble', {
            duration: duration,
            weakMagnitude: weakMagnitude,
            strongMagnitude: strongMagnitude
        });
    }
}
