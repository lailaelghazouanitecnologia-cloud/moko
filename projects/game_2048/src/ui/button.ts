export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export abstract class Element {
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    public id: string;

    constructor(id: string = '') {
        this.id = id;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
    }

    abstract getBounds(): Rect;
}

export class Button extends Element {
    private _label: string;
    private _disabled: boolean;
    private _onClick: (() => void) | null;
    private _clickListeners: Set<() => void>;

    constructor(id: string = '') {
        super(id);
        this._label = '';
        this._disabled = false;
        this._onClick = null;
        this._clickListeners = new Set<() => void>();
    }

    get label(): string {
        return this._label;
    }

    get disabled(): boolean {
        return this._disabled;
    }

    get onClick(): (() => void) | null {
        return this._onClick;
    }

    /**
     * Updates the text displayed on the button.
     * @param text - The new label text.
     */
    setLabel(text: string): void {
        if (typeof text !== 'string') {
            throw new TypeError('Label must be a string');
        }
        this._label = text;
    }

    /**
     * Toggles the interaction state of the button.
     * @param state - True to disable the button, false to enable it.
     */
    setDisabled(state: boolean): void {
        if (typeof state !== 'boolean') {
            throw new TypeError('Disabled state must be a boolean');
        }
        this._disabled = state;
    }

    /**
     * Registers a click handler callback.
     * @param callback - Function to invoke on click.
     */
    addClickListener(callback: () => void): void {
        if (typeof callback !== 'function') {
            throw new TypeError('Callback must be a function');
        }
        this._clickListeners.add(callback);
        if (this._onClick === null) {
            this._onClick = callback;
        }
    }

    /**
     * Unregisters a previously registered click handler.
     * @param callback - The exact function reference to remove.
     */
    removeClickListener(callback: () => void): void {
        if (typeof callback !== 'function') {
            throw new TypeError('Callback must be a function');
        }
        this._clickListeners.delete(callback);
        if (this._onClick === callback) {
            this._onClick = this._clickListeners.size > 0 ? Array.from(this._clickListeners)[0] : null;
        }
    }

    /**
     * Simulates a user click, invoking all registered click handlers.
     */
    triggerClick(): void {
        if (this._disabled) return;
        
        if (this._onClick) {
            try {
                this._onClick();
            } catch (error) {
                console.error('Error executing primary click handler:', error);
            }
        }
        
        this._clickListeners.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error executing click listener:', error);
            }
        });
    }

    /**
     * Returns the screen bounds of the button.
     * @returns Rectangle describing position and dimensions.
     */
    getBounds(): Rect {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Removes all registered click listeners and resets the primary handler.
     */
    clearClickListeners(): void {
        this._clickListeners.clear();
        this._onClick = null;
    }

    /**
     * Checks if a given point is inside the button bounds.
     * @param px - X coordinate of the point.
     * @param py - Y coordinate of the point.
     * @returns True if the point is inside the button.
     */
    containsPoint(px: number, py: number): boolean {
        return px >= this.x && px <= this.x + this.width &&
               py >= this.y && py <= this.y + this.height;
    }

    /**
     * Enables the button if it is currently disabled.
     */
    enable(): void {
        this.setDisabled(false);
    }

    /**
     * Disables the button if it is currently enabled.
     */
    disable(): void {
        this.setDisabled(true);
    }
}
