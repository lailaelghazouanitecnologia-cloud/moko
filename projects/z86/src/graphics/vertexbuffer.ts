import { GraphicsDevice } from './graphicsdevice';
import { VertexFormat } from './vertexformat';

export class VertexBuffer {
    private gl: WebGLRenderingContext;
    private buffer: WebGLBuffer | null = null;
    private usage: number;
    private numVertices: number;
    private format: VertexFormat;
    private device: GraphicsDevice;

    constructor(device: GraphicsDevice, format: VertexFormat, numVertices: number, usage: number = WebGLRenderingContext.STATIC_DRAW) {
        this.device = device;
        this.gl = (device as any).gl;
        this.format = format;
        this.numVertices = numVertices;
        this.usage = usage;
        this.buffer = this.gl.createBuffer();
        if (!this.buffer) {
            throw new Error('Failed to create WebGL buffer');
        }
    }

    bind(): void {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    }

    update(data: ArrayBufferView): void {
        if (!this.buffer) {
            throw new Error('VertexBuffer has been disposed');
        }
        this.bind();
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.usage);
    }

    dispose(): void {
        if (this.buffer) {
            this.gl.deleteBuffer(this.buffer);
            this.buffer = null;
        }
    }

    getFormat(): VertexFormat {
        return this.format;
    }

    getNumVertices(): number {
        return this.numVertices;
    }

    getUsage(): number {
        return this.usage;
    }
}
