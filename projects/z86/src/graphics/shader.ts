import { WebGLDevice } from './web-gl-device';

export class Shader {
    programID: WebGLProgram | null = null;
    vertShaderID: WebGLShader | null = null;
    fragShaderID: WebGLShader | null = null;
    compiled: boolean = false;

    constructor(
        private gl: WebGLRenderingContext,
        private vertexSource: string,
        private fragmentSource: string
    ) {}

    compile(): boolean {
        const gl = this.gl;

        const vertShader = gl.createShader(gl.VERTEX_SHADER);
        if (!vertShader) return false;
        gl.shaderSource(vertShader, this.vertexSource);
        gl.compileShader(vertShader);
        if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader compile error:', gl.getShaderInfoLog(vertShader));
            gl.deleteShader(vertShader);
            return false;
        }

        const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fragShader) {
            gl.deleteShader(vertShader);
            return false;
        }
        gl.shaderSource(fragShader, this.fragmentSource);
        gl.compileShader(fragShader);
        if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader compile error:', gl.getShaderInfoLog(fragShader));
            gl.deleteShader(vertShader);
            gl.deleteShader(fragShader);
            return false;
        }

        const program = gl.createProgram();
        if (!program) {
            gl.deleteShader(vertShader);
            gl.deleteShader(fragShader);
            return false;
        }
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Shader program link error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            gl.deleteShader(vertShader);
            gl.deleteShader(fragShader);
            return false;
        }

        this.programID = program;
        this.vertShaderID = vertShader;
        this.fragShaderID = fragShader;
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
