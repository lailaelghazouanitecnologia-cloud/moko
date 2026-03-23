import { WebglGraphicsDevice } from './WebglGraphicsDevice';

export class Shader {
    private programID: WebGLProgram | null = null;
    private vertShaderID: WebGLShader | null = null;
    private fragShaderID: WebGLShader | null = null;
    private compiled: boolean = false;
    private gl: WebGLRenderingContext;

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
    }

    compile(vertexSource: string, fragmentSource: string): boolean {
        const gl = this.gl;

        this.vertShaderID = gl.createShader(gl.VERTEX_SHADER);
        if (!this.vertShaderID) return false;
        gl.shaderSource(this.vertShaderID, vertexSource);
        gl.compileShader(this.vertShaderID);
        if (!gl.getShaderParameter(this.vertShaderID, gl.COMPILE_STATUS)) {
            console.error('Vertex shader compile error:', gl.getShaderInfoLog(this.vertShaderID));
            gl.deleteShader(this.vertShaderID);
            this.vertShaderID = null;
            return false;
        }

        this.fragShaderID = gl.createShader(gl.FRAGMENT_SHADER);
        if (!this.fragShaderID) return false;
        gl.shaderSource(this.fragShaderID, fragmentSource);
        gl.compileShader(this.fragShaderID);
        if (!gl.getShaderParameter(this.fragShaderID, gl.COMPILE_STATUS)) {
            console.error('Fragment shader compile error:', gl.getShaderInfoLog(this.fragShaderID));
            gl.deleteShader(this.fragShaderID);
            this.fragShaderID = null;
            return false;
        }

        this.programID = gl.createProgram();
        if (!this.programID) return false;
        gl.attachShader(this.programID, this.vertShaderID);
        gl.attachShader(this.programID, this.fragShaderID);
        gl.linkProgram(this.programID);
        if (!gl.getProgramParameter(this.programID, gl.LINK_STATUS)) {
            console.error('Shader program link error:', gl.getProgramInfoLog(this.programID));
            gl.deleteProgram(this.programID);
            this.programID = null;
            return false;
        }

        this.compiled = true;
        return true;
    }

    enable(): void {
        if (this.compiled && this.programID) {
            this.gl.useProgram(this.programID);
        }
    }

    disable(): void {
        this.gl.useProgram(null);
    }
}
