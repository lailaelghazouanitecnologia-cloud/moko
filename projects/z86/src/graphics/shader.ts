import { WebGLDevice } from './WebGLDevice';

export class Shader {
    private programID: WebGLProgram | null = null;
    private vertShaderID: WebGLShader | null = null;
    private fragShaderID: WebGLShader | null = null;
    private compiled: boolean = false;
    private gl: WebGLRenderingContext;

    constructor(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
        this.gl = gl;
        this.compile(vertexSource, fragmentSource);
    }

    compile(vertexSource: string, fragmentSource: string): void {
        const gl = this.gl;

        // Create vertex shader
        this.vertShaderID = gl.createShader(gl.VERTEX_SHADER);
        if (!this.vertShaderID) {
            throw new Error('Failed to create vertex shader');
        }
        gl.shaderSource(this.vertShaderID, vertexSource);
        gl.compileShader(this.vertShaderID);
        if (!gl.getShaderParameter(this.vertShaderID, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(this.vertShaderID);
            gl.deleteShader(this.vertShaderID);
            throw new Error(`Vertex shader compilation error: ${info}`);
        }

        // Create fragment shader
        this.fragShaderID = gl.createShader(gl.FRAGMENT_SHADER);
        if (!this.fragShaderID) {
            gl.deleteShader(this.vertShaderID);
            throw new Error('Failed to create fragment shader');
        }
        gl.shaderSource(this.fragShaderID, fragmentSource);
        gl.compileShader(this.fragShaderID);
        if (!gl.getShaderParameter(this.fragShaderID, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(this.fragShaderID);
            gl.deleteShader(this.vertShaderID);
            gl.deleteShader(this.fragShaderID);
            throw new Error(`Fragment shader compilation error: ${info}`);
        }

        // Create program and link shaders
        this.programID = gl.createProgram();
        if (!this.programID) {
            gl.deleteShader(this.vertShaderID);
            gl.deleteShader(this.fragShaderID);
            throw new Error('Failed to create shader program');
        }
        gl.attachShader(this.programID, this.vertShaderID);
        gl.attachShader(this.programID, this.fragShaderID);
        gl.linkProgram(this.programID);

        if (!gl.getProgramParameter(this.programID, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(this.programID);
            gl.deleteShader(this.vertShaderID);
            gl.deleteShader(this.fragShaderID);
            gl.deleteProgram(this.programID);
            throw new Error(`Shader program linking error: ${info}`);
        }

        this.compiled = true;
    }

    enable(): void {
        if (!this.compiled || !this.programID) {
            throw new Error('Shader not compiled');
        }
        this.gl.useProgram(this.programID);
    }

    disable(): void {
        this.gl.useProgram(null);
    }

    getProgramID(): WebGLProgram | null {
        return this.programID;
    }

    isCompiled(): boolean {
        return this.compiled;
    }

    destroy(): void {
        const gl = this.gl;
        if (this.vertShaderID) {
            gl.deleteShader(this.vertShaderID);
            this.vertShaderID = null;
        }
        if (this.fragShaderID) {
            gl.deleteShader(this.fragShaderID);
            this.fragShaderID = null;
        }
        if (this.programID) {
            gl.deleteProgram(this.programID);
            this.programID = null;
        }
        this.compiled = false;
    }
}
