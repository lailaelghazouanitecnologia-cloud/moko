import { GraphicsDevice } from './graphics-device';
import { WebGLDevice } from './web-gl-device';

export interface VertexAttribute {
    name: string;
    type: number;
    size: number;
    offset: number;
    normalized: boolean;
}

export class VertexFormat {
    attributes: VertexAttribute[];
    stride: number;
    size: number;
    private _gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    private _vao: WebGLVertexArrayObject | null = null;

    constructor(attributes: VertexAttribute[]) {
        this.attributes = attributes;
        this.stride = 0;
        this.size = 0;
        this._calculateLayout();
    }

    private _calculateLayout(): void {
        let offset = 0;
        for (const attr of this.attributes) {
            attr.offset = offset;
            const typeSize = this._getTypeSize(attr.type);
            offset += typeSize * attr.size;
        }
        this.stride = offset;
        this.size = this.stride;
    }

    private _getTypeSize(type: number): number {
        switch (type) {
            case 0x1400: // BYTE
            case 0x1401: // UNSIGNED_BYTE
                return 1;
            case 0x1402: // SHORT
            case 0x1403: // UNSIGNED_SHORT
                return 2;
            case 0x1404: // INT
            case 0x1405: // UNSIGNED_INT
            case 0x1406: // FLOAT
                return 4;
            default:
                return 4;
        }
    }

    bind(device: GraphicsDevice, buffer: WebGLBuffer): void {
        const webglDevice = device as WebGLDevice;
        this._gl = webglDevice.gl;
        if (!this._gl) return;

        const gl = this._gl;
        if (gl instanceof WebGL2RenderingContext) {
            this._vao = gl.createVertexArray();
            gl.bindVertexArray(this._vao);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        for (let i = 0; i < this.attributes.length; i++) {
            const attr = this.attributes[i];
            gl.enableVertexAttribArray(i);
            gl.vertexAttribPointer(
                i,
                attr.size,
                attr.type,
                attr.normalized,
                this.stride,
                attr.offset
            );
        }
    }

    unbind(): void {
        if (!this._gl) return;
        const gl = this._gl;
        if (gl instanceof WebGL2RenderingContext && this._vao) {
            gl.bindVertexArray(null);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    destroy(): void {
        if (this._gl instanceof WebGL2RenderingContext && this._vao) {
            this._gl.deleteVertexArray(this._vao);
            this._vao = null;
        }
        this._gl = null;
    }

    static create(attributes: VertexAttribute[]): VertexFormat {
        return new VertexFormat(attributes);
    }

    static getStride(attributes: VertexAttribute[]): number {
        let stride = 0;
        for (const attr of attributes) {
            let typeSize = 4;
            switch (attr.type) {
                case 0x1400:
                case 0x1401:
                    typeSize = 1;
                    break;
                case 0x1402:
                case 0x1403:
                    typeSize = 2;
                    break;
            }
            stride += typeSize * attr.size;
        }
        return stride;
    }

    static getSize(attributes: VertexAttribute[]): number {
        return VertexFormat.getStride(attributes);
    }
}
