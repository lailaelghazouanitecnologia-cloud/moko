import { WebGL2RenderingContext } from './graphics-device';

export class IndexBuffer {
    private gl: WebGL2RenderingContext;
    private buffer: WebGLBuffer;
    private numIndices: number;
    private format: number;
    private usage: number;

    constructor(gl: WebGL2RenderingContext, buffer: WebGLBuffer, numIndices: number, format: number, usage: number) {
        this.gl = gl;
        this.buffer = buffer;
        this.numIndices = numIndices;
        this.format = format;
        this.usage = usage;
    }

    bind(): void {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffer);
    }

    upload(data: Uint16Array | Uint32Array): void {
        this.bind();
        this.numIndices = data.length;
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, data, this.usage);
    }

    update(data: Uint16Array | Uint32Array, offset: number = 0): void {
        this.bind();
        this.gl.bufferSubData(this.gl.ELEMENT_ARRAY_BUFFER, offset, data);
    }

    destroy(): void {
        if (this.buffer) {
            this.gl.deleteBuffer(this.buffer);
            this.buffer = null as any;
        }
    }

    static createDynamic(gl: WebGL2RenderingContext, count: number, format: number): IndexBuffer {
        const buffer = gl.createBuffer();
        if (!buffer) {
            throw new Error('Failed to create index buffer');
        }
        const usage = gl.DYNAMIC_DRAW;
        const indexBuffer = new IndexBuffer(gl, buffer, count, format, usage);
        indexBuffer.bind();
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, count * (format === gl.UNSIGNED_SHORT ? 2 : 4), usage);
        return indexBuffer;
    }

    static createStatic(gl: WebGL2RenderingContext, data: Uint16Array | Uint32Array): IndexBuffer {
        const buffer = gl.createBuffer();
        if (!buffer) {
            throw new Error('Failed to create index buffer');
        }
        const format = data instanceof Uint16Array ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT;
        const usage = gl.STATIC_DRAW;
        const indexBuffer = new IndexBuffer(gl, buffer, data.length, format, usage);
        indexBuffer.upload(data);
        return indexBuffer;
    }
}
