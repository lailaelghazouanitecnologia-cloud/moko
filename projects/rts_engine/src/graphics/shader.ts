/**
 * Represents a uniform variable within a shader program.
 */
export interface Uniform {
    /** The name of the uniform as declared in the shader source. */
    readonly name: string;
    /** The WebGL location handle; may be `null` if the uniform is inactive. */
    readonly location: WebGLUniformLocation | null;
    /** The WebGL data-type enum (e.g. `FLOAT_VEC4`, `SAMPLER_2D`). */
    readonly type: number;
    /** The array size (1 for scalars, >1 for arrays). */
    readonly size: number;
}

/**
 * GPU shader program abstraction.
 * Provides type-safe access to uniform variables.
 */
export interface Shader {
    /**
     * Retrieves a uniform descriptor by name.
     * @param name - The exact name of the uniform as declared in the shader source.
     * @returns The uniform descriptor.
     * @throws {Error} If `name` is empty or the uniform does not exist.
     */
    getUniform(name: string): Uniform;

    /**
     * Sets the value of a uniform variable.
     * @param uniform - The uniform descriptor obtained via `getUniform`.
     * @param value - The value to upload; type must match the uniform's WebGL type.
     * @throws {Error} If `uniform` is invalid, `value` is of the wrong type,
     *         or the underlying WebGL call fails.
     */
    setUniform(uniform: Uniform, value: any): void;
}
