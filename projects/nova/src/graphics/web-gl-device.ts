import { GraphicsDevice } from './graphics-device';
import { VertexFormat } from './vertex-format';
import { VertexBuffer } from './vertex-buffer';
import { IndexBuffer } from './index-buffer';
import { Shader } from './shader';
import { Texture } from './texture';
import { RenderTarget } from './render-target';
import { Material } from './material';
import { Mesh } from './mesh';
import { MeshInstance } from './mesh-instance';
import { ScopeSpace } from './scope-space';

export class WebGLDevice extends GraphicsDevice {
    gl: WebGLRenderingContext;
    canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        this.gl = gl;
    }

    createShader(vertexSource: string, fragmentSource: string): Shader {
        const gl = this.gl;
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        if (!vertexShader) throw new Error('Failed to create vertex shader');
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(vertexShader);
            gl.deleteShader(vertexShader);
            throw new Error(`Vertex shader compilation error: ${info}`);
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fragmentShader) throw new Error('Failed to create fragment shader');
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(fragmentShader);
            gl.deleteShader(fragmentShader);
            gl.deleteShader(vertexShader);
            throw new Error(`Fragment shader compilation error: ${info}`);
        }

        const program = gl.createProgram();
        if (!program) throw new Error('Failed to create shader program');
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            throw new Error(`Shader program linking error: ${info}`);
        }

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        const shader = new Shader();
        (shader as any).program = program;
        return shader;
    }

    createProgram(): WebGLProgram {
        const program = this.gl.createProgram();
        if (!program) throw new Error('Failed to create program');
        return program;
    }

    createBuffer(): WebGLBuffer {
        const buffer = this.gl.createBuffer();
        if (!buffer) throw new Error('Failed to create buffer');
        return buffer;
    }

    createTexture(): WebGLTexture {
        const texture = this.gl.createTexture();
        if (!texture) throw new Error('Failed to create texture');
        return texture;
    }

    viewport(x: number, y: number, width: number, height: number): void {
        this.gl.viewport(x, y, width, height);
    }

    clear(mask: number): void {
        this.gl.clear(mask);
    }

    drawArrays(mode: number, first: number, count: number): void {
        this.gl.drawArrays(mode, first, count);
    }

    drawElements(mode: number, count: number, type: number, offset: number): void {
        this.gl.drawElements(mode, count, type, offset);
    }

    enable(cap: number): void {
        this.gl.enable(cap);
    }

    disable(cap: number): void {
        this.gl.disable(cap);
    }

    blendFunc(sfactor: number, dfactor: number): void {
        this.gl.blendFunc(sfactor, dfactor);
    }

    depthFunc(func: number): void {
        this.gl.depthFunc(func);
    }
}
