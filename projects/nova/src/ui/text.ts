import { Element } from './element';
import { Font } from '../graphics';
import { Color, Vec2 } from '../math';

export class Text extends Element {
    private _text: string = '';
    private _font: Font | null = null;
    private _fontSize: number = 32;
    private _color: Color = new Color(1, 1, 1, 1);
    private _alignment: Vec2 = new Vec2(0.5, 0.5);
    private _wrap: boolean = false;
    private _maxLines: number = 0;
    private _lineHeight: number = 1.2;
    private _spacing: number = 0;

    constructor() {
        super();
    }

    setText(text: string): void {
        this._text = text;
        this.updateLayout();
    }

    setFont(font: Font): void {
        this._font = font;
        this.updateLayout();
    }

    setFontSize(size: number): void {
        this._fontSize = size;
        this.updateLayout();
    }

    setAlignment(x: number, y: number): void {
        this._alignment.set(x, y);
        this.updateLayout();
    }

    setWrap(wrap: boolean): void {
        this._wrap = wrap;
        this.updateLayout();
    }

    setMaxLines(lines: number): void {
        this._maxLines = lines;
        this.updateLayout();
    }

    setLineHeight(height: number): void {
        this._lineHeight = height;
        this.updateLayout();
    }

    setSpacing(spacing: number): void {
        this._spacing = spacing;
        this.updateLayout();
    }

    getTextWidth(): number {
        if (!this._font || this._text.length === 0) {
            return 0;
        }

        let width = 0;
        let currentLineWidth = 0;

        for (let i = 0; i < this._text.length; i++) {
            const char = this._text[i];
            
            if (char === '\n') {
                width = Math.max(width, currentLineWidth);
                currentLineWidth = 0;
                continue;
            }

            const charWidth = this._font.getCharWidth(char, this._fontSize) + this._spacing;
            currentLineWidth += charWidth;
        }

        return Math.max(width, currentLineWidth);
    }

    getTextHeight(): number {
        if (!this._font || this._text.length === 0) {
            return 0;
        }

        const lineCount = this._text.split('\n').length;
        const baseHeight = this._font.getLineHeight(this._fontSize);
        
        if (lineCount <= 1) {
            return baseHeight;
        }

        return baseHeight + (baseHeight * this._lineHeight * (lineCount - 1));
    }

    updateLayout(): void {
        if (!this._font) {
            return;
        }

        const lines = this._wrap ? this.wrapText() : this._text.split('\n');
        
        if (this._maxLines > 0 && lines.length > this._maxLines) {
            lines.length = this._maxLines;
        }

        this.requestRender();
    }

    private wrapText(): string[] {
        if (!this._font) {
            return [this._text];
        }

        const words = this._text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        const maxWidth = this.elementWidth || Infinity;

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = this._font.measureText(testLine, this._fontSize);

            if (testWidth > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    get text(): string {
        return this._text;
    }

    set text(value: string) {
        this.setText(value);
    }

    get font(): Font | null {
        return this._font;
    }

    set font(value: Font | null) {
        if (value) {
            this.setFont(value);
        }
    }

    get fontSize(): number {
        return this._fontSize;
    }

    set fontSize(value: number) {
        this.setFontSize(value);
    }

    get color(): Color {
        return this._color;
    }

    set color(value: Color) {
        this._color.copy(value);
        this.requestRender();
    }

    get alignment(): Vec2 {
        return this._alignment;
    }

    set alignment(value: Vec2) {
        this._alignment.copy(value);
        this.updateLayout();
    }

    get wrap(): boolean {
        return this._wrap;
    }

    set wrap(value: boolean) {
        this.setWrap(value);
    }

    get maxLines(): number {
        return this._maxLines;
    }

    set maxLines(value: number) {
        this.setMaxLines(value);
    }

    get lineHeight(): number {
        return this._lineHeight;
    }

    set lineHeight(value: number) {
        this.setLineHeight(value);
    }

    get spacing(): number {
        return this._spacing;
    }

    set spacing(value: number) {
        this.setSpacing(value);
    }
}
