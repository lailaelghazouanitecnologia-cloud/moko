import { WebGLDevice } from './web-gl-device';

export class Shader {
    private programID: WebGLProgram | null = null;
    private vertShaderID: WebGLShader | null = null;
    private fragShaderID: WebGLShader | null = null;
    private compiled: boolean = false;
    private gl: WebGLRenderingContext;

    constructor(vertexSrc: string, fragmentSrc: string, device: WebGLDevice) {
        this.gl = device.getGl();
        this.vertShaderID = this.compileShader(vertexSrc, this.gl.VERTEX_SHADER);
        this.fragShaderID = this.compileShader(fragmentSrc, this.gl.FRAGMENT_SHADER);
        this.programID = this.gl.createProgram();
        if (!this.vertShaderID || !this.fragShaderID || !this.programID) {
            throw new Error('Failed to create shader objects');
        }
        this.gl.attachShader(this.programID, this.vertShaderID);
        this.gl.attachShader(this.programID, this.fragShaderID);
        this.compile();
    }

    private compileShader(source: string, type: number): WebGLShader {
        const shader = this.gl.createShader(type);
        if (!shader) {
            throw new Error('Failed to create shader');
        }
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Shader compile error: ${info}`);
        }
        return shader;
    }

    compile(): void {
        if (!this.programID) return;
        this.gl.linkProgram(this.programID);
        if (!this.gl.getProgramParameter(this.programID, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(this.programID);
            throw new Error(`Shader program link error: ${info}`);
        }
        this.compiled = true;
    }

    enable(): void {
        if (this.programID && this.compiled) {
            this.gl.useProgram(this.programID);
        }
    }

    disable(): void {
        this.gl.useProgram(null);
    }

    delete(): void {
        if (this.vertShaderID) {
            this.gl.deleteShader(this.vertShaderID);
            this.vertShaderID = null;
        }
        if (this.fragShaderID) {
            this.gl.deleteShader(this.fragShaderID);
            this.fragShaderID = null;
        }
        if (this.programID) {
            this.gl.deleteProgram(this.programID);
            this.programID = null;
        }
        this.compiled = false;
    }
}
