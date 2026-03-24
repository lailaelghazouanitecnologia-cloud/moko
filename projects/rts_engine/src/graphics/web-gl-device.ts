import { RenderTarget, VertexBuffer, IndexBuffer, Texture, Shader, Material, Mesh, VertexFormat, IndexFormat, PixelFormat, PrimitiveType, VertexType, Uniform } from './interfaces';

class WebGLRenderer {
    private gl: WebGL2RenderingContext;
    private maxTextureSize: number;
    private maxVertexAttribs: number;
    private currentRenderTarget: RenderTarget | null = null;

    constructor(canvas: HTMLCanvasElement) {
        const context = canvas.getContext('webgl2');
        if (!context) {
            throw new Error('WebGL2 not supported');
        }
        this.gl = context;

        const maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
        const maxVertexAttribs = this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);

        if (typeof maxTextureSize !== 'number' || typeof maxVertexAttribs !== 'number') {
            throw new Error('Failed to query WebGL limits');
        }

        this.maxTextureSize = maxTextureSize;
        this.maxVertexAttribs = maxVertexAttribs;

        this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
        this.gl.pixelStorei(this.gl.PACK_ALIGNMENT, 1);
    }

    createVertexBuffer(format: VertexFormat, count: number): WebGLVertexBuffer {
        const buffer = this.gl.createBuffer();
        if (!buffer) {
            throw new Error('Failed to create vertex buffer');
        }

        const size = format.getSize() * count;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, size, this.gl.STATIC_DRAW);

        return new WebGLVertexBuffer(this.gl, buffer, format, count);
    }

    createIndexBuffer(format: IndexFormat, count: number): WebGLIndexBuffer {
        const buffer = this.gl.createBuffer();
        if (!buffer) {
            throw new Error('Failed to create index buffer');
        }

        const bytesPerIndex = format === IndexFormat.UInt32 ? 4 : 2;
        const size = count * bytesPerIndex;
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, size, this.gl.STATIC_DRAW);

        return new WebGLIndexBuffer(this.gl, buffer, format, count);
    }

    createTexture(width: number, height: number, format: PixelFormat): WebGLTexture {
        const texture = this.gl.createTexture();
        if (!texture) {
            throw new Error('Failed to create texture');
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.getInternalFormat(format),
            width,
            height,
            0,
            this.getPixelFormat(format),
            this.getPixelType(format),
            null
        );

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        return new WebGLTexture(this.gl, texture, width, height, format);
    }

    createShader(vertexSrc: string, fragmentSrc: string): WebGLShader {
        const vertexShader = this.compileShader(vertexSrc, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentSrc, this.gl.FRAGMENT_SHADER);

        const program = this.gl.createProgram();
        if (!program) {
            throw new Error('Failed to create shader program');
        }

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error(`Shader link error: ${info}`);
        }

        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);

        return new WebGLShader(this.gl, program);
    }

    setRenderTarget(target?: RenderTarget): void {
        if (!target) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            this.currentRenderTarget = null;
            return;
        }

        const webglTarget = target as WebGLRenderTarget;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, webglTarget.getFramebuffer());
        this.currentRenderTarget = target;
    }

    draw(mesh: Mesh, material: Material): void {
        const webglMesh = mesh as WebGLMesh;
        const webglMaterial = material as WebGLMaterial;

        webglMaterial.bind();

        const shader = webglMaterial.getShader() as WebGLShader;
        this.gl.useProgram(shader.getProgram());

        const vertexBuffer = webglMesh.getVertexBuffer() as WebGLVertexBuffer;
        const indexBuffer = webglMesh.getIndexBuffer() as WebGLIndexBuffer | null;

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer.getBuffer());
        this.setupAttributes(vertexBuffer.getFormat(), shader);

        if (indexBuffer) {
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer.getBuffer());
            this.gl.drawElements(
                this.getPrimitiveType(webglMesh.getPrimitive()),
                indexBuffer.getCount(),
                indexBuffer.getFormat() === IndexFormat.UInt32 ? this.gl.UNSIGNED_INT : this.gl.UNSIGNED_SHORT,
                0
            );
        } else {
            this.gl.drawArrays(
                this.getPrimitiveType(webglMesh.getPrimitive()),
                0,
                vertexBuffer.getCount()
            );
        }
    }

    setViewport(x: number, y: number, w: number, h: number): void {
        this.gl.viewport(x, y, w, h);
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

    private getInternalFormat(format: PixelFormat): number {
        switch (format) {
            case PixelFormat.RGBA8: return this.gl.RGBA8;
            case PixelFormat.RGB8: return this.gl.RGB8;
            case PixelFormat.RG8: return this.gl.RG8;
            case PixelFormat.R8: return this.gl.R8;
            case PixelFormat.RGBA16F: return this.gl.RGBA16F;
            case PixelFormat.RGBA32F: return this.gl.RGBA32F;
            default: throw new Error(`Unsupported pixel format: ${format}`);
        }
    }

    private getPixelFormat(format: PixelFormat): number {
        switch (format) {
            case PixelFormat.RGBA8:
            case PixelFormat.RGBA16F:
            case PixelFormat.RGBA32F:
                return this.gl.RGBA;
            case PixelFormat.RGB8:
                return this.gl.RGB;
            case PixelFormat.RG8:
                return this.gl.RG;
            case PixelFormat.R8:
                return this.gl.RED;
            default: throw new Error(`Unsupported pixel format: ${format}`);
        }
    }

    private getPixelType(format: PixelFormat): number {
        switch (format) {
            case PixelFormat.RGBA8:
            case PixelFormat.RGB8:
            case PixelFormat.RG8:
            case PixelFormat.R8:
                return this.gl.UNSIGNED_BYTE;
            case PixelFormat.RGBA16F:
                return this.gl.HALF_FLOAT;
            case PixelFormat.RGBA32F:
                return this.gl.FLOAT;
            default: throw new Error(`Unsupported pixel format: ${format}`);
        }
    }

    private getPrimitiveType(primitive: PrimitiveType): number {
        switch (primitive) {
            case PrimitiveType.Points: return this.gl.POINTS;
            case PrimitiveType.Lines: return this.gl.LINES;
            case PrimitiveType.LineLoop: return this.gl.LINE_LOOP;
            case PrimitiveType.LineStrip: return this.gl.LINE_STRIP;
            case PrimitiveType.Triangles: return this.gl.TRIANGLES;
            case PrimitiveType.TriangleStrip: return this.gl.TRIANGLE_STRIP;
            case PrimitiveType.TriangleFan: return this.gl.TRIANGLE_FAN;
            default: throw new Error(`Unsupported primitive type: ${primitive}`);
        }
    }

    private setupAttributes(format: VertexFormat, shader: WebGLShader): void {
        const elements = format.getElements();
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const location = this.gl.getAttribLocation(shader.getProgram(), element.name);
            if (location === -1) continue;

            this.gl.enableVertexAttribArray(location);
            this.gl.vertexAttribPointer(
                location,
                element.count,
                this.getVertexType(element.type),
                element.normalized,
                format.getSize(),
                format.getOffset(element.name)
            );
        }
    }

    private getVertexType(type: VertexType): number {
        switch (type) {
            case VertexType.Int8: return this.gl.BYTE;
            case VertexType.Uint8: return this.gl.UNSIGNED_BYTE;
            case VertexType.Int16: return this.gl.SHORT;
            case VertexType.Uint16: return this.gl.UNSIGNED_SHORT;
            case VertexType.Int32: return this.gl.INT;
            case VertexType.Uint32: return this.gl.UNSIGNED_INT;
            case VertexType.Float32: return this.gl.FLOAT;
            default: throw new Error(`Unsupported vertex type: ${type}`);
        }
    }
}

class WebGLVertexBuffer implements VertexBuffer {
    constructor(
        private gl: WebGL2RenderingContext,
        private buffer: WebGLBuffer,
        private format: VertexFormat,
        private count: number
    ) {}

    setData(data: ArrayBufferView): void {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, data);
    }

    getCount(): number {
        return this.count;
    }

    getBuffer(): WebGLBuffer {
        return this.buffer;
    }

    getFormat(): VertexFormat {
        return this.format;
    }
}

class WebGLIndexBuffer implements IndexBuffer {
    constructor(
        private gl: WebGL2RenderingContext,
        private buffer: WebGLBuffer,
        private format: IndexFormat,
        private count: number
    ) {}

    setData(data: Uint16Array | Uint32Array): void {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffer);
        this.gl.bufferSubData(this.gl.ELEMENT_ARRAY_BUFFER, 0, data);
    }

    getCount(): number {
        return this.count;
    }

    getFormat(): IndexFormat {
        return this.format;
    }

    getBuffer(): WebGLBuffer {
        return this.buffer;
    }
}

class WebGLTexture implements Texture {
    constructor(
        private gl: WebGL2RenderingContext,
        private texture: WebGLTexture,
        private width: number,
        private height: number,
        private format: PixelFormat
    ) {}

    setData(data: Uint8Array): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texSubImage2D(
            this.gl.TEXTURE_2D,
            0,
            0,
            0,
            this.width,
            this.height,
            this.getPixelFormat(this.format),
            this.getPixelType(this.format),
            data
        );
    }

    getWidth(): number {
        return this.width;
    }

    getHeight(): number {
        return this.height;
    }

    private getPixelFormat(format: PixelFormat): number {
        switch (format) {
            case PixelFormat.RGBA8:
            case PixelFormat.RGBA16F:
            case PixelFormat.RGBA32F:
                return this.gl.RGBA;
            case PixelFormat.RGB8:
                return this.gl.RGB;
            case PixelFormat.RG8:
                return this.gl.RG;
            case PixelFormat.R8:
                return this.gl.RED;
            default: throw new Error(`Unsupported pixel format: ${format}`);
        }
    }

    private getPixelType(format: PixelFormat): number {
        switch (format) {
            case PixelFormat.RGBA8:
            case PixelFormat.RGB8:
            case PixelFormat.RG8:
            case PixelFormat.R8:
                return this.gl.UNSIGNED_BYTE;
            case PixelFormat.RGBA16F:
                return this.gl.HALF_FLOAT;
            case PixelFormat.RGBA32F:
                return this.gl.FLOAT;
            default: throw new Error(`Unsupported pixel format: ${format}`);
        }
    }
}

class WebGLShader implements Shader {
    constructor(
        private gl: WebGL2RenderingContext,
        private program: WebGLProgram
    ) {}

    getUniform(name: string): Uniform {
        const location = this.gl.getUniformLocation(this.program, name);
        if (!location) {
            throw new Error(`Uniform not found: ${name}`);
        }
        return new Uniform(location);
    }

    setUniform(uniform: Uniform, value: any): void {
        this.gl.useProgram(this.program);
        const loc = uniform.getLocation();
        if (Array.isArray(value)) {
            switch (value.length) {
                case 1: this.gl.uniform1f(loc, value[0]); break;
                case 2: this.gl.uniform2fv(loc, value); break;
                case 3: this.gl.uniform3fv(loc, value); break;
                case 4: this.gl.uniform4fv(loc, value); break;
                case 9: this.gl.uniformMatrix3fv(loc, false, value); break;
                case 16: this.gl.uniformMatrix4fv(loc, false, value); break;
                default: throw new Error(`Unsupported uniform array length: ${value.length}`);
            }
        } else {
            this.gl.uniform1f(loc, value);
        }
    }

    getProgram(): WebGLProgram {
        return this.program;
    }
}

class WebGLRenderTarget implements RenderTarget {
    constructor(
        private gl: WebGL2RenderingContext,
        private framebuffer: WebGLFramebuffer,
        private colorBuffer: Texture,
        private depthBuffer?: Texture
    ) {}

    getFramebuffer(): WebGLFramebuffer {
        return this.framebuffer;
    }

    getColorBuffer(): Texture {
        return this.colorBuffer;
    }

    getDepthBuffer(): Texture | undefined {
        return this.depthBuffer;
    }
}

class WebGLMaterial implements Material {
    private shader: Shader;
    private parameters: Map<string, any> = new Map();

    constructor(shader: Shader) {
        this.shader = shader;
    }

    setParameter(name: string, value: any): void {
        this.parameters.set(name, value);
    }

    getParameter(name: string): any {
        return this.parameters.get(name);
    }

    getShader(): Shader {
        return this.shader;
    }

    bind(): void {
        for (const [name, value] of this.parameters) {
            const uniform = this.shader.getUniform(name);
            this.shader.setUniform(uniform, value);
        }
    }
}

class WebGLMesh implements Mesh {
    constructor(
        private vertexBuffer: VertexBuffer,
        private indexBuffer: IndexBuffer | null,
        private primitive: PrimitiveType
    ) {}

    getVertexBuffer(): VertexBuffer {
        return this.vertexBuffer;
    }

    getIndexBuffer(): IndexBuffer | null {
        return this.indexBuffer;
    }

    getPrimitive(): PrimitiveType {
        return this.primitive;
    }
}

class Uniform {
    constructor(private location: WebGLUniformLocation) {}

    getLocation(): WebGLUniformLocation {
        return this.location;
    }
}

enum IndexFormat {
    UInt16,
    UInt32
}

enum PixelFormat {
    R8,
    RG8,
    RGB8,
    RGBA8,
    RGBA16F,
    RGBA32F
}

enum PrimitiveType {
    Points,
    Lines,
    LineLoop,
    LineStrip,
    Triangles,
    TriangleStrip,
    TriangleFan
}

enum VertexType {
    Int8,
    Uint8,
    Int16,
    Uint16,
    Int32,
    Uint32,
    Float32
}
