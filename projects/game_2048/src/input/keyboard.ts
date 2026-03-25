import { Platform } from '../core/platform';

/**
 * Abstraction for keyboard input.
 * Tracks key states, key presses/releases, and maintains a buffer of pressed keys.
 */
export class Keyboard {
    private keys: Map<string, boolean>;
    private keyBuffer: string[];
    private enabled: boolean;
    private justPressed: Set<string>;
    private justReleased: Set<string>;

    constructor() {
        this.keys = new Map<string, boolean>();
        this.keyBuffer = [];
        this.enabled = false;
        this.justPressed = new Set<string>();
        this.justReleased = new Set<string>();
        
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }

    /**
     * Handles keydown events.
     * @private
     * @param event - The keyboard event.
     * @returns {void}
     */
    private handleKeyDown(event: KeyboardEvent): void {
        if (!this.enabled) return;
        
        const key = event.code || event.key;
        if (!key) {
            console.warn('Keyboard: Invalid key code received');
            return;
        }

        if (!this.keys.get(key)) {
            this.justPressed.add(key);
        }
        this.keys.set(key, true);
        this.keyBuffer.push(key);
    }

    /**
     * Handles keyup events.
     * @private
     * @param event - The keyboard event.
     * @returns {void}
     */
    private handleKeyUp(event: KeyboardEvent): void {
        if (!this.enabled) return;
        
        const key = event.code || event.key;
        if (!key) {
            console.warn('Keyboard: Invalid key code received');
            return;
        }

        if (this.keys.get(key)) {
            this.justReleased.add(key);
        }
        this.keys.set(key, false);
    }

    /**
     * Check if a key is currently pressed down.
     * @param key - The key code to check.
     * @returns {boolean} True if the key is pressed, false otherwise.
     */
    isKeyDown(key: string): boolean {
        if (typeof key !== 'string' || key.trim() === '') {
            console.warn('Keyboard: Invalid key provided to isKeyDown');
            return false;
        }
        return this.keys.get(key) || false;
    }

    /**
     * Check if a key was just pressed in the current frame.
     * @param key - The key code to check.
     * @returns {boolean} True if the key was just pressed, false otherwise.
     */
    isKeyPressed(key: string): boolean {
        if (typeof key !== 'string' || key.trim() === '') {
            console.warn('Keyboard: Invalid key provided to isKeyPressed');
            return false;
        }
        return this.justPressed.has(key);
    }

    /**
     * Check if a key was just released in the current frame.
     * @param key - The key code to check.
     * @returns {boolean} True if the key was just released, false otherwise.
     */
    isKeyReleased(key: string): boolean {
        if (typeof key !== 'string' || key.trim() === '') {
            console.warn('Keyboard: Invalid key provided to isKeyReleased');
            return false;
        }
        return this.justReleased.has(key);
    }

    /**
     * Get a copy of the key buffer.
     * @returns {string[]} Array of key codes pressed since the last buffer clear.
     */
    getKeyBuffer(): string[] {
        return [...this.keyBuffer];
    }

    /**
     * Clear the key buffer.
     * @returns {void}
     */
    clearBuffer(): void {
        this.keyBuffer = [];
    }

    /**
     * Enable keyboard input capture.
     * @returns {void}
     */
    enable(): void {
        if (this.enabled) return;
        
        this.enabled = true;
        if (Platform.isBrowser) {
            window.addEventListener('keydown', this.handleKeyDown);
            window.addEventListener('keyup', this.handleKeyUp);
        }
    }

    /**
     * Disable keyboard input capture.
     * @returns {void}
     */
    disable(): void {
        if (!this.enabled) return;
        
        this.enabled = false;
        if (Platform.isBrowser) {
            window.removeEventListener('keydown', this.handleKeyDown);
            window.removeEventListener('keyup', this.handleKeyUp);
        }
        this.keys.clear();
        this.keyBuffer = [];
        this.justPressed.clear();
        this.justReleased.clear();
    }

    /**
     * Update key states for the next frame.
     * @param delta - Time elapsed since last update (unused).
     * @returns {void}
     */
    update(delta: number): void {
        this.justPressed.clear();
        this.justReleased.clear();
    }
}