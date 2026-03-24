export enum VertexType {
    FLOAT32 = 'FLOAT32',
    UINT8 = 'UINT8',
    INT16 = 'INT16',
    UINT16 = 'UINT16',
    UINT32 = 'UINT32'
}

/**
 * Represents a single element within a vertex format.
 */
export interface VertexElement {
    /** Name of the attribute (e.g., 'position', 'color'). */
    name: string;
    /** Data type of the element. */
    type: VertexType;
    /** Number of components (e1..4). */
    count: number;
    /** Byte offset from the start of the vertex. */
    offset: number;
    /** Total size in bytes for this element. */
    size: number;
}

/**
 * Describes the memory layout of vertex attributes for a graphics pipeline.
 * Manages the stride and offsets of each attribute.
 */
export class VertexFormat {
    private elements: VertexElement[] = [];
    private stride: number = 0;

    constructor() {
        // empty format
    }

    /**
     * Adds a new attribute to the format.
     * @param name - Unique name for the attribute.
     * @param type - Data type of each component.
     * @param count - Number of components (1..4).
     * @throws {Error} If count is not between 1 and 4.
     * @throws {Error} If an attribute with the same name already exists.
     */
    add(name: string, type: VertexType, count: number): void {
        if (count < 1 || count > 4) {
            throw new Error('Vertex element count must be between 1 and 4');
        }
        if (this.elements.some(e => e.name === name)) {
            throw new Error(`Vertex element with name '${name}' already exists`);
        }

        const size = this.getTypeSize(type) * count;
        const offset = this.stride;
        this.elements.push({
            name,
            type,
            count,
            offset,
            size
        });
        this.stride += size;
    }

    /**
     * Returns the stride in bytes for one complete vertex.
     */
    getSize(): number {
        return this.stride;
    }

    /**
     * Returns the byte offset of the attribute with the given name.
     * @param name - Name of the attribute.
     * @returns The byte offset from the start of the vertex.
     * @throws {Error} If no attribute with the given name exists.
     */
    getOffset(name: string): number {
        const element = this.elements.find(e => e.name === name);
        if (!element) {
            throw new Error(`Vertex element '${name}' not found`);
        }
        return element.offset;
    }

    /**
     * Returns a shallow copy of all elements in the order they were added.
     */
    getElements(): VertexElement[] {
        return this.elements.slice();
    }

    /**
     * Checks whether an attribute with the given name exists.
     * @param name - Name of the attribute.
     */
    has(name: string): boolean {
        return this.elements.some(e => e.name === name);
    }

    /**
     * Removes an attribute from the format.
     * @param name - Name of the attribute to remove.
     * @returns True if the attribute was removed, false if it did not exist.
     */
    remove(name: string): boolean {
        const index = this.elements.findIndex(e => e.name === name);
        if (index === -1) return false;

        const removed = this.elements.splice(index, 1)[0];
        this.stride -= removed.size;
        this.recomputeOffsets(index);
        return true;
    }

    /**
     * Removes all attributes and resets the stride to zero.
     */
    clear(): void {
        this.elements = [];
        this.stride = 0;
    }

    /**
     * Creates an exact copy of this format.
     */
    clone(): VertexFormat {
        const fmt = new VertexFormat();
        for (const el of this.elements) {
            fmt.add(el.name, el.type, el.count);
        }
        return fmt;
    }

    /**
     * Returns the number of attributes in the format.
     */
    get count(): number {
        return this.elements.length;
    }

    /**
     * Returns the size in bytes for a single data type.
     * @param type - The vertex data type.
     * @throws {Error} If the type is not recognized.
     */
    private getTypeSize(type: VertexType): number {
        switch (type) {
            case VertexType.FLOAT32:
                return 4;
            case VertexType.UINT8:
                return 1;
            case VertexType.INT16:
            case VertexType.UINT16:
                return 2;
            case VertexType.UINT32:
                return 4;
            default:
                throw new Error(`Unknown vertex type: ${type}`);
        }
    }

    /**
     * Recomputes offsets for elements starting at the given index after removal.
     * @param startIndex - Index from which to recompute offsets.
     */
    private recomputeOffsets(startIndex: number): void {
        let offset = startIndex > 0 ? this.elements[startIndex - 1].offset + this.elements[startIndex - 1].size : 0;
        for (let i = startIndex; i < this.elements.length; i++) {
            const el = this.elements[i];
            el.offset = offset;
            offset += el.size;
        }
    }
}
