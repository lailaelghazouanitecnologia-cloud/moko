interface TextureOptions {
    format?: number;
    mipmaps?: boolean;
    wrapS?: number;
    wrapT?: number;
    minFilter?: number;
    magFilter?: number;
}

interface RenderTargetOptions {
    depth?: boolean;
    format?: number;
}

export class WebGLDevice {
    gl: WebGLRenderingContext;
    canvas: HTMLCanvasElement;
    extensions: Map<string, any>;
    limits: object;

    constructor() {
        this.extensions = new Map();
        this.limits = {};
    }

    initialize(canvas: HTMLCanvasElement, options?: WebGLContextAttributes): void {
        this.canvas = canvas;
        const gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
        if (!gl) {
            throw new Error('Failed to get WebGL context');
        }
        this.gl = gl as WebGLRenderingContext;

        this.extensions.set('WEBGL_depth_texture', this.gl.getExtension('WEBGL_depth_texture'));
        this.extensions.set('O_texture_float', this.gl.getExtension('O_texture_float'));
        this.extensions.set('O_texture_half_float', this.gl.getExtension('O_texture_half_float'));
        this.extensions.set('EXT_texture_filter_anisotropic', this.gl.getExtension('EXT_texture_filter_anisotropic'));
        this.extensions.set('WEBGL_lose_context', this.gl.getExtension('WEBGL_lose_context'));

        this.limits = {
            maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
            maxCubeMapSize: this.gl.getParameter(this.gl.MAX_CUBE_MAP_TEXTURE_SIZE),
            maxRenderBufferSize: this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE),
            maxVertexAttributes: this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS),
            maxTextureUnits: this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS),
            maxAnisotropy: this.extensions.get('EXT_texture_filter_anisotropic') ?
                this.gl.getParameter(this.extensions.get('EXT_texture_filter_anisotropic').MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0
        };
    }

    createVertexBuffer(data: Float32Array, usage: GLenum): VertexBuffer {
        const buffer = new VertexBuffer();
        const gl = this.gl;
        const bufferId = gl.createBuffer();
        if (!bufferId) {
            throw new Error('Failed to create vertex buffer');
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
        gl.bufferData(gl.ARRAY_BUFFER, data, usage);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        (buffer as any).device = this;
        (buffer as any).usage = usage;
        (buffer as any).numVertices = data.length;
        (buffer as any).bufferId = bufferId;
        return buffer;
    }

    createIndexBuffer(data: Uint16Array, usage: GLenum): IndexBuffer {
        const buffer = new IndexBuffer();
        const gl = this.gl;
        const bufferId = gl.createBuffer();
        if (!bufferId) {
            throw new Error('Failed to create index buffer');
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferId);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, usage);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        (buffer as any).device = this;
        (buffer as any).usage = usage;
        (buffer as any).numIndices = data.length;
        (buffer as any).format = gl.UNSIGNED_SHORT;
        return buffer;
    }

    createShader(vertexSrc: string, fragmentSrc: string): Shader {
        const shader = new Shader();
        const gl = this.gl;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        if (!vertexShader) throw new Error('Failed to create vertex shader');
        gl.shaderSource(vertexShader, vertexSrc);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(vertexShader);
            gl.deleteShader(vertexShader);
            throw new Error('Vertex shader compile error: ' + info);
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fragmentShader) throw new Error('Failed to create fragment shader');
        gl.shaderSource(fragmentShader, fragmentSrc);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(fragmentShader);
            gl.deleteShader(fragmentShader);
            throw new Error('Fragment shader compile error: ' + info);
        }

        const program = gl.createProgram();
        if (!program) throw new Error('Failed to create shader program');
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error('Shader link error: ' + info);
        }

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        (shader as any).device = this;
        (shader as any).handle = program;
        (shader as any).uniforms = new Map();
        (shader as any).attributes = new Map();

        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = gl.getActiveUniform(program, i);
            if (info) {
                const loc = gl.getUniformLocation(program, info.name);
                if (loc) (shader as any).uniforms.set(info.name, loc);
            }
        }

        const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const info = gl.getActiveAttrib(program, i);
            if (info) {
                const loc = gl.getAttribLocation(program, info.name);
                (shader as any).attributes.set(info.name, loc);
            }
        }

        return shader;
    }

    createTexture(image: HTMLImageElement | ImageData, options?: TextureOptions): Texture {
        const texture = new Texture();
        const gl = this.gl;
        const textureId = gl.createTexture();
        if (!textureId) throw new Error('Failed to create texture');

        gl.bindTexture(gl.TEXTURE_2D, textureId);

        if (image instanceof HTMLImageElement) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image.data);
        }

        const opts = options || {};
        const format = opts.format || gl.RGBA;
        const minFilter = opts.minFilter || gl.LINEAR;
        const magFilter = opts.magFilter || gl.LINEAR;
        const wrapS = opts.wrapS || gl.CLAMP_TO_EDGE;
        const wrapT = opts.wrapT || gl.CLAMP_TO_EDGE;

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);

        if (opts.mipmaps) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }

        gl.bindTexture(gl.TEXTURE_2D, null);

        (texture as any).width = (image as any).width || (image as any).videoWidth || 0;
        (texture as any).height = (image as any).height || (image as any).videoHeight || 0;
        (texture as any).format = 'rgba8';
        (texture as any).mipLevels = opts.mipmaps ? Math.floor(Math.log2(Math.max((texture as any).width, (texture as any).height))) + 1 : 1;
        (texture as any).gpuHandle = textureId;

        return texture;
    }

    createRenderTarget(width: number, height: number, options?: RenderTargetOptions): RenderTarget {
        const gl = this.gl;
        const renderTarget = new RenderTarget();
        const framebuffer = gl.createFramebuffer();
        if (!framebuffer) throw new Error('Failed to create framebuffer');

        const colorTexture = this.createTexture(new ImageData(new Uint8ClampedArray(width * height * 4), width, height), {
            format: gl.RGBA,
            minFilter: gl.LINEAR,
            magFilter: gl.LINEAR,
            wrapS: gl.CLAMP_TO_EDGE,
            wrapT: gl.CLAMP_TO_EDGE
        });

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, (colorTexture as any).gpuHandle, 0);

        let depthTexture;
        if (options?.depth) {
            depthTexture = this.createTexture(new ImageData(new Uint8ClampedArray(width * height * 4), width, height), {
                format: gl.DEPTH_COMPONENT,
                minFilter: gl.NEAREST,
                magFilter: gl.NEAREST
            });
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, (depthTexture as any).gpuHandle, 0);
        }

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            gl.deleteFramebuffer(framebuffer);
            throw new Error('Framebuffer incomplete: ' + status.toString(16));
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        (renderTarget as any).width = width;
        (renderTarget as any).height = height;
        (renderTarget as any).colorTexture = colorTexture;
        (renderTarget as any).depthTexture = depthTexture;
        (renderTarget as any).framebuffer = framebuffer;

        return renderTarget;
    }

    setViewport(x: number, y: number, w: number, h: number): void {
        this.gl.viewport(x, y, w, h);
    }

    clear(mask: number, color?: Vec4, depth?: number, stencil?: number): void {
        const gl = this.gl;
        let glMask = 0;
        if (mask & 1) {
            glMask |= gl.COLOR_BUFFER_BIT;
            if (color) {
                gl.clearColor(color.x, color.y, color.z, color.w);
            }
        }
        if (mask & 2) {
            glMask |= gl.DEPTH_BUFFER_BIT;
            if (depth !== undefined) {
                gl.clearDepth(depth);
            }
        }
        if (mask & 4) {
            glMask |= gl.STENCIL_BUFFER_BIT;
            if (stencil !== undefined) {
                gl.clearStencil(stencil);
            }
        }
        gl.clear(glMask);
    }

    draw(mesh: Mesh, material: Material, instances?: MeshInstance[]): void {
        const gl = this.gl;
        material.apply(this);

        const vb = (mesh as any).vertexBuffer;
        const ib = (mesh as any).indexBuffer;

        gl.bindBuffer(gl.ARRAY_BUFFER, (vb as any).bufferId);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, (ib as any).bufferId);

        const shader = (material as any).shader;
        (shader as any).bind();

        const format = (vb as any).format;
        const attributes = (shader as any).attributes;
        let offset = 0;
        for (const [name, loc] of attributes) {
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, (format as any).stride || 0, offset);
            offset += 12;
        }

        if (instances && instances.length > 0) {
            for (const instance of instances) {
                if ((instance as any).visible) {
                    gl.drawElements(gl.TRIANGLES, (ib as any).numIndices, gl.UNSIGNED_SHORT, 0);
                }
            }
        } else {
            gl.drawElements(gl.TRIANGLES, (ib as any).numIndices, gl.UNSIGNED_SHORT, 0);
        }

        for (const [name, loc] of attributes) {
            gl.disableVertexAttribArray(loc);
        }

        (shader as any).unbind();
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    readPixels(x: number, y: number, w: number, h: number, buffer: ArrayBufferView): void {
        const gl = this.gl;
        gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
    }
}
