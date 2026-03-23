import { WebGLDevice } from './web-gl-device';

export class IndexBuffer {
    private _device: WebGLDevice;
    private _buffer: WebGLBuffer | null;
    private _drawCount: number;
    private _usage: GLenum;
    private _format: GLenum;

    constructor(device: WebGLDevice, format: GLenum, usage: GLenum) {
        this._device = device;
        this._format = format;
        this._usage = usage;
        this._buffer = device.gl.createBuffer();
        this._drawCount = 0;
    }

    get buffer(): WebGLBuffer | null {
        return this._buffer;
    }

    get drawCount(): number {
        return this._drawCount;
    }

    get format(): GLenum {
        return this._format;
    }

    get usage(): GLenum {
        return this._usage;
    }

    setData(data: Uint16Array | Uint32Array): void {
        const gl = this._device.gl;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, this._usage);
        this._drawCount = data.length;
    }

    bind(): void {
        const gl = this._device.gl;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._buffer);
    }

    unbind(): void {
        const gl = this._device.gl;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    dispose(): void {
        if (this._buffer) {
            this._device.gl.deleteBuffer(this._buffer);
            this._buffer = null;
        }
    }
}
