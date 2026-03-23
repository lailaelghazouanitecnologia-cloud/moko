import { GraphicsDevice } from './graphicsdevice';
import { WebGLDevice } from './webgldevice';

export class IndexBuffer {
    private device: GraphicsDevice;
    private buffer: WebGLBuffer | null;
    private usage: number;
    private count: number;
    private gl: WebGLRenderingContext;

    constructor(device: GraphicsDevice, data: Uint16Array | Uint32Array, usage: number = WebGLRenderingContext.STATIC_DRAW) {
        this.device = device;
        this.usage = usage;
        this.count = data.length;

        const webglDevice = device as WebGLDevice;
        this.gl = webglDevice.gl;

        this.buffer = this.gl.createBuffer();
        if (!this.buffer) {
            throw new Error('Failed to create index buffer');
        }

        this.gl.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, this.buffer);
        this.gl.bufferData(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, data, usage);
        this.gl.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, null);
    }

    bind(commandEncoder: any): void {
        if (!this.buffer) {
            throw new Error('IndexBuffer has been released');
        }
        this.gl.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, this.buffer);
    }

    release(): void {
        if (this.buffer) {
            this.gl.deleteBuffer(this.buffer);
            this.buffer = null;
        }
    }

    getCount(): number {
        return this.count;
    }
}
