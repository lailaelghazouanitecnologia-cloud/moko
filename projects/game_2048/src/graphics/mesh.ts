import { VertexBuffer } from './vertex-buffer';
import { IndexBuffer } from './index-buffer';
import { VertexFormat } from './vertex-format';
import { GraphicsDevice } from './graphics-device';

/**
 * GPU geometry container that manages vertex and index buffers for rendering.
 */
export class Mesh {
    vertexBuffer: VertexBuffer;
    indexBuffer: IndexBuffer;
    vertexFormat: VertexFormat;
    primitiveType: number;
    indexCount: number;

    constructor() {
        this.vertexBuffer = null as any;
        this.indexBuffer = null as any;
        this.vertexFormat = null as any;
        this.primitiveType = 0x0004; // WebGLRenderingContext.TRIANGLES
        this.indexCount = 0;
    }

    /**
     * Assigns a vertex buffer to this mesh.
     * @param buffer - The vertex buffer to assign
     * @throws {TypeError} If buffer is null or undefined
     */
    setVertexBuffer(buffer: VertexBuffer): void {
        if (!buffer) {
            throw new TypeError('Vertex buffer cannot be null or undefined');
        }
        this.vertexBuffer = buffer;
    }

    /**
     * Assigns an index buffer to this mesh and updates the index count.
     * @param buffer - The index buffer to assign
     * @throws {TypeError} If buffer is null or undefined
     */
    setIndexBuffer(buffer: IndexBuffer): void {
        if (!buffer) {
            throw new TypeError('Index buffer cannot be null or undefined');
        }
        this.indexBuffer = buffer;
        this.indexCount = buffer.numIndices;
    }

    /**
     * Submits a draw call for this mesh to the graphics device.
     * @param device - The graphics device to render with
     * @throws {TypeError} If device is null or undefined
     * @throws {Error} If vertex buffer is not set
     */
    draw(device: GraphicsDevice): void {
        if (!device) {
            throw new TypeError('Graphics device cannot be null or undefined');
        }
        if (!this.vertexBuffer) {
            throw new Error('Cannot draw mesh without vertex buffer');
        }
        device.draw(this, 1);
    }

    /**
     * Uploads new vertex data to the vertex buffer.
     * @param data - The vertex data to upload
     * @throws {TypeError} If data is not a Float32Array
     * @throws {Error} If vertex buffer is not set
     */
    updateVertices(data: Float32Array): void {
        if (!(data instanceof Float32Array)) {
            throw new TypeError('Vertex data must be a Float32Array');
        }
        if (!this.vertexBuffer) {
            throw new Error('Cannot update vertices without vertex buffer');
        }
        this.vertexBuffer.setData(data.buffer);
    }

    /**
     * Uploads new index data to the index buffer and updates the index count.
     * @param data - The index data to upload
     * @throws {TypeError} If data is not a Uint16Array
     * @throws {Error} If index buffer is not set
     */
    updateIndices(data: Uint16Array): void {
        if (!(data instanceof Uint16Array)) {
            throw new TypeError('Index data must be a Uint16Array');
        }
        if (!this.indexBuffer) {
            throw new Error('Cannot update indices without index buffer');
        }
        this.indexBuffer.setData(data);
        this.indexCount = data.length;
    }

    /**
     * Frees GPU buffers and resets this mesh to its initial state.
     */
    destroy(): void {
        if (this.vertexBuffer) {
            this.vertexBuffer.destroy();
            this.vertexBuffer = null as any;
        }
        if (this.indexBuffer) {
            this.indexBuffer.destroy();
            this.indexBuffer = null as any;
        }
        this.vertexFormat = null as any;
        this.indexCount = 0;
    }

    /**
     * Checks if this mesh has a vertex buffer assigned.
     * @returns True if vertex buffer is present
     */
    hasVertexBuffer(): boolean {
        return this.vertexBuffer !== null && this.vertexBuffer !== undefined;
    }

    /**
     * Checks if this mesh has an index buffer assigned.
     * @returns True if index buffer is present
     */
    hasIndexBuffer(): boolean {
        return this.indexBuffer !== null && this.indexBuffer !== undefined;
    }

    /**
     * Gets the number of primitives to draw based on the primitive type.
     * @returns Number of primitives
     * @throws {Error} If primitive type is unsupported
     */
    getPrimitiveCount(): number {
        if (!this.hasIndexBuffer()) {
            const vertexCount = this.vertexBuffer ? this.vertexBuffer.numVertices : 0;
            return this.calculatePrimitiveCount(vertexCount, this.primitiveType);
        }
        return this.calculatePrimitiveCount(this.indexCount, this.primitiveType);
    }

    /**
     * Validates that this mesh is ready for rendering.
     * @returns True if mesh can be drawn
     */
    isValid(): boolean {
        return this.hasVertexBuffer() && this.vertexFormat !== null;
    }

    /**
     * Calculates primitive count based on vertex/index count and primitive type.
     * @param count - Number of vertices or indices
     * @param primitiveType - WebGL primitive type
     * @returns Number of primitives
     * @private
     */
    private calculatePrimitiveCount(count: number, primitiveType: number): number {
        switch (primitiveType) {
            case 0x0000: // WebGLRenderingContext.POINTS
                return count;
            case 0x0001: // WebGLRenderingContext.LINES
                return Math.floor(count / 2);
            case 0x0003: // WebGLRenderingContext.LINE_STRIP
                return Math.max(0, count - 1);
            case 0x0004: // WebGLRenderingContext.TRIANGLES
                return Math.floor(count / 3);
            case 0x0005: // WebGLRenderingContext.TRIANGLE_STRIP
            case 0x0006: // WebGLRenderingContext.TRIANGLE_FAN
                return Math.max(0, count - 2);
            default:
                throw new Error(`Unsupported primitive type: ${primitiveType}`);
        }
    }
}
