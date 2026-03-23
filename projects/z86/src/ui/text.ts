import { EventEmitter } from '../core/event-emitter';
import { Vec2 } from '../math/vec2';
import { Vec3 } from '../math/vec3';
import { Vec4 } from '../math/vec4';
import { Mat4 } from '../math/mat4';
import { Quat } from '../math/quat';
import { Color } from '../math/color';
import { GraphicsDevice } from '../graphics/graphics-device';
import { Shader } from '../graphics/shader';
import { Material } from '../graphics/material';
import { Mesh } from '../graphics/mesh';
import { MeshInstance } from '../graphics/mesh-instance';
import { VertexFormat } from '../graphics/vertex-format';
import { VertexBuffer } from '../graphics/vertex-buffer';
import { IndexBuffer } from '../graphics/index-buffer';
import { Texture } from '../graphics/texture';
import { RenderTarget } from '../graphics/render-target';
import { Element } from './element';

export class Text extends Element {
    private _text: string;
    private _fontSize: number;
    private _color: Color;
    private _font: string;
    private _alignment: 'left' | 'center' | 'right';
    private _baseline: 'top' | 'middle' | 'bottom';
    private _width: number;
    private _height: number;
    private _meshInstance: MeshInstance | null;
    private _material: Material;
    private _vertexBuffer: VertexBuffer | null;
    private _indexBuffer: IndexBuffer | null;
    private _dirty: boolean;

    constructor(text: string = '', fontSize: number = 16, color: Color = new Color(1, 1, 1, 1)) {
        super();
        this._text = text;
        this._fontSize = fontSize;
        this._color = color;
        this._font = 'Arial';
        this._alignment = 'left';
        this._baseline = 'middle';
        this._width = 0;
        this._height = 0;
        this._meshInstance = null;
        this._material = new Material();
        this._vertexBuffer = null;
        this._indexBuffer = null;
        this._dirty = true;
    }

    render(device: GraphicsDevice, screen: any): void {
        if (this._dirty) {
            this._updateMesh(device);
            this._dirty = false;
        }

        if (!this._meshInstance) return;

        const shader = this._getTextShader(device);
        this._material.setShader(shader);
        this._material.setColor(this._color);

        device.setBlendState(true, GraphicsDevice.BLENDMODE_SRC_ALPHA, GraphicsDevice.BLENDMODE_ONE_MINUS_SRC_ALPHA);
        device.setDepthState(false);
        device.setCullMode(GraphicsDevice.CULLFACE_NONE);

        this._meshInstance.render(device);
    }

    update(dt: number): void {
        // Text update logic if needed for animations or dynamic changes
    }

    measure(): Vec2 {
        if (this._dirty) {
            this._calculateDimensions();
        }
        return new Vec2(this._width, this._height);
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
            this._color = value;
            this._dirty = true;
        }
    }

    get font(): string {
        return this._font;
    }

    set font(value: string) {
        if (this._font !== value) {
            this._font = value;
            this._dirty = true;
        }
    }

    get alignment(): 'left' | 'center' | 'right' {
        return this._alignment;
    }

    set alignment(value: 'left' | 'center' | 'right') {
        if (this._alignment !== value) {
            this._alignment = value;
            this._dirty = true;
        }
    }

    get baseline(): 'top' | 'middle' | 'bottom' {
        return this._baseline;
    }

    set baseline(value: 'top' | 'middle' | 'bottom') {
        if (this._baseline !== value) {
            this._baseline = value;
            this._dirty = true;
        }
    }

    private _updateMesh(device: GraphicsDevice): void {
        if (this._vertexBuffer) {
            this._vertexBuffer.destroy();
            this._vertexBuffer = null;
        }
        if (this._indexBuffer) {
            this._indexBuffer.destroy();
            this._indexBuffer = null;
        }

        if (!this._text) return;

        const vertices: number[] = [];
        const indices: number[] = [];
        const positions: number[] = [];
        const uvs: number[] = [];
        const colors: number[] = [];

        this._calculateDimensions();

        let x = 0;
        let y = 0;

        for (let i = 0; i < this._text.length; i++) {
            const char = this._text[i];
            const charWidth = this._fontSize * 0.6;
            const charHeight = this._fontSize;

            const x0 = x;
            const y0 = y;
            const x1 = x + charWidth;
            const y1 = y + charHeight;

            const baseIndex = i * 4;

            positions.push(x0, y0, 0);
            positions.push(x1, y0, 0);
            positions.push(x1, y1, 0);
            positions.push(x0, y1, 0);

            uvs.push(0, 0);
            uvs.push(1, 0);
            uvs.push(1, 1);
            uvs.push(0, 1);

            colors.push(this._color.r, this._color.g, this._color.b, this._color.a);
            colors.push(this._color.r, this._color.g, this._color.b, this._color.a);
            colors.push(this._color.r, this._color.g, this._color.b, this._color.a);
            colors.push(this._color.r, this._color.g, this._color.b, this._color.a);

            indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
            indices.push(baseIndex, baseIndex + 2, baseIndex + 3);

            x += charWidth;
        }

        const format = new VertexFormat(device, [
            { semantic: 'POSITION', type: 'float32', numComponents: 3 },
            { semantic: 'TEXCOORD0', type: 'float32', numComponents: 2 },
            { semantic: 'COLOR', type: 'float32', numComponents: 4 }
        ]);

        this._vertexBuffer = new VertexBuffer(device, format, positions.length / 3);
        this._vertexBuffer.setData(new Float32Array([...positions, ...uvs, ...colors]));

        this._indexBuffer = new IndexBuffer(device, 'uint16', indices.length);
        this._indexBuffer.setData(new Uint16Array(indices));

        const mesh = new Mesh();
        mesh.vertexBuffer = this._vertexBuffer;
        mesh.indexBuffer = this._indexBuffer;

        this._meshInstance = new MeshInstance(mesh, this._material);
    }

    private _calculateDimensions(): void {
        this._width = this._text.length * this._fontSize * 0.6;
        this._height = this._fontSize;
    }

    private _getTextShader(device: GraphicsDevice): Shader {
        const vs = `
            attribute vec3 aPosition;
            attribute vec2 aTexCoord0;
            attribute vec4 aColor;
            
            uniform mat4 matrix_model;
            uniform mat4 matrix_viewProjection;
            
            varying vec2 vUv0;
            varying vec4 vColor;
            
            void main(void) {
                vUv0 = aTexCoord0;
                vColor = aColor;
                gl_Position = matrix_viewProjection * matrix_model * vec4(aPosition, 1.0);
            }
        `;

        const fs = `
            varying vec2 vUv0;
            varying vec4 vColor;
            
            void main(void) {
                gl_FragColor = vColor;
            }
        `;

        return new Shader(device, vs, fs);
    }
}
