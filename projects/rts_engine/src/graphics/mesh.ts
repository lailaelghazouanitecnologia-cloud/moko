import { VertexBuffer } from './vertex-buffer';
import { IndexBuffer } from './index-buffer';

export enum PrimitiveType {
    POINTS = 0,
    LINES = 1,
    LINE_LOOP = 2,
    LINE_STRIP = 3,
    TRIANGLES = 4,
    TRIANGLE_STRIP = 5,
    TRIANGLE_FAN = 6
}

/**
 * Geometry container that holds vertex and optional index data together with a primitive type.
 */
export class Mesh {
    private vertexBuffer: VertexBuffer;
    private indexBuffer: IndexBuffer | null;
    private primitive: PrimitiveType;

    /**
     * Creates a new Mesh instance.
     * @param vertexBuffer - The vertex buffer containing vertex data.
     * @param indexBuffer - Optional index buffer for indexed rendering.
     * @throws {TypeError} If vertexBuffer is null or undefined.
     */
    constructor(vertexBuffer: VertexBuffer, indexBuffer?: IndexBuffer) {
        if (!vertexBuffer) {
            throw new TypeError('vertexBuffer is required and cannot be null or undefined');
        }
        this.vertexBuffer = vertexBuffer;
        this.indexBuffer = indexBuffer || null;
        this.primitive = PrimitiveType.TRIANGLES;
    }

    /**
     * Retrieves the vertex buffer associated with this mesh.
     * @returns The vertex buffer.
     */
    getVertexBuffer(): VertexBuffer {
        return this.vertexBuffer;
    }

    /**
     * Retrieves the index buffer associated with this mesh, if any.
     * @returns The index buffer or null if not provided.
     */
    getIndexBuffer(): IndexBuffer | null {
        return this.indexBuffer;
    }

    /**
     * Retrieves the primitive type used for rendering this mesh.
     * @returns The primitive type.
     */
    getPrimitive(): PrimitiveType {
        return this.primitive;
    }

    /**
     * Sets the primitive type for rendering this mesh.
     * @param primitive - The new primitive type.
     * @throws {TypeError} If primitive is null or undefined.
     */
    setPrimitive(primitive: PrimitiveType): void {
        if (primitive === null || primitive === undefined) {
            throw new TypeError('primitive cannot be null or undefined');
        }
        this.primitive = primitive;
    }

    /**
     * Checks if this mesh uses indexed rendering.
     * @returns True if an index buffer is present, false otherwise.
     */
    isIndexed(): boolean {
        return this.indexBuffer !== null;
    }

    /**
     * Returns the number of vertices in the mesh.
     * @returns The vertex count.
     */
    getVertexCount(): number {
        return this.vertexBuffer.getCount();
    }

    /**
     * Returns the number of indices in the mesh, or 0 if not indexed.
     * @returns The index count.
     */
    getIndexCount(): number {
        return this.indexBuffer ? this.indexBuffer.getCount() : 0;
    }

    /**
     * Validates the mesh state for rendering.
     * @returns True if the mesh is valid, false otherwise.
     */
    isValid(): boolean {
        return this.vertexBuffer.getCount() > 0 && (!this.indexBuffer || this.indexBuffer.getCount() > 0);
    }
}
