import { GraphicsDevice } from './graphics-device';
import { WebGLDevice } from './webgl-device';

export class IndexBuffer {
    device: GraphicsDevice;
    usage: number;
    numIndices: number;
    format: number;
    private _gl: WebGLRenderingContext;
    private _bufferId: WebGLBuffer | null;
    private _data: Uint16Array | Uint32Array | null;

    constructor(device: GraphicsDevice, format: number, numIndices: number, usage: number = 0x88E4) {
        this.device = device;
        this.format = format;
        this.numIndices = numIndices;
        this.usage = usage;
        this._gl = (device as WebGLDevice).gl;
        this._bufferId = this._gl.createBuffer();
        this._data = null;
    }

    setData(data: Uint16Array | Uint32Array): void {
        if (!this._bufferId) {
            throw new Error('IndexBuffer has been destroyed');
        }
        this._data = data;
        this.numIndices = data.length;
        this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._bufferId);
        this._gl.bufferData(this._gl.ELEMENT_ARRAY_BUFFER, data, this.usage);
        this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, null);
    }

    getData(): Uint16Array | Uint32Array {
        if (!this._bufferId) {
            throw new Error('IndexBuffer has been destroyed');
        }
        if (this._data) {
            return this._data;
        }
        throw new Error('IndexBuffer data not available');
    }

    destroy(): void {
        if (this._bufferId) {
            this._gl.deleteBuffer(this._bufferId);
            this._bufferId = null;
        }
        this._data = null;
    }

    resize(count: number): void {
        if (!this._bufferId) {
            throw new Error('IndexBuffer has been destroyed');
        }
        this.numIndices = count;
        const bytesPerIndex = this.format === 0x1403 ? 2 : 4; // UNSIGNED_SHORT vs UNSIGNED_INT
        const size = count * bytesPerIndex;
        this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._bufferId);
        this._gl.bufferData(this._gl.ELEMENT_ARRAY_BUFFER, size, this.usage);
        this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, null);
    }

    lock(mode: number): ArrayBuffer {
        if (!this._bufferId) {
            throw new Error('IndexBuffer has been destroyed');
        }
        const target = this._gl.ELEMENT_ARRAY_BUFFER;
        this._gl.bindBuffer(target, this._bufferId);
        const buffer = this._gl.mapBuffer(target, mode);
        this._gl.bindBuffer(target, null);
        if (!buffer) {
            throw new Error('Failed to map index buffer');
        }
        return buffer;
    }

    unlock(): void {
        if (!this._bufferId) {
            throw new Error('IndexBuffer has been destroyed');
        }
        const target = this._gl.ELEMENT_ARRAY_BUFFER;
        this._gl.bindBuffer(target, this._bufferId);
        this._gl.unmapBuffer(target);
        this._gl.bindBuffer(target, null);
    }
}
