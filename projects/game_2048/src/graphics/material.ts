import { Shader } from './shader';
import { Texture } from './texture';
import { GraphicsDevice } from './graphics-device';

/**
 * GPU render state & parameters container.
 * Manages shader, textures, uniforms and render states for a single draw call.
 */
export class Material {
    shader: Shader;
    textures: Map<string, Texture>;
    parameters: Map<string, number[]>;
    cull: boolean;
    blend: boolean;
    depthWrite: boolean;
    depthTest: boolean;

    constructor() {
        this.shader = null as any;
        this.textures = new Map<string, Texture>();
        this.parameters = new Map<string, number[]>();
        this.cull = true;
        this.blend = false;
        this.depthWrite = true;
        this.depthTest = true;
    }

    /**
     * Replace the shader used by this material.
     * @param shader - The new shader to use.
     * @throws {TypeError} If shader is null or undefined.
     */
    setShader(shader: Shader): void {
        if (!shader) {
            throw new TypeError('Material.setShader: shader cannot be null or undefined');
        }
        this.shader = shader;
    }

    /**
     * Bind a texture to a named sampler uniform.
     * @param name - The uniform name in the shader.
     * @param texture - The texture to bind.
     * @throws {TypeError} If name is not a non-empty string or texture is invalid.
     */
    setTexture(name: string, texture: Texture): void {
        this.validateString(name, 'setTexture', 'name');
        if (!texture) {
            throw new TypeError('Material.setTexture: texture cannot be null or undefined');
        }
        this.textures.set(name, texture);
    }

    /**
     * Set a uniform parameter.
     * @param name - The uniform name in the shader.
     * @param value - The value to assign (must be a non-empty number array).
     * @throws {TypeError} If name is invalid or value is not a non-empty number array.
     */
    setParameter(name: string, value: number[]): void {
        this.validateString(name, 'setParameter', 'name');
        if (!Array.isArray(value) || value.length === 0) {
            throw new TypeError('Material.setParameter: value must be a non-empty number array');
        }
        this.parameters.set(name, value);
    }

    /**
     * Toggle back-face culling.
     * @param enabled - True to enable culling, false to disable.
     */
    setCull(enabled: boolean): void {
        this.cull = Boolean(enabled);
    }

    /**
     * Toggle alpha blending.
     * @param enabled - True to enable blending, false to disable.
     */
    setBlend(enabled: boolean): void {
        this.blend = Boolean(enabled);
    }

    /**
     * Toggle depth buffer writing.
     * @param enabled - True to enable writing, false to disable.
     */
    setDepthWrite(enabled: boolean): void {
        this.depthWrite = Boolean(enabled);
    }

    /**
     * Toggle depth buffer testing.
     * @param enabled - True to enable testing, false to disable.
     */
    setDepthTest(enabled: boolean): void {
        this.depthTest = Boolean(enabled);
    }

    /**
     * Apply this material’s state and parameters to the GPU.
     * @param device - The graphics device context.
     * @throws {TypeError} If device is null or undefined.
     * @throws {Error} If the underlying WebGL calls fail.
     */
    apply(device: GraphicsDevice): void {
        if (!device) {
            throw new TypeError('Material.apply: device cannot be null or undefined');
        }
        const gl = (device as any).gl;
        if (!gl) {
            throw new Error('Material.apply: invalid GraphicsDevice, missing WebGL context');
        }

        if (this.shader) {
            this.shader.bind();
        }

        let textureUnit = 0;
        this.textures.forEach((texture, name) => {
            texture.bind(textureUnit);
            if (this.shader) {
                const location = this.shader.uniforms.get(name);
                if (location !== undefined) {
                    gl.uniform1i(location, textureUnit);
                }
            }
            textureUnit++;
        });

        this.parameters.forEach((value, name) => {
            if (this.shader) {
                const location = this.shader.uniforms.get(name);
                if (location !== undefined) {
                    const uniformInfo = gl.getActiveUniform(this.shader.handle, location);
                    if (!uniformInfo) {
                        console.warn(`Material.apply: uniform "${name}" not found in shader`);
                        return;
                    }
                    const uniformType = uniformInfo.type;
                    if (uniformType === gl.FLOAT_VEC4) {
                        gl.uniform4fv(location, value);
                    } else if (uniformType === gl.FLOAT_VEC3) {
                        gl.uniform3fv(location, value);
                    } else if (uniformType === gl.FLOAT_VEC2) {
                        gl.uniform2fv(location, value);
                    } else if (uniformType === gl.FLOAT) {
                        gl.uniform1f(location, value[0]);
                    } else {
                        console.warn(`Material.apply: unsupported uniform type for "${name}"`);
                    }
                }
            }
        });

        if (this.cull) {
            gl.enable(gl.CULL_FACE);
        } else {
            gl.disable(gl.CULL_FACE);
        }

        if (this.blend) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        } else {
            gl.disable(gl.BLEND);
        }

        gl.depthMask(this.depthWrite);

        if (this.depthTest) {
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }
    }

    /**
     * Create a deep clone of this material.
     * @returns A new Material instance with copied state.
     */
    clone(): Material {
        const cloned = new Material();
        cloned.shader = this.shader;
        cloned.cull = this.cull;
        cloned.blend = this.blend;
        cloned.depthWrite = this.depthWrite;
        cloned.depthTest = this.depthTest;

        this.textures.forEach((texture, name) => {
            cloned.textures.set(name, texture);
        });

        this.parameters.forEach((value, name) => {
            cloned.parameters.set(name, value.slice());
        });

        return cloned;
    }

    /**
     * Validate that a string parameter is non-empty.
     * @param str - The string to validate.
     * @param method - The method name for error messages.
     * @param param - The parameter name for error messages.
     * @throws {TypeError} If validation fails.
     */
    private validateString(str: string, method: string, param: string): void {
        if (typeof str !== 'string' || str.length === 0) {
            throw new TypeError(`Material.${method}: ${param} must be a non-empty string`);
        }
    }
}
