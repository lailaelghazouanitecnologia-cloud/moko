import { Element } from './element';

export interface TextOptions {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    align?: 'left' | 'center' | 'right';
    baseline?: 'top' | 'middle' | 'bottom';
    maxWidth?: number;
    lineHeight?: number;
}

/**
 * A canvas text element supporting alignment, wrapping, and styling.
 */
export class Text extends Element {
    private text: string;
    private fontSize: number;
    private fontFamily: string;
    private color: string;
    private backgroundColor: string;
    private align: 'left' | 'center' | 'right';
    private baseline: 'top' | 'middle' | 'bottom';
    private maxWidth: number;
    private lineHeight: number;

    /**
     * Creates a new Text instance.
     * @param options - Configuration options for the text element.
     */
    constructor(options: TextOptions = {}) {
        super(0, 0, 100, 30);
        this.text = options.text || '';
        this.fontSize = options.fontSize || 16;
        this.fontFamily = options.fontFamily || 'Arial';
        this.color = options.color || '#000000';
        this.backgroundColor = options.backgroundColor || 'transparent';
        this.align = options.align || 'left';
        this.baseline = options.baseline || 'middle';
        this.maxWidth = options.maxWidth || 0;
        this.lineHeight = options.lineHeight || this.fontSize * 1.2;
        this.validateOptions();
    }

    /**
     * Validates the provided options and throws if invalid.
     */
    private validateOptions(): void {
        if (this.fontSize <= 0) {
            throw new Error('fontSize must be a positive number');
        }
        if (!this.fontFamily) {
            throw new Error('fontFamily cannot be empty');
        }
        if (this.maxWidth < 0) {
            throw new Error('maxWidth cannot be negative');
        }
        if (this.lineHeight <= 0) {
            throw new Error('lineHeight must be a positive number');
        }
    }

    /**
     * Renders the text element onto the canvas.
     * @param ctx - The canvas 2D rendering context.
     */
    protected renderSelf(ctx: CanvasRenderingContext2D): void {
        if (!ctx) {
            throw new Error('CanvasRenderingContext2D is required');
        }
        if (!this.text) return;

        ctx.save();

        if (this.backgroundColor !== 'transparent') {
            ctx.fillStyle = this.backgroundColor;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.fillStyle = this.color;
        ctx.textAlign = this.align;
        ctx.textBaseline = this.baseline;

        const x = this.align === 'center' ? this.width / 2 :
                  this.align === 'right' ? this.width : 0;
        const y = this.baseline === 'middle' ? this.height / 2 :
                  this.baseline === 'bottom' ? this.height : 0;

        if (this.maxWidth > 0) {
            this.renderWrappedText(ctx, x, y);
        } else {
            ctx.fillText(this.text, x, y);
        }

        ctx.restore();
    }

    /**
     * Renders text with word wrapping.
     * @param ctx - The canvas 2D rendering context.
     * @param x - The x coordinate.
     * @param y - The y coordinate.
     */
    private renderWrappedText(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        const words = this.text.split(' ');
        const lines: string[] = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > this.maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);

        const startY = this.baseline === 'middle' ? y - (lines.length - 1) * this.lineHeight / 2 :
                       this.baseline === 'bottom' ? y - (lines.length - 1) * this.lineHeight :
                       y;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x, startY + i * this.lineHeight);
        }
    }

    /**
     * Sets the text content.
     * @param text - The new text string.
     */
    public setText(text: string): void {
        if (typeof text !== 'string') {
            throw new Error('text must be a string');
        }
        this.text = text;
    }

    /**
     * Gets the current text content.
     * @returns The text string.
     */
    public getText(): string {
        return this.text;
    }

    /**
     * Sets the font size.
     * @param size - The font size in pixels.
     */
    public setFontSize(size: number): void {
        if (typeof size !== 'number' || size <= 0) {
            throw new Error('fontSize must be a positive number');
        }
        this.fontSize = size;
        this.lineHeight = size * 1.2;
    }

    /**
     * Gets the current font size.
     * @returns The font size in pixels.
     */
    public getFontSize(): number {
        return this.fontSize;
    }

    /**
     * Sets the font family.
     * @param family - The font family name.
     */
    public setFontFamily(family: string): void {
        if (typeof family !== 'string' || !family.trim()) {
            throw new Error('fontFamily must be a non-empty string');
        }
        this.fontFamily = family;
    }

    /**
     * Gets the current font family.
     * @returns The font family name.
     */
    public getFontFamily(): string {
        return this.fontFamily;
    }

    /**
     * Sets the text color.
     * @param color - The color string (e.g., '#000000').
     */
    public setColor(color: string): void {
        if (typeof color !== 'string' || !color.trim()) {
            throw new Error('color must be a non-empty string');
        }
        this.color = color;
    }

    /**
     * Gets the current text color.
     * @returns The color string.
     */
    public getColor(): string {
        return this.color;
    }

    /**
     * Sets the background color.
     * @param color - The background color string or 'transparent'.
     */
    public setBackgroundColor(color: string): void {
        if (typeof color !== 'string' || !color.trim()) {
            throw new Error('backgroundColor must be a non-empty string');
        }
        this.backgroundColor = color;
    }

    /**
     * Gets the current background color.
     * @returns The background color string.
     */
    public getBackgroundColor(): string {
        return this.backgroundColor;
    }

    /**
     * Sets the text alignment.
     * @param align - The alignment type.
     */
    public setAlign(align: 'left' | 'center' | 'right'): void {
        if (!['left', 'center', 'right'].includes(align)) {
            throw new Error('align must be one of: left, center, right');
        }
        this.align = align;
    }

    /**
     * Gets the current text alignment.
     * @returns The alignment type.
     */
    public getAlign(): 'left' | 'center' | 'right' {
        return this.align;
    }

    /**
     * Sets the text baseline.
     * @param baseline - The baseline type.
     */
    public setBaseline(baseline: 'top' | 'middle' | 'bottom'): void {
        if (!['top', 'middle', 'bottom'].includes(baseline)) {
            throw new Error('baseline must be one of: top, middle, bottom');
        }
        this.baseline = baseline;
    }

    /**
     * Gets the current text baseline.
     * @returns The baseline type.
     */
    public getBaseline(): 'top' | 'middle' | 'bottom' {
        return this.baseline;
    }

    /**
     * Sets the maximum width for text wrapping.
     * @param width - The maximum width in pixels; 0 to disable wrapping.
     */
    public setMaxWidth(width: number): void {
        if (typeof width !== 'number' || width < 0) {
            throw new Error('maxWidth must be a non-negative number');
        }
        this.maxWidth = width;
    }

    /**
     * Gets the current maximum width for text wrapping.
     * @returns The maximum width in pixels.
     */
    public getMaxWidth(): number {
        return this.maxWidth;
    }

    /**
     * Sets the line height for wrapped text.
     * @param height - The line height in pixels.
     */
    public setLineHeight(height: number): void {
        if (typeof height !== 'number' || height <= 0) {
            throw new Error('lineHeight must be a positive number');
        }
        this.lineHeight = height;
    }

    /**
     * Gets the current line height.
     * @returns The line height in pixels.
     */
    public getLineHeight(): number {
        return this.lineHeight;
    }

    /**
     * Measures the dimensions of the text as it would be rendered.
     * @param ctx - The canvas 2D rendering context.
     * @returns An object with width and height in pixels.
     */
    public measureText(ctx: CanvasRenderingContext2D): {width: number, height: number} {
        if (!ctx) {
            throw new Error('CanvasRenderingContext2D is required');
        }
        ctx.save();
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;

        let width = 0;
        let height = this.fontSize;

        if (this.maxWidth > 0) {
            const lines = this.getWrappedLines(ctx);
            for (const line of lines) {
                const metrics = ctx.measureText(line);
                width = Math.max(width, metrics.width);
            }
            height = lines.length * this.lineHeight;
        } else {
            const metrics = ctx.measureText(this.text);
            width = metrics.width;
        }

        ctx.restore();
        return {width, height};
    }

    /**
     * Computes wrapped lines based on maxWidth.
     * @param ctx - The canvas 2D rendering context.
     * @returns An array of lines.
     */
    private getWrappedLines(ctx: CanvasRenderingContext2D): string[] {
        if (!this.text) return [];
        const words = this.text.split(' ');
        const lines: string[] = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > this.maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);

        return lines;
    }
}
