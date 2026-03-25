import { VertexFormat } from './vertex-format';
import { VertexBuffer } from './vertex-buffer';
import { IndexBuffer } from './index-buffer';
import { Shader } from './shader';
import { Texture } from './texture';
import { RenderTarget } from './render-target';
import { Mesh } from './mesh';

/**
 * Abstract GPU abstraction layer for rendering operations.
 * Provides a platform-agnostic interface for creating and managing graphics resources.
 */
export class GraphicsDevice {
    limits: object;
    isWebGL2: boolean;
    shaderVersion: string;
    textureUnits: number;
    maxVertexAttributes: number;
    maxTextureSize: number;
    maxCubeMapSize: number;
    maxRenderBufferSize: number;
    maxAnisotropy: number;
    supportsInstancing: boolean;
    supportsUniformBuffers: boolean;
    supportsTextureFloat: boolean;
    supportsTextureHalfFloat: boolean;
    supportsTextureLOD: boolean;
    supportsDepthTexture: boolean;
    supportsWebGL2: boolean;

    constructor() {
        this.limits = {};
        this.isWebGL2 = false;
        this.shaderVersion = '100';
        this.textureUnits = 8;
        this.maxVertexAttributes = 16;
        this.maxTextureSize = 2048;
        this.maxCubeMapSize = 2048;
        this.maxRenderBufferSize = 2048;
        this.maxAnisotropy = 16;
        this.supportsInstancing = false;
        this.supportsUniformBuffers = false;
        this.supportsTextureFloat = false;
        this.supportsTextureHalfFloat = false;
        this.supportsTextureLOD = false;
        this.supportsDepthTexture = false;
        this.supportsWebGL2 = false;
    }

    /**
     * Create a vertex buffer from vertex data and format specification.
     * @param vertices - Array of vertex positions, normals, uvs, etc.
     * @param format - Vertex format describing the layout of vertex data.
     * @returns New VertexBuffer instance.
     * @throws {TypeError} If vertices is not an array or format is invalid.
     */
    createVertexBuffer(vertices: number[], format: VertexFormat): VertexBuffer {
        if (!Array.isArray(vertices)) {
            throw new TypeError('vertices must be an array of numbers');
        }
        if (!format || typeof format.getStride !== 'function') {
            throw new TypeError('format must be a valid VertexFormat instance');
        }
        if (vertices.length === 0) {
            throw new RangeError('vertices array cannot be empty');
        }

        const buffer = new VertexBuffer();
        buffer.device = this;
        buffer.format = format;
        const stride = format.getStride();
        if (stride <= 0) {
            throw new RangeError('VertexFormat stride must be positive');
        }
        if (vertices.length % (stride / 4) !== 0) {
            throw new RangeError('vertices length must be a multiple of stride / 4');
        }
        buffer.numVertices = vertices.length / (stride / 4);
        buffer.usage = 35044; // DYNAMIC_DRAW
        buffer.setData(new Float32Array(vertices).buffer);
        return buffer;
    }

    /**
     * Create an index buffer from index data.
     * @param indices - Array of indices.
     * @param format - Index format (2 for UNSIGNED_SHORT, 4 for UNSIGNED_INT).
     * @returns New IndexBuffer instance.
     * @throws {TypeError} If indices is not an array.
     * @throws {RangeError} If format is not 2 or 4.
     */
    createIndexBuffer(indices: number[], format: number): IndexBuffer {
        if (!Array.isArray(indices)) {
            throw new TypeError('indices must be an array of numbers');
        }
        if (indices.length === 0) {
            throw new RangeError('indices array cannot be empty');
        }
        if (format !== 2 && format !== 4) {
            throw new RangeError('format must be 2 (UNSIGNED_SHORT) or 4 (UNSIGNED_INT)');
        }

        const buffer = new IndexBuffer();
        buffer.device = this;
        format = format === 4 ? 5125 : 5123; // UNSIGNED_INT or UNSIGNED_SHORT
        buffer.format = format;
        buffer.numIndices = indices.length;
        buffer.setData(format === 5123 ? new Uint16Array(indices) : new Uint32Array(indices));
        return buffer;
    }

    /**
     * Compile a shader program from vertex and fragment shader source.
     * @param vs - Vertex shader source code.
     * @param fs - Fragment shader source code.
     * @param attributes - Map of attribute names to locations.
     * @returns New Shader instance.
     * @throws {TypeError} If vs or fs are not strings, or attributes is not an object.
     */
    createShader(vs: string, fs: string, attributes: object): Shader {
        if (typeof vs !== 'string') {
            throw new TypeError('vs must be a string containing vertex shader source');
        }
        if (typeof fs !== 'string') {
            throw new TypeError('fs must be a string containing fragment shader source');
        }
        if (typeof attributes !== 'object' || attributes === null) {
            throw new TypeError('attributes must be a non-null object');
        }

        const shader = new Shader();
        shader.device = this;
        shader.compile(vs, fs);
        for (const [name, loc] of Object.entries(attributes)) {
            if (typeof loc !== 'number' || loc < 0 || !Number.isInteger(loc)) {
                throw new TypeError(`Attribute location for '${name}' must be a non-negative integer`);
            }
            shader.attributes.set(name, loc as number);
        }
        return shader;
    }

    /**
     * Create a texture resource with the given options.
     * @param options - Texture creation options.
     * @returns New Texture instance.
     * @throws {TypeError} If options is not an object.
     */
    createTexture(options: object): Texture {
        if (typeof options !== 'object' || options === null) {
            throw new TypeError('options must be a non-null object');
        }

        const texture = new Texture();
        Object.assign(texture, options);
        return texture;
    }

    /**
     * Create a render target with the given options.
     * @param options - Render target creation options.
     * @returns New RenderTarget instance.
     * @throws {TypeError} If options is not an object.
     */
    createRenderTarget(options: object): RenderTarget {
        if (typeof options !== 'object' || options === null) {
            throw new TypeError('options must be a non-null object');
        }

        const rt = new RenderTarget();
        Object.assign(rt, options);
        return rt;
    }

    /**
     * Set the active render target for subsequent draw calls.
     * @param renderTarget - Render target to bind, or null for back buffer.
     */
    setRenderTarget(renderTarget: RenderTarget | null): void {
        if (renderTarget && renderTarget.framebuffer) {
            // WebGL-specific binding would go here
        }
    }

    /**
     * Clear the currently bound framebuffer.
     * @param options - Clear options including color, depth, stencil, and flags.
     * @throws {TypeError} If options is not an object.
     */
    clear(options: object): void {
        if (typeof options !== 'object' || options === null) {
            throw new TypeError('options must be a non-null object');
        }

        const { color, depth, stencil, flags } = options as any;
        // Web-specific clear implementation stub
    }

    /**
     * Draw a mesh with optional instancing.
     * @param mesh - Mesh to draw.
     * @param numInstances - Number of instances to draw (default 1).
     * @throws {TypeError} If mesh is invalid or numInstances is not a positive integer.
     */
    draw(mesh: Mesh, numInstances: number = 1): void {
        if (!mesh || typeof mesh !== 'object') {
            throw new TypeError('mesh must be a valid Mesh instance');
        }
        if (!Number.isInteger(numInstances) || numInstances <= 0) {
            throw new RangeError('numInstances must be a positive integer');
        }

        if (!mesh.vertexBuffer || !mesh.indexBuffer) return;
        // Web-specific draw implementation stub
    }

    /**
     * Set the viewport rectangle for rendering.
     * @param x - Left coordinate in pixels.
     * @param y - Bottom coordinate in pixels.
     * @param w - Width in pixels.
     * @param h - Height in pixels.
     * @throws {RangeError} If width or height are not positive.
     */
    setViewport(x: number, y: number, w: number, h: number): void {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new TypeError('x and y must be finite numbers');
        }
        if (!Number.isFinite(w) || w <= 0) {
            throw new RangeError('width must be a positive finite number');
        }
        if (!Number.isFinite(h) || h <= 0) {
            throw new RangeError('height must be a positive finite number');
        }

        // Web-specific viewport implementation stub
    }

    /**
     * Set the scissor rectangle for clipping.
     * @param x - Left coordinate in pixels.
     * @param y - Bottom coordinate in pixels.
     * @param w - Width in pixels.
     * @param h - Height in pixels.
     * @throws {RangeError} If width or height are not positive.
     */
    setScissor(x: number, y: number, w: number, h: number): void {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new TypeError('x and y must be finite numbers');
        }
        if (!Number.isFinite(w) || w <= 0) {
            throw new RangeError('width must be a positive finite number');
        }
        if (!Number.isFinite(h) || h <= 0) {
            throw new RangeError('height must be a positive finite number');
        }

        // Web-specific scissor implementation stub
    }

    /**
     * Begin a frame update. Must be called before any draw calls.
     */
    updateBegin(): void {
        // Begin frame update stub
    }

    /**
     * End a frame update. Must be called after all draw calls.
     */
    updateEnd(): void {
        // End frame update stub
    }
}
