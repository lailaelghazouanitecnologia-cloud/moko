import { GraphicsDevice } from './graphicsdevice';
import { VertexFormat } from './vertexformat';
import { VertexBuffer } from './vertexbuffer';
import { IndexBuffer } from './indexbuffer';
import { Shader } from './shader';
import { Texture } from './texture';
import { RenderTarget } from './rendertarget';
import { Material } from './material';
import { Mesh } from './mesh';
import { MeshInstance } from './meshinstance';
import { ScopeSpace } from './scopespace';

export class WebGLDevice extends GraphicsDevice {
    private gl: WebGLRenderingContext;
    private canvas: HTMLCanvasElement;
    private scopeSpace: ScopeSpace;
    private programs: Map<string, WebGLProgram>;
    private buffers: Map<string, WebGLBuffer>;
    private textures: Map<string, WebGLTexture>;
    private framebuffers: Map<string, WebGLFramebuffer>;
    private renderbuffers: Map<string, WebGLRenderbuffer>;
    private currentProgram: WebGLProgram | null;
    private currentFramebuffer: WebGLFramebuffer | null;
    private currentViewport: { x: number; y: number; width: number; height: number };

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        this.gl = gl as WebGLRenderingContext;
        this.scopeSpace = new ScopeSpace();
        this.programs = new Map();
        this.buffers = new Map();
        this.textures = new Map();
        this.framebuffers = new Map();
        this.renderbuffers = new Map();
        this.currentProgram = null;
        this.currentFramebuffer = null;
        this.currentViewport = { x: 0, y: 0, width: canvas.width, height: canvas.height };

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.frontFace(this.gl.CCW);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    createVertexBuffer(vertices: Float32Array, format: VertexFormat): VertexBuffer {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        if (!buffer) {
            throw new Error('Failed to create vertex buffer');
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const vb = new VertexBuffer();
        vb.buffer = buffer;
        vb.format = format;
        vb.numVertices = vertices.length / format.stride;
        this.buffers.set(buffer.toString(), buffer);
        return vb;
    }

    createIndexBuffer(indices: Uint16Array): IndexBuffer {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        if (!buffer) {
            throw new Error('Failed to create index buffer');
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        const ib = new IndexBuffer();
        ib.buffer = buffer;
        ib.numIndices = indices.length;
        this.buffers.set(buffer.toString(), buffer);
        return ib;
    }

    createShader(vsSource: string, fsSource: string): Shader {
        const gl = this.gl;
        const vs = this.compileShader(vsSource, gl.VERTEX_SHADER);
        const fs = this.compileShader(fsSource, gl.FRAGMENT_SHADER);
        const program = gl.createProgram();
        if (!program) {
            throw new Error('Failed to create shader program');
        }
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            throw new Error(`Shader program linking failed: ${info}`);
        }
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        const shader = new Shader();
        shader.program = program;
        this.programs.set(program.toString(), program);
        return shader;
    }

    private compileShader(source: string, type: number): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type);
        if (!shader) {
            throw new Error('Failed to create shader');
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${info}`);
        }
        return shader;
    }

    createTexture(width: number, height: number, format: number, data: Uint8Array | null): Texture {
        const gl = this.gl;
        const texture = gl.createTexture();
        if (!texture) {
            throw new Error('Failed to create texture');
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        const tex = new Texture();
        tex.texture = texture;
        tex.width = width;
        tex.height = height;
        tex.format = format;
        this.textures.set(texture.toString(), texture);
        return tex;
    }

    createRenderTarget(width: number, height: number): RenderTarget {
        const gl = this.gl;
        const framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            throw new Error('Failed to create framebuffer');
        }
        const renderbuffer = gl.createRenderbuffer();
        if (!renderbuffer) {
            throw new Error('Failed to create renderbuffer');
        }
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
        const rt = new RenderTarget();
        rt.framebuffer = framebuffer;
        rt.renderbuffer = renderbuffer;
        rt.width = width;
        rt.height = height;
        this.framebuffers.set(framebuffer.toString(), framebuffer);
        this.renderbuffers.set(renderbuffer.toString(), renderbuffer);
        return rt;
    }

    setRenderTarget(renderTarget: RenderTarget | null): void {
        const gl = this.gl;
        if (renderTarget) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget.framebuffer);
            gl.viewport(0, 0, renderTarget.width, renderTarget.height);
            this.currentFramebuffer = renderTarget.framebuffer;
            this.currentViewport = { x: 0, y: 0, width: renderTarget.width, height: renderTarget.height };
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            this.currentFramebuffer = null;
            this.currentViewport = { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height };
        }
    }

    clear(color: { r: number; g: number; b: number; a: number }, depth: number, flags: number): void {
        const gl = this.gl;
        let mask = 0;
        if (flags & 1) {
            gl.clearColor(color.r, color.g, color.b, color.a);
            mask |= gl.COLOR_BUFFER_BIT;
        }
        if (flags & 2) {
            gl.clearDepth(depth);
            mask |= gl.DEPTH_BUFFER_BIT;
        }
        gl.clear(mask);
    }

    draw(meshInstance: MeshInstance): void {
        const gl = this.gl;
        const mesh = meshInstance.mesh;
        const material = meshInstance.material;
        const shader = material.shader;
        if (!shader || !shader.program) {
            throw new Error('Invalid shader');
        }
        if (this.currentProgram !== shader.program) {
            gl.useProgram(shader.program);
            this.currentProgram = shader.program;
        }
        this.applyMaterial(material);
        this.bindMesh(mesh);
        gl.drawElements(gl.TRIANGLES, mesh.indexBuffer.numIndices, gl.UNSIGNED_SHORT, 0);
    }

    private applyMaterial(material: Material): void {
        const gl = this.gl;
        const shader = material.shader;
        if (!shader || !shader.program) return;
        for (const [name, value] of material.parameters) {
            const location = gl.getUniformLocation(shader.program, name);
            if (location === null) continue;
            if (typeof value === 'number') {
                gl.uniform1f(location, value);
            } else if (Array.isArray(value)) {
                if (value.length === 2) {
                    gl.uniform2fv(location, value);
                } else if (value.length === 3) {
                    gl.uniform3fv(location, value);
                } else if (value.length === 4) {
                    gl.uniform4fv(location, value);
                }
            } else if (value && typeof value === 'object' && 'texture' in value) {
                const texture = value as Texture;
                const unit = material.getTextureUnit(name);
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.bindTexture(gl.TEXTURE_2D, texture.texture);
                gl.uniform1i(location, unit);
            }
        }
    }

    private bindMesh(mesh: Mesh): void {
        const gl = this.gl;
        const vb = mesh.vertexBuffer;
        const ib = mesh.indexBuffer;
        const format = vb.format;
        gl.bindBuffer(gl.ARRAY_BUFFER, vb.buffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib.buffer);
        const shader = mesh.material.shader;
        if (!shader || !shader.program) return;
        let offset = 0;
        for (const element of format.elements) {
            const location = gl.getAttribLocation(shader.program, element.name);
            if (location === -1) continue;
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, element.numComponents, gl.FLOAT, false, format.stride * 4, offset * 4);
            offset += element.numComponents;
        }
    }

    present(): void {
        // WebGL presents automatically after draw calls when canvas is displayed
    }

    destroy(): void {
        const gl = this.gl;
        for (const buffer of this.buffers.values()) {
            gl.deleteBuffer(buffer);
        }
        for (const texture of this.textures.values()) {
            gl.deleteTexture(texture);
        }
        for (const program of this.programs.values()) {
            gl.deleteProgram(program);
        }
        for (const framebuffer of this.framebuffers.values()) {
            gl.deleteFramebuffer(framebuffer);
        }
        for (const renderbuffer of this.renderbuffers.values()) {
            gl.deleteRenderbuffer(renderbuffer);
        }
        this.buffers.clear();
        this.textures.clear();
        this.programs.clear();
        this.framebuffers.clear();
        this.renderbuffers.clear();
    }

    getWidth(): number {
        return this.canvas.width;
    }

    getHeight(): number {
        return this.canvas.height;
    }

    getViewport(): { x: number; y: number; width: number; height: number } {
        return this.currentViewport;
    }
}
