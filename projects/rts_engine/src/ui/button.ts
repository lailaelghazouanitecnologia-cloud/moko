import { Element } from './element';

export interface ButtonOptions {
    text?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
    borderRadius?: number;
}

/**
 * A clickable button UI element with customizable appearance and event handling.
 * Supports mouse and touch interactions with visual feedback for hover and press states.
 */
export class Button extends Element {
    private text: string;
    private backgroundColor: string;
    private textColor: string;
    private fontSize: number;
    private fontFamily: string;
    private borderRadius: number;
    private isPressed: boolean = false;
    private isHovered: boolean = false;
    private onClickHandlers: (() => void)[] = [];
    private onPressHandlers: (() => void)[] = [];
    private onReleaseHandlers: (() => void)[] = [];
    private onHoverHandlers: (() => void)[] = [];
    private onLeaveHandlers: (() => void)[] = [];

    /**
     * Creates a new Button instance.
     * @param options - Configuration options for the button
     * @throws {Error} If invalid color values are provided
     */
    constructor(options: ButtonOptions = {}) {
        super(
            options.x ?? 0,
            options.y ?? 0,
            options.width ?? 120,
            options.height ?? 40
        );
        
        this.text = options.text ?? 'Button';
        this.backgroundColor = this.validateColor(options.backgroundColor ?? '#4CAF50');
        this.textColor = this.validateColor(options.textColor ?? '#FFFFFF');
        this.fontSize = this.validateFontSize(options.fontSize ?? 16);
        this.fontFamily = this.validateFontFamily(options.fontFamily ?? 'Arial');
        this.borderRadius = this.validateBorderRadius(options.borderRadius ?? 4);
    }

    /**
     * Renders the button on the canvas.
     * @param ctx - The canvas rendering context
     * @throws {Error} If rendering context is invalid
     */
    protected renderSelf(ctx: CanvasRenderingContext2D): void {
        if (!ctx) {
            throw new Error('Invalid canvas rendering context');
        }

        const x = 0;
        const y = 0;
        const width = this.getBounds().width;
        const height = this.getBounds().height;

        if (width <= 0 || height <= 0) {
            return;
        }

        ctx.save();

        ctx.fillStyle = this.isPressed ? this.darkenColor(this.backgroundColor, 0.8) :
                       this.isHovered ? this.lightenColor(this.backgroundColor, 1.2) :
                       this.backgroundColor;

        if (this.borderRadius > 0) {
            this.roundRect(ctx, x, y, width, height, this.borderRadius);
            ctx.fill();
        } else {
            ctx.fillRect(x, y, width, height);
        }

        ctx.fillStyle = this.textColor;
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textToDisplay = this.text || '';
        if (textToDisplay) {
            ctx.fillText(textToDisplay, width / 2, height / 2);
        }

        if (this.isPressed) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 2;
            if (this.borderRadius > 0) {
                this.roundRect(ctx, x, y, width, height, this.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(x, y, width, height);
            }
        }

        ctx.restore();
    }

    /**
     * Draws a rounded rectangle path.
     */
    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
        const r = Math.min(radius, width / 2, height / 2);
        
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    /**
     * Lightens a hex color by the specified factor.
     */
    private lightenColor(color: string, factor: number): string {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * (factor * 100));
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return `#${((R << 16) | (G << 8) | B).toString(16).padStart(6, '0')}`;
    }

    /**
     * Darkens a hex color by the specified factor.
     */
    private darkenColor(color: string, factor: number): string {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * ((1 - factor) * 100));
        const R = Math.max(0, Math.min(255, (num >> 16) - amt));
        const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) - amt));
        const B = Math.max(0, Math.min(255, (num & 0x0000FF) - amt));
        return `#${((R << 16) | (G << 8) | B).toString(16).padStart(6, '0')}`;
    }

    /**
     * Validates and returns a hex color string.
     * @throws {Error} If color format is invalid
     */
    private validateColor(color: string): string {
        if (typeof color !== 'string') {
            throw new Error('Color must be a string');
        }
        
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexRegex.test(color)) {
            throw new Error(`Invalid hex color format: ${color}`);
        }
        
        return color;
    }

    /**
     * Validates and returns a font size value.
     * @throws {Error} If font size is invalid
     */
    private validateFontSize(size: number): number {
        if (typeof size !== 'number' || isNaN(size) || size <= 0) {
            throw new Error('Font size must be a positive number');
        }
        return size;
    }

    /**
     * Validates and returns a font family string.
     * @throws {Error} If font family is invalid
     */
    private validateFontFamily(family: string): string {
        if (typeof family !== 'string' || family.trim().length === 0) {
            throw new Error('Font family must be a non-empty string');
        }
        return family.trim();
    }

    /**
     * Validates and returns a border radius value.
     * @throws {Error} If border radius is invalid
     */
    private validateBorderRadius(radius: number): number {
        if (typeof radius !== 'number' || isNaN(radius) || radius < 0) {
            throw new Error('Border radius must be a non-negative number');
        }
        return radius;
    }

    /**
     * Sets the button text.
     * @param text - The text to display on the button
     * @throws {Error} If text is not a string
     */
    public setText(text: string): void {
        if (typeof text !== 'string') {
            throw new Error('Text must be a string');
        }
        this.text = text;
    }

    /**
     * Gets the current button text.
     */
    public getText(): string {
        return this.text;
    }

    /**
     * Sets the background color.
     * @param color - Hex color string (e.g., '#FF0000')
     * @throws {Error} If color format is invalid
     */
    public setBackgroundColor(color: string): void {
        this.backgroundColor = this.validateColor(color);
    }

    /**
     * Gets the current background color.
     */
    public getBackgroundColor(): string {
        return this.backgroundColor;
    }

    /**
     * Sets the text color.
     * @param color - Hex color string (e.g., '#FFFFFF')
     * @throws {Error} If color format is invalid
     */
    public setTextColor(color: string): void {
        this.textColor = this.validateColor(color);
    }

    /**
     * Gets the current text color.
     */
    public getTextColor(): string {
        return this.textColor;
    }

    /**
     * Sets the font size.
     * @param size - Font size in pixels
     * @throws {Error} If size is not a positive number
     */
    public setFontSize(size: number): void {
        this.fontSize = this.validateFontSize(size);
    }

    /**
     * Gets the current font size.
     */
    public getFontSize(): number {
        return this.fontSize;
    }

    /**
     * Sets the font family.
     * @param family - Font family name (e.g., 'Arial')
     * @throws {Error} If family is not a non-empty string
     */
    public setFontFamily(family: string): void {
        this.fontFamily = this.validateFontFamily(family);
    }

    /**
     * Gets the current font family.
     */
    public getFontFamily(): string {
        return this.fontFamily;
    }

    /**
     * Sets the border radius.
     * @param radius - Border radius in pixels
     * @throws {Error} If radius is negative
     */
    public setBorderRadius(radius: number): void {
        this.borderRadius = this.validateBorderRadius(radius);
    }

    /**
     * Gets the current border radius.
     */
    public getBorderRadius(): number {
        return this.borderRadius;
    }

    /**
     * Adds a click event handler.
     * @param callback - Function to call when button is clicked
     * @throws {Error} If callback is not a function
     */
    public onClick(callback: () => void): void {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        this.onClickHandlers.push(callback);
    }

    /**
     * Adds a press event handler (triggered on mouse/touch down).
     * @param callback - Function to call when button is pressed
     * @throws {Error} If callback is not a function
     */
    public onPress(callback: () => void): void {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        this.onPressHandlers.push(callback);
    }

    /**
     * Adds a release event handler (triggered on mouse/touch up).
     * @param callback - Function to call when button is released
     * @throws {Error} If callback is not a function
     */
    public onRelease(callback: () => void): void {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        this.onReleaseHandlers.push(callback);
    }

    /**
     * Adds a hover event handler (triggered when mouse enters button).
     * @param callback - Function to call when button is hovered
     * @throws {Error} If callback is not a function
     */
    public onHover(callback: () => void): void {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        this.onHoverHandlers.push(callback);
    }

    /**
     * Adds a leave event handler (triggered when mouse leaves button).
     * @param callback - Function to call when mouse leaves button
     * @throws {Error} If callback is not a function
     */
    public onLeave(callback: () => void): void {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        this.onLeaveHandlers.push(callback);
    }

    /**
     * Handles mouse down events.
     * @param x - X coordinate relative to parent
     * @param y - Y coordinate relative to parent
     * @returns True if event was handled by this button
     */
    public handleMouseDown(x: number, y: number): boolean {
        if (!this.isVisible() || !this.hitTest(x, y)) {
            return false;
        }

        this.isPressed = true;
        this.onPressHandlers.forEach(handler => {
            try {
                handler();
            } catch (error) {
                console.error('Error in press handler:', error);
            }
        });
        return true;
    }

    /**
     * Handles mouse up events.
     * @param x - X coordinate relative to parent
     * @param y - Y coordinate relative to parent
     * @returns True if event was handled by this button
     */
    public handleMouseUp(x: number, y: number): boolean {
        if (!this.isVisible()) {
            return false;
        }

        const wasPressed = this.isPressed;
        this.isPressed = false;

        if (wasPressed && this.hitTest(x, y)) {
            this.onClickHandlers.forEach(handler => {
                try {
                    handler();
                } catch (error) {
                    console.error('Error in click handler:', error);
                }
            });
            this.onReleaseHandlers.forEach(handler => {
                try {
                    handler();
                } catch (error) {
                    console.error('Error in release handler:', error);
                }
            });
            return true;
        }

        if (wasPressed) {
            this.onReleaseHandlers.forEach(handler => {
                try {
                    handler();
                } catch (error) {
                    console.error('Error in release handler:', error);
                }
            });
        }

        return false;
    }

    /**
     * Handles mouse move events.
     * @param x - X coordinate relative to parent
     * @param y - Y coordinate relative to parent
     * @returns True if mouse is currently over this button
     */
    public handleMouseMove(x: number, y: number): boolean {
        if (!this.isVisible()) {
            return false;
        }

        const wasHovered = this.isHovered;
        this.isHovered = this.hitTest(x, y);

        if (this.isHovered && !wasHovered) {
            this.onHoverHandlers.forEach(handler => {
                try {
                    handler();
                } catch (error) {
                    console.error('Error in hover handler:', error);
                }
            });
        } else if (!this.isHovered && wasHovered) {
            this.onLeaveHandlers.forEach(handler => {
                try {
                    handler();
                } catch (error) {
                    console.error('Error in leave handler:', error);
                }
            });
        }

        return this.isHovered;
    }

    /**
     * Handles touch start events.
     * @param x - X coordinate relative to parent
     * @param y - Y coordinate relative to parent
     * @returns True if event was handled by this button
     */
    public handleTouchStart(x: number, y: number): boolean {
        return this.handleMouseDown(x, y);
    }

    /**
     * Handles touch end events.
     * @param x - X coordinate relative to parent
     * @param y - Y coordinate relative to parent
     * @returns True if event was handled by this button
     */
    public handleTouchEnd(x: number, y: number): boolean {
        return this.handleMouseUp(x, y);
    }

    /**
     * Checks if the button is currently pressed.
     */
    public isCurrentlyPressed(): boolean {
        return this.isPressed;
    }

    /**
     * Checks if the button is currently hovered.
     */
    public isCurrentlyHovered(): boolean {
        return this.isHovered;
    }

    /**
     * Removes a specific click handler.
     * @param callback - The handler function to remove
     */
    public removeClickHandler(callback: () => void): void {
        const index = this.onClickHandlers.indexOf(callback);
        if (index > -1) {
            this.onClickHandlers.splice(index, 1);
        }
    }

    /**
     * Removes a specific press handler.
     * @param callback - The handler function to remove
     */
    public removePressHandler(callback: () => void): void {
        const index = this.onPressHandlers.indexOf(callback);
        if (index > -1) {
            this.onPressHandlers.splice(index, 1);
        }
    }

    /**
     * Removes a specific release handler.
     * @param callback - The handler function to remove
     */
    public removeReleaseHandler(callback: () => void): void {
        const index = this.onReleaseHandlers.indexOf(callback);
        if (index > -1) {
            this.onReleaseHandlers.splice(index, 1);
        }
    }

    /**
     * Removes a specific hover handler.
     * @param callback - The handler function to remove
     */
    public removeHoverHandler(callback: () => void): void {
        const index = this.onHoverHandlers.indexOf(callback);
        if (index > -1) {
            this.onHoverHandlers.splice(index, 1);
        }
    }

    /**
     * Removes a specific leave handler.
     * @param callback - The handler function to remove
     */
    public removeLeaveHandler(callback: () => void): void {
        const index = this.onLeaveHandlers.indexOf(callback);
        if (index > -1) {
            this.onLeaveHandlers.splice(index, 1);
        }
    }

    /**
     * Removes all event handlers.
     */
    public clearAllHandlers(): void {
        this.onClickHandlers = [];
        this.onPressHandlers = [];
        this.onReleaseHandlers = [];
        this.onHoverHandlers = [];
        this.onLeaveHandlers = [];
    }
}
