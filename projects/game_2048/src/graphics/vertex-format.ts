export interface VertexAttribute {
    name: string;
    type: DataType;
    components: number;
    normalized: boolean;
    offset: number;
    size: number;
}

export type DataType = 'byte' | 'ubyte' | 'short' | 'ushort' | 'int' | 'uint' | 'float' | 'half';

export class VertexFormat {
    attributes: VertexAttribute[] = [];
    stride: number = 0;
    instanceDivisors: Map<string, number> = new Map();

    /**
     * Append a vertex attribute definition to this format.
     * @param name - Unique name for the attribute.
     * @param type - Data type of each component.
     * @param components - Number of components per attribute (1-4).
     * @param normalized - Whether fixed-point data should be normalized when accessed.
     * @throws {TypeError} If components is not an integer between 1 and 4.
     * @throws {TypeError} If an attribute with the same name already exists.
     */
    addAttribute(name: string, type: DataType, components: number, normalized: boolean = false): void {
        if (!Number.isInteger(components) || components < 1 || components > 4) {
            throw new TypeError('components must be an integer between 1 and 4');
        }
        if (this.hasAttribute(name)) {
            throw new TypeError(`An attribute named "${name}" already exists`);
        }

        const typeSizes: Record<DataType, number> = {
            'byte': 1,
            'ubyte': 1,
            'short': 2,
            'ushort': 2,
            'int': 4,
            'uint': 4,
            'float': 4,
            'half': 2
        };

        const attribute: VertexAttribute = {
            name,
            type,
            components,
            normalized,
            offset: this.stride,
            size: typeSizes[type] * components
        };

        this.attributes.push(attribute);
        this.stride += attribute.size;
    }

    /**
     * Set the instance divisor for an attribute.
     * @param name - Name of the attribute.
     * @param divisor - Number of instances to pass before advancing one element.
     * @throws {TypeError} If the attribute does not exist.
     */
    setInstanceDivisor(name: string, divisor: number): void {
        if (!this.hasAttribute(name)) {
            throw new TypeError(`Attribute "${name}" does not exist`);
        }
        if (!Number.isInteger(divisor) || divisor < 0) {
            throw new TypeError('divisor must be a non-negative integer');
        }
        this.instanceDivisors.set(name, divisor);
    }

    /**
     * Get the byte stride between consecutive vertices.
     * @returns The stride in bytes.
     */
    getStride(): number {
        return this.stride;
    }

    /**
     * Retrieve attribute metadata by name.
     * @param name - Name of the attribute.
     * @returns The attribute descriptor, or undefined if not found.
     */
    getAttribute(name: string): VertexAttribute | undefined {
        return this.attributes.find(attr => attr.name === name);
    }

    /**
     * Check whether an attribute with the given name exists.
     * @param name - Name of the attribute.
     * @returns True if the attribute exists.
     */
    hasAttribute(name: string): boolean {
        return this.attributes.some(attr => attr.name === name);
    }

    /**
     * Remove an attribute from the format.
     * @param name - Name of the attribute to remove.
     * @returns True if the attribute was found and removed, false otherwise.
     */
    removeAttribute(name: string): boolean {
        const index = this.attributes.findIndex(attr => attr.name === name);
        if (index === -1) return false;

        this.attributes.splice(index, 1);
        this.instanceDivisors.delete(name);
        
        this.stride = 0;
        for (const attr of this.attributes) {
            attr.offset = this.stride;
            this.stride += attr.size;
        }

        return true;
    }

    /**
     * Remove all attributes and reset the format.
     */
    clear(): void {
        this.attributes.length = 0;
        this.stride = 0;
        this.instanceDivisors.clear();
    }

    /**
     * Get the instance divisor for an attribute.
     * @param name - Name of the attribute.
     * @returns The divisor, or undefined if not set or attribute does not exist.
     */
    getInstanceDivisor(name: string): number | undefined {
        return this.instanceDivisors.get(name);
    }

    /**
     * Get a read-only list of all attribute names in order.
     * @returns Array of attribute names.
     */
    getAttributeNames(): readonly string[] {
        return this.attributes.map(attr => attr.name);
    }

    /**
     * Create an independent copy of this VertexFormat.
     * @returns A new VertexFormat with the same attributes and divisors.
     */
    clone(): VertexFormat {
        const fmt = new VertexFormat();
        for (const attr of this.attributes) {
            fmt.addAttribute(attr.name, attr.type, attr.components, attr.normalized);
        }
        for (const [name, divisor] of this.instanceDivisors) {
            fmt.setInstanceDivisor(name, divisor);
        }
        return fmt;
    }

    /**
     * Serialize the format to a JSON-friendly object.
     * @returns Plain object representing this format.
     */
    toJSON(): object {
        return {
            attributes: this.attributes.map(a => ({ ...a })),
            stride: this.stride,
            instanceDivisors: Array.from(this.instanceDivisors.entries())
        };
    }

    /**
     * Deserialize a format from a JSON object.
     * @param data - Object produced by toJSON.
     * @returns A new VertexFormat instance.
     * @throws {TypeError} If data is malformed.
     */
    static fromJSON(data: any): VertexFormat {
        if (!data || typeof data !== 'object') {
            throw new TypeError('Invalid data: expected an object');
        }
        const fmt = new VertexFormat();
        if (Array.isArray(data.attributes)) {
            for (const a of data.attributes) {
                if (
                    typeof a?.name === 'string' &&
                    typeof a?.type === 'string' &&
                    Number.isInteger(a?.components) &&
                    typeof a?.normalized === 'boolean'
                ) {
                    fmt.addAttribute(a.name, a.type as DataType, a.components, a.normalized);
                } else {
                    throw new TypeError('Malformed attribute in JSON');
                }
            }
        }
        if (Array.isArray(data.instanceDivisors)) {
            for (const [name, divisor] of data.instanceDivisors) {
                if (typeof name === 'string' && Number.isInteger(divisor)) {
                    fmt.setInstanceDivisor(name, divisor);
                }
            }
        }
        return fmt;
    }
}
