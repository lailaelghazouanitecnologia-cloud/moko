import { UIElement } from './element';

export class Text extends UIElement {
    private _content: string;
    private _font: string;
    private _size: number;
    private _color: string;
    private _align: 'left' | 'center' | 'right';
    private _lineHeight: number;
    private _wrapWidth: number | null;

    constructor(id: string = '') {
        super(id);
        this._content = '';
        this._font = 'Arial';
        this._size = 16;
        this._color = '#000000';
        this._align = 'left';
        this._lineHeight = 1.2;
        this._wrapWidth = null;
    }

    /**
     * Update display string
     * @param text - The text content to display
     */
    setText(text: string): void {
        if (typeof text !== 'string') {
            throw new TypeError('Text must be a string');
        }
        this._content = text;
    }

    /**
     * Read display string
     * @returns The current text content
     */
    getText(): string {
        return this._content;
    }

    /**
     * Change font family
     * @param font - The font family name
     */
    setFont(font: string): void {
        if (typeof font !== 'string' || font.trim().length === 0) {
            throw new TypeError('Font must be a non-empty string');
        }
        this._font = font;
    }

    /**
     * Set font size
     * @param size - The font size in pixels
     */
    setSize(size: number): void {
        if (typeof size !== 'number' || !isFinite(size) || size <= 0) {
            throw new TypeError('Size must be a positive finite number');
        }
        this._size = size;
    }

    /**
     * Set text color
     * @param color - The color in hex, rgb, or named format
     */
    setColor(color: string): void {
        if (typeof color !== 'string' || color.trim().length === 0) {
            throw new TypeError('Color must be a non-empty string');
        }
        this._color = color;
    }

    /**
     * Set text alignment
     * @param align - The alignment: 'left', 'center', or 'right'
     */
    setAlign(align: 'left' | 'center' | 'right'): void {
        if (!['left', 'center', 'right'].includes(align)) {
            throw new TypeError("Align must be one of: 'left', 'center', 'right'");
        }
        this._align = align;
    }

    /**
     * Enable word wrap
     * @param width - The maximum width in pixels before wrapping
     */
    wrap(width: number): void {
        if (typeof width !== 'number' || !isFinite(width) || width <= 0) {
            throw new TypeError('Wrap width must be a positive finite number');
        }
        this._wrapWidth = width;
    }

    /**
     * Render the text to the canvas
     * @param ctx - The 2D rendering context
     */
    render(ctx: CanvasRenderingContext2D): void {
        if (!ctx || !(ctx instanceof CanvasRenderingContext2D)) {
            throw new TypeError('Invalid CanvasRenderingContext2D');
        }
        if (!this.visible) return;

        ctx.save();
        
        ctx.font = `${this._size}px ${this._font}`;
        ctx.fillStyle = this._color;
        ctx.textAlign = this._align;
        
        const x = this.x;
        const y = this.y + this._size;
        
        if (this._wrapWidth !== null && this._wrapWidth > 0) {
            const words = this._content.split(' ');
            let line = '';
            let currentY = y;
            const lineHeight = this._size * this._lineHeight;
            
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > this._wrapWidth && n > 0) {
                    ctx.fillText(line, x, currentY);
                    line = words[n] + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, x, currentY);
        } else {
            ctx.fillText(this._content, x, y);
        }
        
        ctx.restore();
    }

    /**
     * Update the text element
     * @param dt - Delta time in seconds
     */
    update(dt: number): void {
        if (typeof dt !== 'number' || !isFinite(dt) || dt < 0) {
            throw new TypeError('dt must be a non-negative finite number');
        }
        super.update(dt);
    }

    /**
     * Check if the given point is inside the text bounds
     * @param x - X coordinate
     * @param y - Y coordinate
     * @returns True if the point is inside the text bounds
     */
    contains(x: number, y: number): boolean {
        if (typeof x !== 'number' || !isFinite(x)) {
            throw new TypeError('x must be a finite number');
        }
        if (typeof y !== 'number' || !isFinite(y)) {
            throw new TypeError('y must be a finite number');
        }
        const metrics = this.getTextMetrics();
        const width = metrics.width;
        const height = this._size;
        
        return x >= this.x && x <= this.x + width &&
               y >= this.y && y <= this.y + height;
    }

    /**
     * Get text metrics for measurement
     * @returns TextMetrics object
     */
    private getTextMetrics(): TextMetrics {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }
        ctx.font = `${this._size}px ${this._font}`;
        return ctx.measureText(this._content);
    }

    /**
     * Set line height multiplier
     * @param height - The line height multiplier
     */
    setLineHeight(height: number): void {
        if (typeof height !== 'number' || !isFinite(height) || height <= 0) {
            throw new TypeError('Line height must be a positive finite number');
        }
        this._lineHeight = height;
    }

    /**
     * Get line height multiplier
     * @returns The current line height multiplier
     */
    getLineHeight(): number {
        return this._lineHeight;
    }

    /**
     * Disable word wrap
     */
    unwrap(): void {
        this._wrapWidth = null;
    }

    /**
     * Get the wrap width
     * @returns The current wrap width or null if wrapping is disabled
     */
    getWrapWidth(): number | null {
        return this._wrapWidth;
    }

    /**
     * Get the current font
     * @returns The current font family
     */
    getFont(): string {
        return this._font;
    }

    /**
     * Get the current font size
     * @returns The current font size in pixels
     */
    getSize(): number {
        return this._size;
    }

    /**
     * Get the current color
     * @returns The current text color
     */
    getColor(): string {
        return this._color;
    }

    /**
     * Get the current alignment
     * @returns The current text alignment
     */
    getAlign(): 'left' | 'center' | 'right' {
        return this._align;
    }
}
