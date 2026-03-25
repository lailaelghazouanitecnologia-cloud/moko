import { GraphicsDevice } from './graphics-device';
import { WebGLDevice } from './web-gl-device';

/**
 * GPU shader program wrapper.
 * Compiles, links, and manages vertex/fragment shader pairs.
 */
export class Shader {
    device: GraphicsDevice;
    handle: WebGLProgram;
    uniforms: Map<string, WebGLUniformLocation>;
    attributes: Map<string, number>;

    /**
     * Creates a new Shader instance.
     * @param device - The graphics device used to create WebGL resources.
     */
    constructor(device: GraphicsDevice) {
        if (!device) {
            throw new Error('Shader constructor requires a valid GraphicsDevice');
        }
        this.device = device;
        this.handle = null as any;
        this.uniforms = new Map<string, WebGLUniformLocation>();
        this.attributes = new Map<string, number>();
    }

    /**
     * Compiles and links vertex and fragment shaders into a GPU program.
     * @param vertexSrc - GLSL source for the vertex shader.
     * @param fragmentSrc - GLSL source for the fragment shader.
     * @returns true if compilation and linking succeeded, false otherwise.
     */
    compile(vertexSrc: string, fragmentSrc: string): boolean {
        if (typeof vertexSrc !== 'string' || !vertexSrc.trim()) {
            console.error('Shader.compile: vertexSrc must be a non-empty string');
            return false;
        }
        if (typeof fragmentSrc !== 'string' || !fragmentSrc.trim()) {
            console.error('Shader.compile: fragmentSrc must be a non-empty string');
            return false;
        }

        const gl = (this.device as WebGLDevice).gl;

        const vertexShader = this.createAndCompileShader(gl.VERTEX_SHADER, vertexSrc);
        if (!vertexShader) return false;

        const fragmentShader = this.createAndCompileShader(gl.FRAGMENT_SHADER, fragmentSrc);
        if (!fragmentShader) {
            gl.deleteShader(vertexShader);
            return false;
        }

        this.handle = gl.createProgram();
        if (!this.handle) {
            console.error('Shader.compile: failed to create WebGLProgram');
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return false;
        }

        gl.attachShader(this.handle, vertexShader);
        gl.attachShader(this.handle, fragmentShader);
        gl.linkProgram(this.handle);

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        if (!gl.getProgramParameter(this.handle, gl.LINK_STATUS)) {
            console.error('Shader program linking error:', gl.getProgramInfoLog(this.handle));
            gl.deleteProgram(this.handle);
            this.handle = null as any;
            return false;
        }

        this.extractUniforms(gl);
        this.extractAttributes(gl);

        return true;
    }

    /**
     * Activates this shader program on the GPU.
     */
    bind(): void {
        if (!this.handle) {
            console.warn('Shader.bind: program not compiled');
            return;
        }
        const gl = (this.device as WebGLDevice).gl;
        gl.useProgram(this.handle);
    }

    /**
     * Deactivates the current shader program.
     */
    unbind(): void {
        const gl = (this.device as WebGLDevice).gl;
        gl.useProgram(null);
    }

    /**
     * Updates a uniform variable in the shader.
     * @param name - The name of the uniform.
     * @param value - The new value (number, number[], or Float32Array).
     */
    setUniform(name: string, value: any): void {
        if (typeof name !== 'string' || !name) {
            console.error('Shader.setUniform: name must be a non-empty string');
            return;
        }
        if (!this.handle) {
            console.warn('Shader.setUniform: program not compiled');
            return;
        }
        const gl = (this.device as WebGLDevice).gl;
        const location = this.uniforms.get(name);
        if (location === undefined) {
            console.warn(`Shader.setUniform: uniform "${name}" not found`);
            return;
        }

        if (Array.isArray(value)) {
            switch (value.length) {
                case 1:
                    gl.uniform1f(location, value[0]);
                    break;
                case 2:
                    gl.uniform2fv(location, value);
                    break;
                case 3:
                    gl.uniform3fv(location, value);
                    break;
                case 4:
                    gl.uniform4fv(location, value);
                    break;
                case 9:
                    gl.uniformMatrix3fv(location, false, value);
                    break;
                case 16:
                    gl.uniformMatrix4fv(location, false, value);
                    break;
                default:
                    console.warn(`Shader.setUniform: unsupported array length ${value.length}`);
            }
        } else if (typeof value === 'number') {
            gl.uniform1f(location, value);
        } else if (value instanceof Float32Array) {
            if (value.length === 9) {
                gl.uniformMatrix3fv(location, false, value);
            } else if (value.length === 16) {
                gl.uniformMatrix4fv(location, false, value);
            } else {
                gl.uniform1fv(location, value);
            }
        } else {
            console.warn('Shader.setUniform: unsupported value type');
        }
    }

    /**
     * Retrieves the attribute slot location.
     * @param name - The name of the attribute.
     * @returns The location index, or -1 if not found.
     */
    getAttribLocation(name: string): number {
        if (typeof name !== 'string' || !name) {
            console.error('Shader.getAttribLocation: name must be a non-empty string');
            return -1;
        }
        const location = this.attributes.get(name);
        return location !== undefined ? location : -1;
    }

    /**
     * Releases all GPU resources associated with this shader.
     */
    destroy(): void {
        if (this.handle) {
            const gl = (this.device as WebGLDevice).gl;
            gl.deleteProgram(this.handle);
            this.handle = null as any;
        }
        this.uniforms.clear();
        this.attributes.clear();
    }

    /**
     * Compiles a single shader stage.
     * @param type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER.
     * @param source - GLSL source code.
     * @returns The compiled shader or null on failure.
     */
    private createAndCompileShader(type: number, source: string): WebGLShader | null {
        const gl = (this.device as WebGLDevice).gl;
        const shader = gl.createShader(type);
        if (!shader) {
            console.error('createAndCompileShader: failed to create shader');
            return null;
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const typeName = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
            console.error(`${typeName} shader compilation error:`, gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    /**
     * Populates the uniforms map from the linked program.
     * @param gl - The WebGL context.
     */
    private extractUniforms(gl: WebGLRenderingContext): void {
        const numUniforms = gl.getProgramParameter(this.handle, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = gl.getActiveUniform(this.handle, i);
            if (info) {
                const location = gl.getUniformLocation(this.handle, info.name);
                if (location) {
                    this.uniforms.set(info.name, location);
                }
            }
        }
    }

    /**
     * Populates the attributes map from the linked program.
     * @param gl - The WebGL context.
     */
    private extractAttributes(gl: WebGLRenderingContext): void {
        const numAttributes = gl.getProgramParameter(this.handle, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const info = gl.getActiveAttrib(this.handle, i);
            if (info) {
                const location = gl.getAttribLocation(this.handle, info.name);
                this.attributes.set(info.name, location);
            }
        }
    }
}