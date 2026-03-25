/**
 * Mouse input abstraction class that tracks mouse state including position,
 * button states, wheel movement, and provides methods to query mouse input.
 */
export class Mouse {
    private position: { x: number; y: number };
    private delta: { x: number; y: number };
    private leftButton: boolean;
    private rightButton: boolean;
    private middleButton: boolean;
    private wheelDelta: number;
    private previousLeftButton: boolean;
    private previousRightButton: boolean;
    private previousMiddleButton: boolean;

    constructor() {
        this.position = { x: 0, y: 0 };
        this.delta = { x: 0, y: 0 };
        this.leftButton = false;
        this.rightButton = false;
        this.middleButton = false;
        this.wheelDelta = 0;
        this.previousLeftButton = false;
        this.previousRightButton = false;
        this.previousMiddleButton = false;
    }

    /**
     * Check if a mouse button is currently pressed
     * @param button - The button to check (0: left, 1: middle, 2: right)
     * @returns true if the button is pressed, false otherwise
     * @throws {Error} If button parameter is not a valid number
     */
    isPressed(button: number): boolean {
        if (!this.isValidButtonNumber(button)) {
            throw new Error(`Invalid button number: ${button}. Must be 0, 1, or 2.`);
        }

        switch (button) {
            case 0: return this.leftButton;
            case 1: return this.middleButton;
            case 2: return this.rightButton;
            default: return false;
        }
    }

    /**
     * Check if a mouse button was just pressed this frame
     * @param button - The button to check (0: left, 1: middle, 2: right)
     * @returns true if the button was just pressed, false otherwise
     * @throws {Error} If button parameter is not a valid number
     */
    wasPressed(button: number): boolean {
        if (!this.isValidButtonNumber(button)) {
            throw new Error(`Invalid button number: ${button}. Must be 0, 1, or 2.`);
        }

        switch (button) {
            case 0: return this.leftButton && !this.previousLeftButton;
            case 1: return this.middleButton && !this.previousMiddleButton;
            case 2: return this.rightButton && !this.previousRightButton;
            default: return false;
        }
    }

    /**
     * Check if a mouse button was just released this frame
     * @param button - The button to check (0: left, 1: middle, 2: right)
     * @returns true if the button was just released, false otherwise
     * @throws {Error} If button parameter is not a valid number
     */
    wasReleased(button: number): boolean {
        if (!this.isValidButtonNumber(button)) {
            throw new Error(`Invalid button number: ${button}. Must be 0, 1, or 2.`);
        }

        switch (button) {
            case 0: return !this.leftButton && this.previousLeftButton;
            case 1: return !this.middleButton && this.previousMiddleButton;
            case 2: return !this.rightButton && this.previousRightButton;
            default: return false;
        }
    }

    /**
     * Get the current cursor position
     * @returns Object containing x and y coordinates
     */
    getPosition(): { x: number; y: number } {
        return { x: this.position.x, y: this.position.y };
    }

    /**
     * Get the movement delta since last update
     * @returns Object containing x and y delta values
     */
    getDelta(): { x: number; y: number } {
        return { x: this.delta.x, y: this.delta.y };
    }

    /**
     * Get the scroll wheel delta
     * @returns The wheel delta value
     */
    getWheelDelta(): number {
        return this.wheelDelta;
    }

    /**
     * Update the mouse position and calculate delta
     * @param x - The new x coordinate
     * @param y - The new y coordinate
     * @throws {Error} If x or y are not valid numbers
     */
    updatePosition(x: number, y: number): void {
        if (!this.isValidNumber(x) || !this.isValidNumber(y)) {
            throw new Error(`Invalid position coordinates: x=${x}, y=${y}`);
        }

        this.delta.x = x - this.position.x;
        this.delta.y = y - this.position.y;
        this.position.x = x;
        this.position.y = y;
    }

    /**
     * Update a mouse button state
     * @param button - The button to update (0: left, 1: middle, 2: right)
     * @param pressed - Whether the button is pressed
     * @throws {Error} If button parameter is not a valid number
     */
    updateButton(button: number, pressed: boolean): void {
        if (!this.isValidButtonNumber(button)) {
            throw new Error(`Invalid button number: ${button}. Must be 0, 1, or 2.`);
        }

        this.previousLeftButton = this.leftButton;
        this.previousRightButton = this.rightButton;
        this.previousMiddleButton = this.middleButton;

        switch (button) {
            case 0: this.leftButton = pressed; break;
            case 1: this.middleButton = pressed; break;
            case 2: this.rightButton = pressed; break;
        }
    }

    /**
     * Update the wheel delta
     * @param delta - The wheel delta value
     * @throws {Error} If delta is not a valid number
     */
    updateWheel(delta: number): void {
        if (!this.isValidNumber(delta)) {
            throw new Error(`Invalid wheel delta: ${delta}`);
        }
        this.wheelDelta = delta;
    }

    /**
     * Reset transient state (deltas and previous button states)
     */
    reset(): void {
        this.previousLeftButton = this.leftButton;
        this.previousRightButton = this.rightButton;
        this.previousMiddleButton = this.middleButton;
        this.wheelDelta = 0;
        this.delta.x = 0;
        this.delta.y = 0;
    }

    /**
     * Private helper to validate if a value is a valid number
     */
    private isValidNumber(value: any): boolean {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }

    /**
     * Private helper to validate button numbers
     */
    private isValidButtonNumber(button: any): boolean {
        return this.isValidNumber(button) && button >= 0 && button <= 2 && button === Math.floor(button);
    }
}
