import { GraphicsDevice } from './GraphicsDevice';

export class Shader {
    private program: WebGLProgram | null = null;
    private vertexShader: WebGLShader | null = null;
    private fragmentShader: WebGLShader | null = null;
    private uniforms: Map<string, WebGLUniformLocation> = new Map();
    private attributes: Map<string, number> = new Map();
    private compiled: boolean = false;
    private gl: WebGL2RenderingContext;

    constructor(private device: GraphicsDevice) {
        this.gl = device.getContext();
    }

    compile(vertexSource: string, fragmentSource: string): boolean {
        if (this.compiled) {
            this.destroy();
        }

        this.vertexShader = this.createShader(vertexSource, this.gl.VERTEX_SHADER);
        if (!this.vertexShader) return false;

        this.fragmentShader = this.createShader(fragmentSource, this.gl.FRAGMENT_SHADER);
        if (!this.fragmentShader) return false;

        this.program = this.gl.createProgram();
        if (!this.program) return false;

        this.gl.attachShader(this.program, this.vertexShader);
        this.gl.attachShader(this.program, this.fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(this.program);
            console.error(`Shader program linking failed: ${info}`);
            this.destroy();
            return false;
        }

        this.compiled = true;
        this.cacheUniforms();
        this.cacheAttributes();
        return true;
    }

    bind(): void {
        if (!this.compiled || !this.program) return;
        this.gl.useProgram(this.program);
    }

    unbind(): void {
        this.gl.useProgram(null);
    }

    getUniform(name: string): WebGLUniformLocation {
        const location = this.uniforms.get(name);
        if (!location) {
            throw new Error(`Uniform '${name}' not found in shader`);
        }
        return location;
    }

    getAttribute(name: string): number {
        const location = this.attributes.get(name);
        if (location === undefined) {
            throw new Error(`Attribute '${name}' not found in shader`);
        }
        return location;
    }

    setUniform1f(name: string, value: number): void {
        const location = this.getUniform(name);
        this.gl.uniform1f(location, value);
    }

    setUniform2f(name: string, x: number, y: number): void {
        const location = this.getUniform(name);
        this.gl.uniform2f(location, x, y);
    }

    setUniform3f(name: string, x: number, y: number, z: number): void {
        const location = this.getUniform(name);
        this.gl.uniform3f(location, x, y, z);
    }

    setUniform4f(name: string, x: number, y: number, z: number, w: number): void {
        const location = this.getUniform(name);
        this.gl.uniform4f(location, x, y, z, w);
    }

    setUniformMatrix4fv(name: string, matrix: Float32Array): void {
        const location = this.getUniform(name);
        this.gl.uniformMatrix4fv(location, false, matrix);
    }

    setUniform1i(name: string, value: number): void {
        const location = this.getUniform(name);
        this.gl.uniform1i(location, value);
    }

    destroy(): void {
        if (this.program) {
            this.gl.deleteProgram(this.program);
            this.program = null;
        }
        if (this.vertexShader) {
            this.gl.deleteShader(this.vertexShader);
            this.vertexShader = null;
        }
        if (this.fragmentShader) {
            this.gl.deleteShader(this.fragmentShader);
            this.fragmentShader = null;
        }
        this.uniforms.clear();
        this.attributes.clear();
        this.compiled = false;
    }

    private createShader(source: string, type: number): WebGLShader | null {
        const shader = this.gl.createShader(type);
        if (!shader) return null;

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            console.error(`Shader compilation failed: ${info}`);
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    private cacheUniforms(): void {
        if (!this.program) return;
        const numUniforms = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = this.gl.getActiveUniform(this.program, i);
            if (info) {
                const location = this.gl.getUniformLocation(this.program, info.name);
                if (location) {
                    this.uniforms.set(info.name, location);
                }
            }
        }
    }

    private cacheAttributes(): void {
        if (!this.program) return;
        const numAttributes = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const info = this.gl.getActiveAttrib(this.program, i);
            if (info) {
                const location = this.gl.getAttribLocation(this.program, info.name);
                this.attributes.set(info.name, location);
            }
        }
    }

    static fromSource(vertexSource: string, fragmentSource: string): Shader {
        const device = GraphicsDevice.getInstance();
        const shader = new Shader(device);
        if (!shader.compile(vertexSource, fragmentSource)) {
            throw new Error('Failed to compile shader from source');
        }
        return shader;
    }

    static async fromFiles(vertexPath: string, fragmentPath: string): Promise<Shader> {
        const [vertexResponse, fragmentResponse] = await Promise.all([
            fetch(vertexPath),
            fetch(fragmentPath)
        ]);
        
        if (!vertexResponse.ok || !fragmentResponse.ok) {
            throw new Error('Failed to load shader files');
        }

        const vertexSource = await vertexResponse.text();
        const fragmentSource = await fragmentResponse.text();
        
        return Shader.fromSource(vertexSource, fragmentSource);
    }
}
