export interface GamepadButton {
    pressed: boolean;
    touched: boolean;
    value: number;
}

export class Gamepad {
    id: string;
    index: number;
    connected: boolean;
    mapping: string;
    buttons: GamepadButton[];
    axes: number[];

    private gamepad: globalThis.Gamepad | null = null;
    private vibrationActuator: any = null;

    constructor(index: number) {
        if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
            throw new Error('Gamepad index must be a non-negative integer');
        }
        this.index = index;
        this.id = '';
        this.connected = false;
        this.mapping = '';
        this.buttons = [];
        this.axes = [];
    }

    /**
     * Check connection state
     * @returns true if the gamepad is connected
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Retrieve button state
     * @param index - index of the button
     * @returns GamepadButton state
     */
    getButton(index: number): GamepadButton {
        if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
            return { pressed: false, touched: false, value: 0 };
        }
        if (index < 0 || index >= this.buttons.length) {
            return { pressed: false, touched: false, value: 0 };
        }
        return this.buttons[index];
    }

    /**
     * Get axis value
     * @param index - index of the axis
     * @returns value of the axis
     */
    getAxis(index: number): number {
        if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
            return 0;
        }
        if (index < 0 || index >= this.axes.length) {
            return 0;
        }
        return this.axes[index];
    }

    /**
     * Get all axes
     * @returns array of axis values
     */
    getAxes(): number[] {
        return [...this.axes];
    }

    /**
     * Get all buttons
     * @returns array of button states
     */
    getButtons(): GamepadButton[] {
        return [...this.buttons];
    }

    /**
     * Trigger vibration
     * @param duration - vibration duration in milliseconds
     *  @param weak - weak motor magnitude (0-1)
     * @param strong - strong motor magnitude (0-1)
     * @returns true if vibration was started
     */
    vibrate(duration: number, weak: number, strong: number): boolean {
        if (typeof duration !== 'number' || duration <= 0 || !Number.isFinite(duration)) {
            return false;
        }
        if (typeof weak !== 'number' || typeof strong !== 'number') {
            return false;
        }
        if (!this.vibrationActuator) {
            return false;
        }
        
        try {
            this.vibrationActuator.playEffect('dual-rumble', {
                duration: duration,
                strongMagnitude: Math.max(0, Math.min(1, strong)),
                weakMagnitude: Math.max(0, Math.min(1, weak))
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Update internal state from browser gamepad
     */
    update(): void {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            return;
        }

        let gamepads: (globalThis.Gamepad | null)[];
        try {
            gamepads = navigator.getGamepads();
        } catch {
            this.connected = false;
            this.id = '';
            this.mapping = '';
            this.buttons = [];
            this.axes = [];
            return;
        }

        this.gamepad = gamepads[this.index];

        if (!this.gamepad) {
            this.connected = false;
            this.id = '';
            this.mapping = '';
            this.buttons = [];
            this.axes = [];
            return;
        }

        this.connected = this.gamepad.connected;
        this.id = this.gamepad.id;
        this.mapping = this.gamepad.mapping;

        this.buttons = this.gamepad.buttons.map(btn => ({
            pressed: btn.pressed,
            touched: btn.touched,
            value: btn.value
        }));

        this.axes = [...this.gamepad.axes];

        if (this.gamepad.vibrationActuator) {
            this.vibrationActuator = this.gamepad.vibrationActuator;
        }
    }
}
