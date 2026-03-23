import { WebGLDevice } from './web-gl-device';

export class IndexBuffer {
    private device: WebGLDevice;
    private buffer: WebGLBuffer | null = null;
    private gl: WebGLRenderingContext;
    private usage: number;
    private indexCount: number;
    private indexType: number;

    constructor(device: WebGLDevice, indexCount: number, usage: number = WebGLRenderingContext.STATIC_DRAW) {
        this.device = device;
        this.gl = device.gl;
        this.indexCount = indexCount;
        this.usage = usage;
        this.indexType = WebGLRenderingContext.UNSIGNED_SHORT;

        this.buffer = this.gl.createBuffer();
        if (!this.buffer) {
            throw new Error('Failed to create index buffer');
        }
    }

    setData(data: Uint16Array | Uint32Array): void {
        if (!this.buffer) {
            throw new Error('Index buffer has been destroyed');
        }

        if (data instanceof Uint32Array) {
            this.indexType = WebGLRenderingContext.UNSIGNED_INT;
        } else if (data instanceof Uint16Array) {
            this.indexType = WebGLRenderingContext.UNSIGNED_SHORT;
        } else {
            throw new Error('Unsupported index data type');
        }

        this.indexCount = data.length;
        this.gl.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, this.buffer);
        this.gl.bufferData(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, data, this.usage);
    }

    bind(): void {
        if (!this.buffer) {
            throw new Error('Index buffer has been destroyed');
        }
        this.gl.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, this.buffer);
    }

    draw(primitiveType: number = WebGLRenderingContext.TRIANGLES, offset: number = 0, count?: number): void {
        if (!this.buffer) {
            throw new Error('Index buffer has been destroyed');
        }

        const drawCount = count ?? this.indexCount;
        this.gl.drawElements(primitiveType, drawCount, this.indexType, offset * (this.indexType === WebGLRenderingContext.UNSIGNED_INT ? 4 : 2));
    }

    getIndexCount(): number {
        return this.indexCount;
    }

    getIndexType(): number {
        return this.indexType;
    }

    destroy(): void {
        if (this.buffer) {
            this.gl.deleteBuffer(this.buffer);
            this.buffer = null;
        }
    }
}
