import { Shader } from './shader';

/**
 * Represents a material that defines render state and parameters for rendering objects.
 * Materials combine a shader with parameter values to control the visual appearance of rendered geometry.
 */
export class Material {
    private shader: Shader;
    private parameters: Map<string, any>;

    /**
     * Creates a new Material instance with the specified shader.
     * @param shader - The shader to use for rendering
     * @throws {Error} If shader is null or undefined
     */
    constructor(shader: Shader) {
        if (!shader) {
            throw new Error('Shader cannot be null or undefined');
        }
        this.shader = shader;
        this.parameters = new Map<string, any>();
    }

    /**
     * Sets a parameter value for the material.
     * @param name - The name of the parameter to set
     * @param value - The value to set for the parameter
     * @throws {Error} If name is null, undefined, or empty
     */
    setParameter(name: string, value: any): void {
        if (!name || typeof name !== 'string') {
            throw new Error('Parameter name must be a non-empty string');
        }
        this.parameters.set(name, value);
    }

    /**
     * Gets a parameter value from the material.
     * @param name - The name of the parameter to retrieve
     * @returns The parameter value, or undefined if not found
     * @throws {Error} If name is null, undefined, or empty
     */
    getParameter(name: string): any {
        if (!name || typeof name !== 'string') {
            throw new Error('Parameter name must be a non-empty string');
        }
        return this.parameters.get(name);
    }

    /**
     * Gets the shader associated with this material.
     * @returns The shader
     */
    getShader(): Shader {
        return this.shader;
    }

    /**
     * Sets the shader for this material.
     * @param shader - The new shader to use
     * @throws {Error} If shader is null or undefined
     */
    setShader(shader: Shader): void {
        if (!shader) {
            throw new Error('Shader cannot be null or undefined');
        }
        this.shader = shader;
    }

    /**
     * Checks if a parameter exists in the material.
     * @param name - The name of the parameter to check
     * @returns True if the parameter exists, false otherwise
     * @throws {Error} If name is null, undefined, or empty
     */
    hasParameter(name: string): boolean {
        if (!name || typeof name !== 'string') {
            throw new Error('Parameter name must be a non-empty string');
        }
        return this.parameters.has(name);
    }

    /**
     * Removes a parameter from the material.
     * @param name - The name of the parameter to remove
     * @returns True if the parameter was removed, false if it didn't exist
     * @throws {Error} If name is null, undefined, or empty
     */
    removeParameter(name: string): boolean {
        if (!name || typeof name !== 'string') {
            throw new Error('Parameter name must be a non-empty string');
        }
        return this.parameters.delete(name);
    }

    /**
     * Gets all parameter names in the material.
     * @returns An array of parameter names
     */
    getParameterNames(): string[] {
        return Array.from(this.parameters.keys());
    }

    /**
     * Gets all parameter values in the material.
     * @returns An array of parameter values
     */
    getParameterValues(): any[] {
        return Array.from(this.parameters.values());
    }

    /**
     * Gets the number of parameters in the material.
     * @returns The number of parameters
     */
    getParameterCount(): number {
        return this.parameters.size;
    }

    /**
     * Clears all parameters from the material.
     */
    clearParameters(): void {
        this.parameters.clear();
    }

    /**
     * Creates a copy of this material with the same shader and parameter values.
     * @returns A new material instance with the same properties
     */
    clone(): Material {
        const newMaterial = new Material(this.shader);
        for (const [key, value] of this.parameters) {
            newMaterial.setParameter(key, value);
        }
        return newMaterial;
    }

    /**
     * Checks if this material is equivalent to another material.
     * @param other - The other material to compare with
     * @returns True if the materials are equivalent, false otherwise
     */
    equals(other: Material): boolean {
        if (!other || !(other instanceof Material)) {
            return false;
        }

        if (this.shader !== other.shader) {
            return false;
        }

        if (this.parameters.size !== other.parameters.size) {
            return false;
        }

        for (const [key, value] of this.parameters) {
            if (other.getParameter(key) !== value) {
                return false;
            }
        }

        return true;
    }

    /**
     * Gets a string representation of the material.
     * @returns A string representation of the material
     */
    toString(): string {
        const paramStrings = this.getParameterNames().map(name => `${name}=${this.getParameter(name)}`);
        return `Material[shader=${this.shader}, parameters={${paramStrings.join(', ')}}]`;
    }
}
