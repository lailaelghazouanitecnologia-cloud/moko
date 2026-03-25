import { GraphicsDevice } from './graphics-device';
import { VertexFormat } from './vertex-format';

/**
 * GPU vertex data container that manages vertex buffer objects for WebGL.
 * Provides functionality for uploading, updating, and managing vertex data.
 */
export class VertexBuffer {
    device: GraphicsDevice;
    usage: number;
    numVertices: number;
    format: VertexFormat;
    bufferId: WebGLBuffer | null;
    private _gl: WebGLRenderingContext;
    private _data: ArrayBuffer | null;

    /**
     * Creates a new vertex buffer instance.
     * @param device - The graphics device to create the buffer on
     * @param format - The vertex format describing the layout of vertex data
     * @param numVertices - The number of vertices this buffer can hold
     * @param usage - The usage pattern for the buffer (default: GL_STATIC_DRAW)
     * @throws Error if buffer creation fails or parameters are invalid
     */
    constructor(device: GraphicsDevice, format: VertexFormat, numVertices: number, usage: number = 0x88E4) {
        if (!device) {
            throw new Error('Graphics device is required');
        }
        if (!format) {
            throw new Error('Vertex format is required');
        }
        if (numVertices <= 0) {
            throw new Error('Number of vertices must be positive');
        }
        if (usage < 0) {
            throw new Error('Invalid buffer usage');
        }

        this.device = device;
        this.format = format;
        this.numVertices = numVertices;
        this.usage = usage;
        this.bufferId = null;
        this._data = null;

        const webglDevice = device as any;
        if (!webglDevice.gl) {
            throw new Error('Graphics device does not have WebGL context');
        }
        this._gl = webglDevice.gl;

        this.bufferId = this._gl.createBuffer();
        if (!this.bufferId) {
            throw new Error('Failed to create vertex buffer');
        }

        const stride = format.getStride();
        if (stride <= 0) {
            throw new Error('Invalid vertex format stride');
        }
        const size = numVertices * stride;
        if (size <= 0) {
            throw new Error('Invalid buffer size');
        }

        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.bufferId);
        this._gl.bufferData(this._gl.ARRAY_BUFFER, size, usage);
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, null);
    }

    /**
     * Uploads vertex data to the GPU buffer.
     * @param data - The vertex data to upload
     * @throws Error if buffer is destroyed or data is invalid
     */
    setData(data: ArrayBuffer): void {
        if (!data) {
            throw new Error('Data is required');
        }
        if (!(data instanceof ArrayBuffer)) {
            throw new Error('Data must be an ArrayBuffer');
        }
        if (!this.bufferId) {
            throw new Error('Vertex buffer has been destroyed');
        }

        const expectedSize = this.numVertices * this.format.getStride();
        if (data.byteLength !== expectedSize) {
            throw new Error(`Data size (${data.byteLength}) does not match expected size (${expectedSize})`);
        }

        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.bufferId);
        this._gl.bufferSubData(this._gl.ARRAY_BUFFER, 0, data);
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, null);
        this._data = data.slice(0);
    }

    /**
     * Reads vertex data from the GPU buffer.
     * @returns A copy of the vertex data
     * @throws Error if buffer is destroyed
     */
    getData(): ArrayBuffer {
        if (!this.bufferId) {
            throw new Error('Vertex buffer has been destroyed');
        }

        if (this._data) {
            return this._data.slice(0);
        }

        const size = this.numVertices * this.format.getStride();
        const data = new ArrayBuffer(size);
        
        // Note: WebGL doesn't provide direct buffer reading capability
        // This implementation returns a zero-filled buffer as a placeholder
        // In a real implementation, you might need to track data separately
        return data;
    }

    /**
     * Updates a portion of the vertex buffer data.
     * @param offset - The byte offset to update at
     * @param data - The new data to write
     * @throws Error if buffer is destroyed or parameters are invalid
     */
    updateData(offset: number, data: ArrayBuffer): void {
        if (!data) {
            throw new Error('Data is required');
        }
        if (!(data instanceof ArrayBuffer)) {
            throw new Error('Data must be an ArrayBuffer');
        }
        if (offset < 0) {
            throw new Error('Offset must be non-negative');
        }
        if (!this.bufferId) {
            throw new Error('Vertex buffer has been destroyed');
        }

        const bufferSize = this.numVertices * this.format.getStride();
        if (offset + data.byteLength > bufferSize) {
            throw new Error('Data would exceed buffer bounds');
        }

        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.bufferId);
        this._gl.bufferSubData(this._gl.ARRAY_BUFFER, offset, data);
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, null);
        
        if (this._data) {
            const src = new Uint8Array(data);
            const dst = new Uint8Array(this._data, offset);
            dst.set(src);
        }
    }

    /**
     * Locks the buffer for writing, returning a writable array buffer.
     * @param mode - The lock mode (currently unused)
     * @returns An ArrayBuffer that can be written to
     * @throws Error if buffer is destroyed
     */
    lock(mode: number): ArrayBuffer {
        if (!this.bufferId) {
            throw new Error('Vertex buffer has been destroyed');
        }
        const size = this.numVertices * this.format.getStride();
        this._data = new ArrayBuffer(size);
        return this._data;
    }

    /**
     * Unlocks the buffer and uploads any pending data.
     */
    unlock(): void {
        if (!this.bufferId || !this._data) {
            return;
        }
        this.setData(this._data);
    }

    /**
     * Destroys the buffer and releases GPU memory.
     */
    destroy(): void {
        if (this.bufferId) {
            this._gl.deleteBuffer(this.bufferId);
            this.bufferId = null;
        }
        this._data = null;
    }

    /**
     * Gets the size of the buffer in bytes.
     * @returns The buffer size in bytes
     */
    getSize(): number {
        return this.numVertices * this.format.getStride();
    }

    /**
     * Checks if the buffer is valid and ready for use.
     * @returns True if the buffer is valid
     */
    isValid(): boolean {
        return this.bufferId !== null;
    }

    /**
     * Gets the stride of the vertex format.
     * @returns The stride in bytes
     */
    getStride(): number {
        return this.format.getStride();
    }
}
