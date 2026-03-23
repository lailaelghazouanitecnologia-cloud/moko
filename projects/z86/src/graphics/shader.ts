import { WebGLDevice } from './web-gl-device';

export class Shader {
    programID: WebGLProgram | null = null;
    vertShaderID: WebGLShader | null = null;
    fragShaderID: WebGLShader | null = null;
    compiled: boolean = false;

    constructor(private gl: WebGLRenderingContext) {}

    compile(vertexSource: string, fragmentSource: string): void {
        const gl = this.gl;

        const vertShader = gl.createShader(gl.VERTEX_SHADER);
        if (!vertShader) throw new Error('Failed to create vertex shader');
        gl.shaderSource(vertShader, vertexSource);
        gl.compileShader(vertShader);
        if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(vertShader);
            gl.deleteShader(vertShader);
            throw new Error(`Vertex shader compilation error: ${info}`);
        }

        const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fragShader) throw new Error('Failed to create fragment shader');
        gl.shaderSource(fragShader, fragmentSource);
        gl.compileShader(fragShader);
        if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(fragShader);
            gl.deleteShader(fragShader);
            gl.deleteShader(vertShader);
            throw new Error(`Fragment shader compilation error: ${info}`);
        }

        const program = gl.createProgram();
        if (!program) throw new Error('Failed to create shader program');
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            gl.deleteShader(vertShader);
            gl.deleteShader(fragShader);
            throw new Error(`Shader program linking error: ${info}`);
        }

        this.programID = program;
        this.vertShaderID = vertShader;
        this.fragShaderID = fragShader;
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
}
