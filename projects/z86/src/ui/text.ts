import { Element } from './element';
import { Screen } from './screen';
import { EventEmitter } from '../core';
import { Vec2, Vec3, Vec4, Mat4, Color } from '../math';
import { GraphicsDevice, VertexBuffer, IndexBuffer, Shader, Texture, Material } from '../graphics';

export class Text extends Element {
    private _text: string = '';
    private _fontSize: number = 16;
    private _color: Color = new Color(1, 1, 1, 1);
    private _fontFamily: string = 'Arial';
    private _textAlign: 'left' | 'center' | 'right' = 'left';
    private _verticalAlign: 'top' | 'middle' | 'bottom' = 'top';
    private _lineHeight: number = 1.2;
    private _wordWrap: boolean = false;
    private _maxLines: number = 0;
    private _material: Material | null = null;
    private _vertexBuffer: VertexBuffer | null = null;
    private _indexBuffer: IndexBuffer | null = null;
    private _texture: Texture | null = null;
    private _dirty: boolean = true;
    private _textMetrics: { width: number; height: number } = { width: 0, height: 0 };

    constructor(screen: Screen) {
        super(screen);
    }

    get text(): string {
        return this._text;
    }

    set text(value: string) {
        if (this._text !== value) {
            this._text = value;
            this._dirty = true;
        }
    }

    get fontSize(): number {
        return this._fontSize;
    }

    set fontSize(value: number) {
        if (this._fontSize !== value) {
            this._fontSize = value;
            this._dirty = true;
        }
    }

    get color(): Color {
        return this._color;
    }

    set color(value: Color) {
        if (!this._color.equals(value)) {
            this._color.copy(value);
            this._dirty = true;
        }
    }

    get fontFamily(): string {
        return this._fontFamily;
    }

    set fontFamily(value: string) {
        if (this._fontFamily !== value) {
            this._fontFamily = value;
            this._dirty = true;
        }
    }

    get textAlign(): 'left' | 'center' | 'right' {
        return this._textAlign;
    }

    set textAlign(value: 'left' | 'center' | 'right') {
        if (this._textAlign !== value) {
            this._textAlign = value;
            this._dirty = true;
        }
    }

    get verticalAlign(): 'top' | 'middle' | 'bottom' {
        return this._verticalAlign;
    }

    set verticalAlign(value: 'top' | 'middle' | 'bottom') {
        if (this._verticalAlign !== value) {
            this._verticalAlign = value;
            this._dirty = true;
        }
    }

    get lineHeight(): number {
        return this._lineHeight;
    }

    set lineHeight(value: number) {
        if (this._lineHeight !== value) {
            this._lineHeight = value;
            this._dirty = true;
        }
    }

    get wordWrap(): boolean {
        return this._wordWrap;
    }

    set wordWrap(value: boolean) {
        if (this._wordWrap !== value) {
            this._wordWrap = value;
            this._dirty = true;
        }
    }

    get maxLines(): number {
        return this._maxLines;
    }

    set maxLines(value: number) {
        if (this._maxLines !== value) {
            this._maxLines = value;
            this._dirty = true;
        }
    }

    get style(): any {
        return {
            fontSize: this._fontSize,
            color: this._color.clone(),
            fontFamily: this._fontFamily,
            textAlign: this._textAlign,
            verticalAlign: this._verticalAlign,
            lineHeight: this._lineHeight,
            wordWrap: this._wordWrap,
            maxLines: this._maxLines
        };
    }

    set style(value: any) {
        let changed = false;
        if (value.fontSize !== undefined && this._fontSize !== value.fontSize) {
            this._fontSize = value.fontSize;
            changed = true;
        }
        if (value.color !== undefined && !this._color.equals(value.color)) {
            this._color.copy(value.color);
            changed = true;
        }
        if (value.fontFamily !== undefined && this._fontFamily !== value.fontFamily) {
            this._fontFamily = value.fontFamily;
            changed = true;
        }
        if (value.textAlign !== undefined && this._textAlign !== value.textAlign) {
            this._textAlign = value.textAlign;
            changed = true;
        }
        if (value.verticalAlign !== undefined && this._verticalAlign !== value.verticalAlign) {
            this._verticalAlign = value.verticalAlign;
            changed = true;
        }
        if (value.lineHeight !== undefined && this._lineHeight !== value.lineHeight) {
            this._lineHeight = value.lineHeight;
            changed = true;
        }
        if (value.wordWrap !== undefined && this._wordWrap !== value.wordWrap) {
            this._wordWrap = value.wordWrap;
            changed = true;
        }
        if (value.maxLines !== undefined && this._maxLines !== value.maxLines) {
            this._maxLines = value.maxLines;
            changed = true;
        }
        if (changed) {
            this._dirty = true;
        }
    }

    render(device: GraphicsDevice, screen: Screen): void {
        if (!this._text || this._text.length === 0) return;

        if (this._dirty) {
            this._updateTextGeometry(device);
            this._dirty = false;
        }

        if (!this._material || !this._vertexBuffer || !this._indexBuffer) return;

        const screenWidth = screen.resolution.x;
        const screenHeight = screen.resolution.y;

        const elementWidth = this.entity.element.width;
        const elementHeight = this.entity.element.height;

        let x = this.entity.getPosition().x;
        let y = this.entity.getPosition().y;

        switch (this._textAlign) {
            case 'center':
                x -= elementWidth * 0.5;
                break;
            case 'right':
                x -= elementWidth;
                break;
        }

        switch (this._verticalAlign) {
            case 'middle':
                y -= elementHeight * 0.5;
                break;
            case 'bottom':
                y -= elementHeight;
                break;
        }

        const projMat = new Mat4();
        projMat.setOrtho(0, screenWidth, screenHeight, 0, -1, 1);

        const viewMat = new Mat4();
        viewMat.setIdentity();

        const modelMat = new Mat4();
        modelMat.setTranslate(new Vec3(x, y, 0));

        const mvp = new Mat4();
        mvp.mul2(projMat, viewMat);
        mvp.mul(modelMat);

        this._material.setShaderParameter('uMvpMatrix', mvp.data);
        this._material.setShaderParameter('uColor', [this._color.r, this._color.g, this._color.b, this._color.a]);

        this._material.enable();
        device.setVertexBuffer(this._vertexBuffer);
        device.setIndexBuffer(this._indexBuffer);
        device.draw();
        this._material.disable();
    }

    measure(): { width: number; height: number } {
        if (this._dirty) {
            this._calculateTextMetrics();
            this._dirty = false;
        }
        return { width: this._textMetrics.width, height: this._textMetrics.height };
    }

    private _updateTextGeometry(device: GraphicsDevice): void {
        if (!this._text || this._text.length === 0) return;

        const lines = this._processText();
        const vertices: number[] = [];
        const indices: number[] = [];
        let vertexIndex = 0;

        const lineHeight = this._fontSize * this._lineHeight;
        let y = 0;

        for (const line of lines) {
            let x = 0;
            const chars = Array.from(line);

            for (const char of chars) {
                const charWidth = this._getCharWidth(char);
                const charHeight = this._fontSize;

                vertices.push(
                    x, y, 0, 0, 0,
                    x + charWidth, y, 0, 1, 0,
                    x + charWidth, y + charHeight, 0, 1, 1,
                    x, y + charHeight, 0, 0, 1
                );

                indices.push(
                    vertexIndex, vertexIndex + 1, vertexIndex + 2,
                    vertexIndex, vertexIndex + 2, vertexIndex + 3
                );

                vertexIndex += 4;
                x += charWidth;
            }

            y += lineHeight;
        }

        if (!this._vertexBuffer) {
            this._vertexBuffer = new VertexBuffer(device, new VertexFormat([
                { semantic: 'POSITION', type: 'float32', numComponents: 3 },
                { semantic: 'TEXCOORD0', type: 'float32', numComponents: 2 }
            ]), vertices.length / 5, true);
        }

        if (!this._indexBuffer) {
            this._indexBuffer = new IndexBuffer(device, 'uint16', indices.length, true);
        }

        this._vertexBuffer.setData(new Float32Array(vertices));
        this._indexBuffer.setData(new Uint16Array(indices));
    }

    private _processText(): string[] {
        const lines = this._text.split('\n');
        const processedLines: string[] = [];

        for (const line of lines) {
            if (this._wordWrap && this.entity.element.width > 0) {
                const wrappedLines = this._wrapLine(line);
                processedLines.push(...wrappedLines);
            } else {
                processedLines.push(line);
            }
        }

        if (this._maxLines > 0 && processedLines.length > this._maxLines) {
            return processedLines.slice(0, this._maxLines);
        }

        return processedLines;
    }

    private _wrapLine(line: string): string[] {
        const words = line.split(' ');
        const wrappedLines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = this._measureText(testLine);

            if (testWidth <= this.entity.element.width) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    wrappedLines.push(currentLine);
                    currentLine = word;
                } else {
                    wrappedLines.push(word);
                }
            }
        }

        if (currentLine) {
            wrappedLines.push(currentLine);
        }

        return wrappedLines;
    }

    private _measureText(text: string): number {
        let width = 0;
        const chars = Array.from(text);

        for (const char of chars) {
            width += this._getCharWidth(char);
        }

        return width;
    }

    private _getCharWidth(char: string): number {
        return this._fontSize * 0.6;
    }

    private _calculateTextMetrics(): void {
        const lines = this._processText();
        const lineHeight = this._fontSize * this._lineHeight;

        let maxWidth = 0;
        for (const line of lines) {
            const width = this._measureText(line);
            maxWidth = Math.max(maxWidth, width);
        }

        this._textMetrics.width = maxWidth;
        this._textMetrics.height = lines.length * lineHeight;
    }
}
