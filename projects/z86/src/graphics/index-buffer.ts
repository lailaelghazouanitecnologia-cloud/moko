import { WebGLDevice } from './web-gl-device';

export class IndexBuffer {
    private _device: WebGLDevice;
    private _buffer: WebGLBuffer | null;
    private _indexCount: number;
    private _gl: WebGLRenderingContext;

    constructor(device: WebGLDevice, data: Uint16Array | Uint32Array) {
        this._device = device;
        this._gl = device.gl;
        this._buffer = this._gl.createBuffer();
        if (!this._buffer) {
            throw new Error('Failed to create WebGL buffer');
        }
        this._indexCount = data.length;
        this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._buffer);
        this._gl.bufferData(this._gl.ELEMENT_ARRAY_BUFFER, data, this._gl.STATIC_DRAW);
    }

    get indexCount(): number {
        return this._indexCount;
    }

    bind(): void {
        this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._buffer);
    }

    draw(primitiveType: number = this._gl.TRIANGLES): void {
        this._gl.drawElements(primitiveType, this._indexCount, this._gl.UNSIGNED_SHORT, 0);
    }

    dispose(): void {
        if (this._buffer) {
            this._gl.deleteBuffer(this._buffer);
            this._buffer = null;
        }
    }
}
