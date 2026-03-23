import { GraphicsDevice } from './graphics-device';
import { WebGLDevice } from './web-gl-device';
import { VertexFormat } from './vertex-format';

export enum BufferUsage {
    STATIC_DRAW = 0x88E4,
    DYNAMIC_DRAW = 0x88E8,
    STREAM_DRAW = 0x88E0
}

export interface VertexLayoutDescriptor {
    attributes: Array<{
        name: string;
        offset: number;
        format: VertexFormat;
        bufferIndex: number;
    }>;
    stride: number;
}

export class VertexBuffer {
    private _device: GraphicsDevice;
    private _glBuffer: WebGLBuffer | null = null;
    private _usage: BufferUsage;
    private _size: number;
    private _numVertices: number;
    private _vertexLayout: VertexLayoutDescriptor;
    private _glDevice: WebGLDevice;

    constructor(device: GraphicsDevice, vertexLayout: VertexLayoutDescriptor, numVertices: number, usage: BufferUsage = BufferUsage.STATIC_DRAW) {
        this._device = device;
        this._glDevice = device as WebGLDevice;
        this._vertexLayout = vertexLayout;
        this._numVertices = numVertices;
        this._usage = usage;
        this._size = vertexLayout.stride * numVertices;
        
        const gl = this._glDevice.gl;
        this._glBuffer = gl.createBuffer();
        
        if (!this._glBuffer) {
            throw new Error('Failed to create WebGL buffer');
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._size, usage);
    }

    get device(): GraphicsDevice {
        return this._device;
    }

    get usage(): BufferUsage {
        return this._usage;
    }

    get size(): number {
        return this._size;
    }

    get numVertices(): number {
        return this._numVertices;
    }

    get vertexLayout(): VertexLayoutDescriptor {
        return this._vertexLayout;
    }

    setData(data: ArrayBufferView, offset = 0): void {
        if (!this._glBuffer) {
            throw new Error('Vertex buffer has been destroyed');
        }
        
        const gl = this._glDevice.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, offset, data);
    }

    getData(data: ArrayBufferView, offset = 0): void {
        if (!this._glBuffer) {
            throw new Error('Vertex buffer has been destroyed');
        }
        
        const gl = this._glDevice.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffer);
        const mappedData = gl.getBufferSubData(gl.ARRAY_BUFFER, offset, data.byteLength);
        const targetArray = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        targetArray.set(new Uint8Array(mappedData));
    }

    destroy(): void {
        if (this._glBuffer) {
            const gl = this._glDevice.gl;
            gl.deleteBuffer(this._glBuffer);
            this._glBuffer = null;
        }
    }
}
