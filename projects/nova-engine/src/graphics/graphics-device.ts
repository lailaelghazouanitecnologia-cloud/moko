import { EventHandler } from '../core/event-handler';
import { Color } from '../math/color';

export class GraphicsDevice extends EventHandler {
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    isWebGPU: boolean = false;
    maxTextures: number;
    maxTextureSize: number;
    maxCubeMapSize: number;
    maxVolumeSize: number;
    maxAnisotropy: number;
    supportsInstancing: boolean = true;
    supportsUniformBuffers: boolean = false;
    renderState: RenderState;

    private currentViewport: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 };
    private currentScissor: { x: number, y: number, width: number, height: number } | null = null;
    private blendEnabled: boolean = false;
    private srcBlend: number = 0;
    private dstBlend: number = 0;
    private depthTestEnabled: boolean = true;
    private depthFunc: number = 0x0203; // LEQUAL
    private depthWrite: boolean = true;
    private cullMode: number = 0x0404; // BACK
    private stencilTestEnabled: boolean = false;
    private stencilFunc: number = 0x0207; // ALWAYS
    private stencilRef: number = 0;
    private debugMarkerStack: string[] = [];

    constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
        super();
        this.canvas = canvas;
        this.gl = gl;
        this.renderState = new RenderState();

        const ext = gl.getExtension('EXT_texture_filter_anisotropic');
        this.maxAnisotropy = ext ? gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;
        this.maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        this.maxCubeMapSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);
        this.maxVolumeSize = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
    }

    setViewport(x: number, y: number, width: number, height: number): void {
        this.currentViewport = { x, y, width, height };
        this.gl.viewport(x, y, width, height);
    }

    setScissor(x: number, y: number, width: number, height: number): void {
        this.currentScissor = { x, y, width, height };
        this.gl.enable(this.gl.SCISSOR_TEST);
        this.gl.scissor(x, y, width, height);
    }

    clear(color?: Color, depth?: number, stencil?: number): void {
        let mask = 0;
        if (color) {
            this.gl.clearColor(color.r, color.g, color.b, color.a);
            mask |= this.gl.COLOR_BUFFER_BIT;
        }
        if (depth !== undefined) {
            this.gl.clearDepth(depth);
            mask |= this.gl.DEPTH_BUFFER_BIT;
        }
        if (stencil !== undefined) {
            this.gl.clearStencil(stencil);
            mask |= this.gl.STENCIL_BUFFER_BIT;
        }
        this.gl.clear(mask);
    }

    draw(primitiveType: number, vertexCount: number, offset: number = 0): void {
        this.gl.drawArrays(primitiveType, offset, vertexCount);
    }

    drawIndexed(primitiveType: number, indexCount: number, offset: number = 0): void {
        const type = this.gl.UNSIGNED_SHORT;
        this.gl.drawElements(primitiveType, indexCount, type, offset * 2);
    }

    drawInstanced(primitiveType: number, vertexCount: number, instanceCount: number): void {
        const ext = this.gl.getExtension('ANGLE_instanced_arrays');
        if (ext) {
            ext.drawArraysInstancedANGLE(primitiveType, 0, vertexCount, instanceCount);
        } else {
            throw new Error('Instanced rendering not supported');
        }
    }

    setBlendState(enabled: boolean, srcFactor?: number, dstFactor?: number): void {
        this.blendEnabled = enabled;
        if (enabled) {
            this.gl.enable(this.gl.BLEND);
            if (srcFactor !== undefined && dstFactor !== undefined) {
                this.srcBlend = srcFactor;
                this.dstBlend = dstFactor;
                this.gl.blendFunc(srcFactor, dstFactor);
            }
        } else {
            this.gl.disable(this.gl.BLEND);
        }
    }

    setDepthState(enabled: boolean, func?: number, write?: boolean): void {
        this.depthTestEnabled = enabled;
        if (enabled) {
            this.gl.enable(this.gl.DEPTH_TEST);
            if (func !== undefined) {
                this.depthFunc = func;
                this.gl.depthFunc(func);
            }
            if (write !== undefined) {
                this.depthWrite = write;
                this.gl.depthMask(write);
            }
        } else {
            this.gl.disable(this.gl.DEPTH_TEST);
        }
    }

    setCullMode(mode: number): void {
        this.cullMode = mode;
        this.gl.cullFace(mode);
    }

    setStencilState(enabled: boolean, func?: number, ref?: number): void {
        this.stencilTestEnabled = enabled;
        if (enabled) {
            this.gl.enable(this.gl.STENCIL_TEST);
            if (func !== undefined) {
                this.stencilFunc = func;
                this.gl.stencilFunc(func, this.stencilRef, 0xFF);
            }
            if (ref !== undefined) {
                this.stencilRef = ref;
                this.gl.stencilFunc(this.stencilFunc, ref, 0xFF);
            }
        } else {
            this.gl.disable(this.gl.STENCIL_TEST);
        }
    }

    copyRenderTarget(src: RenderTarget, dst: RenderTarget): void {
        this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, src.framebuffer);
        this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, dst.framebuffer);
        this.gl.blitFramebuffer(
            0, 0, src.width, src.height,
            0, 0, dst.width, dst.height,
            this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT,
            this.gl.NEAREST
        );
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    pushMarker(name: string): void {
        this.debugMarkerStack.push(name);
        const ext = this.gl.getExtension('WEBGL_debug_marker');
        if (ext) {
            ext.insertMarker(name);
        }
    }

    popMarker(): void {
        this.debugMarkerStack.pop();
    }

    beginFrame(): void {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    endFrame(): void {
        this.gl.flush();
    }

    resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }

    static async create(canvas: HTMLCanvasElement, options?: object): Promise<GraphicsDevice> {
        const gl = canvas.getContext('webgl2', options) as WebGL2RenderingContext;
        if (!gl) {
            throw new Error('WebGL2 not supported');
        }
        return new GraphicsDevice(canvas, gl);
    }
}

class RenderState {
    viewport: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 };
    scissor: { x: number, y: number, width: number, height: number } | null = null;
    blendEnabled: boolean = false;
    depthTestEnabled: boolean = true;
    cullMode: number = 0x0404; // BACK
    stencilTestEnabled: boolean = false;
}
