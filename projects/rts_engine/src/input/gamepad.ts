import { Platform } from '../core/platform';

/**
 * Gamepad input abstraction
 */
export class Gamepad {
    public id: string;
    public index: number;
    public connected: boolean;
    public timestamp: number;
    public mapping: string;
    public axes: number[];
    public buttons: number[];

    constructor() {
        this.id = '';
        this.index = -1;
        this.connected = false;
        this.timestamp = 0;
        this.mapping = '';
        this.axes = [];
        this.buttons = [];
    }

    /**
     * Check connection state
     * @returns {boolean} true if the gamepad is connected
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Get button value
     * @param {number} index - The button index
     * @returns {number} The button value (0 to 1)
     * @throws {RangeError} If index is not a non-negative integer
     */
    getButton(index: number): number {
        this.#validateIndex(index, 'button');
        return index < this.buttons.length ? this.buttons[index] : 0;
    }

    /**
     * Get axis value
     * @param {number} index - The axis index
     * @returns {number} The axis value (-1 to 1)
     * @throws {RangeError} If index is not a non-negative integer
     */
    getAxis(index: number): number {
        this.#validateIndex(index, 'axis');
        return index < this.axes.length ? this.axes[index] : 0;
    }

    /**
     * Get all axes
     * @returns {number[]} A shallow copy of the axes array
     */
    getAxes(): number[] {
        return [...this.axes];
    }

    /**
     * Get all buttons
     * @returns {number[]} A shallow copy of the buttons array
     */
    getButtons(): number[] {
        return [...this.buttons];
    }

    /**
     * Update gamepad state
     * @param {Gamepad} state - The new gamepad state from the browser API
     * @throws {TypeError} If state is not a valid Gamepad object
     */
    update(state: Gamepad): void {
        if (!state || typeof state !== 'object') {
            throw new TypeError('Expected a valid Gamepad object');
        }
        this.connected = Boolean(state.connected);
        this.timestamp = Number(state.timestamp) || 0;
        this.mapping = String(state.mapping || '');
        this.axes = Array.isArray(state.axes) ? [...state.axes] : [];
        this.buttons = Array.isArray(state.buttons) ? [...state.buttons] : [];
    }

    /**
     * Trigger vibration
     * @param {number} duration - Duration in milliseconds (must be non-negative)
     * @param {number} weak - Weak motor magnitude (0 to 1)
     * @param {number} strong - Strong motor magnitude (0 to 1)
     * @throws {RangeError} If any numeric parameter is out of range
     */
    vibrate(duration: number, weak: number, strong: number): void {
        this.#validateVibrationParams(duration, weak, strong);
        if (!Platform.isBrowser) return;

        const navigator = window.navigator as any;
        if (typeof navigator.getGamepads !== 'function') return;

        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.index];
        if (!gamepad || !gamepad.vibrationActuator) return;

        gamepad.vibrationActuator.playEffect('dual-rumble', {
            duration: Math.max(0, Math.floor(duration)),
            strongMagnitude: Math.max(0, Math.min(1, strong)),
            weakMagnitude: Math.max(0, Math.min(1, weak)),
        });
    }

    /**
     * Validate an index for array access
     * @private
     * @param {number} index
     * @param {'button' | 'axis'} type
     * @throws {RangeError} If index is not a non-negative integer
     */
    #validateIndex(index: number, type: 'button' | 'axis'): void {
        if (!Number.isInteger(index) || index < 0) {
            throw new RangeError(`${type} index must be a non-negative integer`);
        }
    }

    /**
     * Validate vibration parameters
     * @private
     * @param {number} duration
     * @param {number} weak
     * @param {number} strong
     * @throws {RangeError} If any parameter is out of range
     */
    #validateVibrationParams(duration: number, weak: number, strong: number): void {
        if (!Number.isFinite(duration) || duration < 0) {
            throw new RangeError('duration must be a non-negative number');
        }
        if (!Number.isFinite(weak) || weak < 0 || weak > 1) {
            throw new RangeError('weak magnitude must be between 0 and 1');
        }
        if (!Number.isFinite(strong) || strong < 0 || strong > 1) {
            throw new RangeError('strong magnitude must be between 0 and 1');
        }
    }
}