class EventEmitter {
    private events: { [key: string]: Function[] } = {};

    on(event: string, listener: Function): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    emit(event: string, ...args: any[]): void {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(...args));
        }
    }

    removeAllListeners(event?: string): void {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}

import { InputDevice } from './input-device';

/**
 * Keyboard input device implementation.
 * Provides platform-agnostic keyboard input handling with event support.
 */
export class Keyboard implements InputDevice {
    private keys: Map<number, boolean> = new Map<number, boolean>();
    private keyEvents: EventEmitter = new EventEmitter();
    private isDisposed: boolean = false;

    constructor() {
        this.validateEnvironment();
    }

    /**
     * Initializes keyboard event handling for the current platform.
     * @throws {Error} If initialization fails
     */
    connect(): void {
        this.validateNotDisposed();
        try {
            this.setupEventListeners();
        } catch (error) {
            throw new Error(`Failed to connect keyboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Disconnects the keyboard and releases all resources.
     */
    disconnect(): void {
        this.validateNotDisposed();
        this.cleanupEventListeners();
        this.keys.clear();
        this.keyEvents.removeAllListeners();
        this.isDisposed = true;
    }

    /**
     * Checks if the keyboard is connected and operational.
     * @returns {boolean} True if keyboard is connected
     */
    isConnected(): boolean {
        return !this.isDisposed;
    }

    /**
     * Gets the unique identifier for this input device.
     * @returns {string} Device identifier
     */
    getId(): string {
        return 'keyboard';
    }

    /**
     * Checks if a specific key is currently pressed.
     * @param {number} keyCode - The key code to check
     * @returns {boolean} True if the key is pressed
     * @throws {Error} If keyCode is invalid
     */
    isKeyPressed(keyCode: number): boolean {
        this.validateNotDisposed();
        this.validateKeyCode(keyCode);
        return this.keys.get(keyCode) || false;
    }

    /**
     * Registers a callback for key down events.
     * @param {function} callback - Function to call when key is pressed
     * @throws {Error} If callback is not a function
     */
    onKeyDown(callback: (key: number) => void): void {
        this.validateNotDisposed();
        this.validateCallback(callback);
        this.keyEvents.on('keydown', callback);
    }

    /**
     * Registers a callback for key up events.
     * @param {function} callback - Function to call when key is released
     * @throws {Error} If callback is not a function
     */
    onKeyUp(callback: (key: number) => void): void {
        this.validateNotDisposed();
        this.validateCallback(callback);
        this.keyEvents.on('keyup', callback);
    }

    /**
     * Gets all currently pressed keys.
     * @returns {number[]} Array of pressed key codes
     */
    getPressedKeys(): number[] {
        this.validateNotDisposed();
        const pressed: number[] = [];
        this.keys.forEach((isPressed, keyCode) => {
            if (isPressed) {
                pressed.push(keyCode);
            }
        });
        return pressed;
    }

    /**
     * Clears all pressed key states.
     */
    clear(): void {
        this.validateNotDisposed();
        this.keys.clear();
    }

    /**
     * Gets the number of currently pressed keys.
     * @returns {number} Count of pressed keys
     */
    getPressedKeyCount(): number {
        this.validateNotDisposed();
        return this.getPressedKeys().length;
    }

    /**
     * Checks if any key is currently pressed.
     * @returns {boolean} True if any key is pressed
     */
    hasPressedKeys(): boolean {
        return this.getPressedKeyCount() > 0;
    }

    /**
     * Removes a specific key from tracking.
     * @param {number} keyCode - The key code to remove
     * @throws {Error} If keyCode is invalid
     */
    removeKey(keyCode: number): void {
        this.validateNotDisposed();
        this.validateKeyCode(keyCode);
        this.keys.delete(keyCode);
    }

    /**
     * Gets the current state of all tracked keys.
     * @returns {Map<number, boolean>} Map of key codes to their pressed state
     */
    getKeyStates(): Map<number, boolean> {
        this.validateNotDisposed();
        return new Map(this.keys);
    }

    /**
     * Handles key down events internally.
     * @private
     * @param {number} keyCode - The key code that was pressed
     */
    private handleKeyDown(keyCode: number): void {
        if (this.isDisposed) return;
        this.keys.set(keyCode, true);
        this.keyEvents.emit('keydown', keyCode);
    }

    /**
     * Handles key up events internally.
     * @private
     * @param {number} keyCode - The key code that was released
     */
    private handleKeyUp(keyCode: number): void {
        if (this.isDisposed) return;
        this.keys.set(keyCode, false);
        this.keyEvents.emit('keyup', keyCode);
    }

    /**
     * Validates that the current environment supports keyboard input.
     * @private
     * @throws {Error} If environment is invalid
     */
    private validateEnvironment(): void {
        if (typeof window === 'undefined' && typeof globalThis === 'undefined') {
            throw new Error('Unsupported environment: Neither window nor global is available');
        }
    }

    /**
     * Validates that the instance has not been disposed.
     * @private
     * @throws {Error} If instance is disposed
     */
    private validateNotDisposed(): void {
        if (this.isDisposed) {
            throw new Error('Keyboard instance has been disposed');
        }
    }

    /**
     * Validates a key code value.
     * @private
     * @param {number} keyCode - The key code to validate
     * @throws {Error} If keyCode is invalid
     */
    private validateKeyCode(keyCode: number): void {
        if (typeof keyCode !== 'number' || isNaN(keyCode) || keyCode < 0 || !isFinite(keyCode)) {
            throw new Error('Invalid key code: must be a non-negative finite number');
        }
    }

    /**
     * Validates a callback function.
     * @private
     * @param {function} callback - The callback to validate
     * * @throws {Error} If callback is not a function
     */
    private validateCallback(callback: Function): void {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
    }

    /**
     * Sets up platform-specific event listeners.
     * @private
     */
    private setupEventListeners(): void {
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('keydown', this.onWindowKeyDown.bind(this));
            window.addEventListener('keyup', this.onWindowKeyUp.bind(this));
        }
    }

    /**
     * Cleans up event listeners.
     * @private
     */
    private cleanupEventListeners(): void {
        if (typeof window !== 'undefined' && window.removeEventListener) {
            window.removeEventListener('keydown', this.onWindowKeyDown.bind(this));
            window.removeEventListener('keyup', this.onWindowKeyUp.bind(this));
        }
    }

    /**
     * Handles window keydown events.
     * @private
     * @param {KeyboardEvent} event - The keyboard event
     */
    private onWindowKeyDown(event: KeyboardEvent): void {
        event.preventDefault();
        this.handleKeyDown(event.keyCode);
    }

    /**
     * Handles window keyup events.
     * @private
     * @param {KeyboardEvent} event - The keyboard event
     */
    private onWindowKeyUp(event: KeyboardEvent): void {
        event.preventDefault();
        this.handleKeyUp(event.keyCode);
    }
}
