import { EventEmitter } from '../core/EventEmitter';
import { VertexBuffer } from './VertexBuffer';
import { IndexBuffer } from './IndexBuffer';
import { VertexFormat } from './VertexFormat';
import { GraphicsDevice } from './GraphicsDevice';

export class Mesh extends EventEmitter {
    private _vertexBuffer: VertexBuffer | null = null;
    private _indexBuffer: IndexBuffer | null = null;
    private _vertexFormat: VertexFormat;
    private _vertexCount: number = 0;
    private _indexCount: number = 0;
    private _primitiveType: number = 4; // TRIANGLES
    private _device: GraphicsDevice;

    constructor(device: GraphicsDevice, vertexFormat: VertexFormat) {
        super();
        this._device = device;
        this._vertexFormat = vertexFormat;
    }

    get vertexBuffer(): VertexBuffer | null {
        return this._vertexBuffer;
    }

    get indexBuffer(): IndexBuffer | null {
        return this._indexBuffer;
    }

    get vertexFormat(): VertexFormat {
        return this._vertexFormat;
    }

    get vertexCount(): number {
        return this._vertexCount;
    }

    get indexCount(): number {
        return this._indexCount;
    }

    get primitiveType(): number {
        return this._primitiveType;
    }

    set primitiveType(type: number) {
        this._primitiveType = type;
    }

    setVertexBuffer(vertexBuffer: VertexBuffer): void {
        this._vertexBuffer = vertexBuffer;
        this._vertexCount = vertexBuffer ? vertexBuffer.numVertices : 0;
    }

    setIndexBuffer(indexBuffer: IndexBuffer): void {
        this._indexBuffer = indexBuffer;
        this._indexCount = indexBuffer ? indexBuffer.numIndices : 0;
    }

    draw(): void {
        if (!this._vertexBuffer) {
            throw new Error('Vertex buffer not set');
        }

        const gl = (this._device as any).gl;
        if (!gl) {
            throw new Error('WebGL context not available');
        }

        this._vertexBuffer.bind();

        if (this._indexBuffer) {
            this._indexBuffer.bind();
            gl.drawElements(this._primitiveType, this._indexCount, gl.UNSIGNED_SHORT, 0);
            this._indexBuffer.unbind();
        } else {
            gl.drawArrays(this._primitiveType, 0, this._vertexCount);
        }

        this._vertexBuffer.unbind();
    }

    destroy(): void {
        if (this._vertexBuffer) {
            this._vertexBuffer.destroy();
            this._vertexBuffer = null;
        }
        if (this._indexBuffer) {
            this._indexBuffer.destroy();
            this._indexBuffer = null;
        }
        this.emit('destroy');
    }
}
