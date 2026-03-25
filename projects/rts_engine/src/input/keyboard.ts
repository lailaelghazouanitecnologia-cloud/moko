/**
 * Represents a physical keyboard for input handling.
 * Tracks key states, modifiers, and keyboard layout.
 */
export class Keyboard {
    private keys: Map<string, boolean>;
    private modifiers: Set<string>;
    private layout: string;

    constructor() {
        this.keys = new Map<string, boolean>();
        this.modifiers = new Set<string>();
        this.layout = 'us';
    }

    /**
     * Check if a specific key is currently pressed down.
     * @param key - The key to check (case-insensitive).
     * @returns true if the key is down, false otherwise.
     */
    isKeyDown(key: string): boolean {
        if (typeof key !== 'string' || key.length === 0) {
            return false;
        }
        return this.keys.get(key.toLowerCase()) === true;
    }

    /**
     * Check if a specific key is currently released (not pressed).
     * @param key - The key to check (case-insensitive).
     * @returns true if the key is up, false otherwise.
     */
    isKeyUp(key: string): boolean {
        if (typeof key !== 'string' || key.length === 0) {
            return true;
        }
        return this.keys.get(key.toLowerCase()) !== true;
    }

    /**
     * Check if a modifier key is active.
     * @param modifier - The modifier to check (e.g., 'ctrl', 'shift', 'alt', 'meta').
     * @returns true if the modifier is active, false otherwise.
     */
    isModifierActive(modifier: string): boolean {
        if (typeof modifier !== 'string' || modifier.length === 0) {
            return false;
        }
        return this.modifiers.has(modifier.toLowerCase());
    }

    /**
     * Get a list of all currently pressed keys.
     * @returns An array of key names that are pressed.
     */
    getPressedKeys(): string[] {
        const pressed: string[] = [];
        this.keys.forEach((value, key) => {
            if (value) {
                pressed.push(key);
            }
        });
        return pressed;
    }

    /**
     * Clear all key and modifier states.
     */
    reset(): void {
        this.keys.clear();
        this.modifiers.clear();
    }

    /**
     * Process a DOM KeyboardEvent to update key and modifier states.
     * @param event - The KeyboardEvent to process.
     */
    update(event: KeyboardEvent): void {
        if (!event || typeof event !== 'object') {
            return;
        }

        const key = event.key?.toLowerCase();
        if (!key) {
            return;
        }

        const isDown = event.type === 'keydown';
        this.keys.set(key, isDown);

        this.modifiers.clear();
        if (event.ctrlKey) this.modifiers.add('ctrl');
        if (event.shiftKey) this.modifiers.add('shift');
        if (event.altKey) this.modifiers.add('alt');
        if (event.metaKey) this.modifiers.add('meta');
    }

    /**
     * Get the current keyboard layout.
     * @returns The layout identifier (e.g., 'us').
     */
    getLayout(): string {
        return this.layout;
    }

    /**
     * Set the keyboard layout.
     * @param layout - The layout identifier (e.g., 'us', 'uk', 'de').
     */
    setLayout(layout: string): void {
        if (typeof layout !== 'string' || layout.length === 0) {
            throw new Error('Invalid keyboard layout');
        }
        this.layout = layout;
    }
}
