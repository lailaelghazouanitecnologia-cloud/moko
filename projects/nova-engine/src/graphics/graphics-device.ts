import { EventHandler } from '../core/event-handler';
import { Color } from '../math/color';
import { RenderState } from './render-state';
import { BlendState } from './blend-state';
import { DepthState } from './depth-state';
import { StencilState } from './stencil-state';
import { RenderTarget } from './render-target';
import { CullMode } from './constants';

export class GraphicsDevice extends EventHandler {
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    maxTextures: number;
    maxTextureSize: number;
    maxCubeMapSize: number;
    maxVolumeSize: number;
    maxAnisotropy: number;
    supportsInstancing: boolean;
    supportsUniformBuffers: boolean;
    renderState: RenderState;

    private _currentRenderTarget: RenderTarget | null = null;
    private _debugStack: string[] = [];

    constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
        super();
        this.canvas = canvas;
        this.gl = gl;
        
        const ext = gl.getExtension('EXT_texture_filter_anisotropic');
        this.maxAnisotropy = ext ? gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;
        
        this.maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        this.maxCubeMapSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);
        this.maxVolumeSize = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE);
        
        this.supportsInstancing = !!gl.getExtension('ANGLE_instanced_arrays');
        this.supportsUniformBuffers = !!gl.getExtension('WEBGL_draw_buffers');
        
        this.renderState = new RenderState();
        
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
    }

    setViewport(x: number, y: number, w: number, h: number): void {
        this.gl.viewport(x, y, w, h);
    }

    setScissor(x: number, y: number, w: number, h: number): void {
        this.gl.scissor(x, y, w, h);
    }

    clear(flags: number, color?: Color, depth?: number, stencil?: number): void {
        let mask = 0;
        
        if (flags & 1) { // COLOR_BUFFER_BIT
            mask |= this.gl.COLOR_BUFFER_BIT;
            if (color) {
                this.gl.clearColor(color.r, color.g, color.b, color.a);
            }
        }
        
        if (flags & 2) { // DEPTH_BUFFER_BIT
            mask |= this.gl.DEPTH_BUFFER_BIT;
            if (depth !== undefined) {
                this.gl.clearDepth(depth);
            }
        }
        
        if (flags & 4) { // STENCIL_BUFFER_BIT
            mask |= this.gl.STENCIL_BUFFER_BIT;
            if (stencil !== undefined) {
                this.gl.clearStencil(stencil);
            }
        }
        
        this.gl.clear(mask);
    }

    draw(primitive: number, vertexCount: number, first: number = 0): void {
        this.gl.drawArrays(primitive, first, vertexCount);
    }

    drawIndexed(primitive: number, indexCount: number, indexType: number): void {
        this.gl.drawElements(primitive, indexCount, indexType, 0);
    }

    drawInstanced(primitive: number, vertexCount: number, instanceCount: number): void {
        const ext = this.gl.getExtension('ANGLE_instanced_arrays');
        if (ext) {
            ext.drawArraysInstancedANGLE(primitive, 0, vertexCount, instanceCount);
        } else {
            throw new Error('Instanced rendering not supported');
        }
    }

    setBlendState(state: BlendState): void {
        if (state.enabled) {
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(state.srcFactor, state.dstFactor);
            this.gl.blendEquation(state.equation);
            if (state.separateAlpha) {
                this.gl.blendFuncSeparate(state.srcFactor, state.dstFactor, state.srcAlphaFactor, state.dstAlphaFactor);
                this.gl.blendEquationSeparate(state.equation, state.alphaEquation);
            }
        } else {
            this.gl.disable(this.gl.BLEND);
        }
    }

    setDepthState(state: DepthState): void {
        if (state.test) {
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.depthFunc(state.func);
        } else {
            this.gl.disable(this.gl.DEPTH_TEST);
        }
        this.gl.depthMask(state.write);
    }

    setCullMode(mode: CullMode): void {
        if (mode === CullMode.NONE) {
            this.gl.disable(this.gl.CULL_FACE);
        } else {
            this.gl.enable(this.gl.CULL_FACE);
            this.gl.cullFace(mode);
        }
    }

    setStencilState(state: StencilState): void {
        if (state.enabled) {
            this.gl.enable(this.gl.STENCIL_TEST);
            this.gl.stencilFunc(state.func, state.ref, state.mask);
            this.gl.stencilOp(state.fail, state.zfail, state.zpass);
            if (state.separateBack) {
                this.gl.stencilFuncSeparate(this.gl.BACK, state.backFunc, state.backRef, state.backMask);
                this.gl.stencilOpSeparate(this.gl.BACK, state.backFail, state.backZfail, state.backZpass);
            }
        } else {
            this.gl.disable(this.gl.STENCIL_TEST);
        }
    }

    copyRenderTarget(src: RenderTarget, dst: RenderTarget): void {
        const gl = this.gl;
        
        const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING);
        
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src._glFrameBuffer);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst._glFrameBuffer);
        
        const w = Math.min(src.width, dst.width);
        const h = Math.min(src.height, dst.height);
        
        gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);
    }

    pushMarker(name: string): void {
        this._debugStack.push(name);
        const ext = this.gl.getExtension('WEBGL_debug_marker');
        if (ext) {
            ext.insertEventMarkerEXT(name);
        }
    }

    popMarker(): void {
        this._debugStack.pop();
        const ext = this.gl.getExtension('WEBGL_debug_marker');
        if (ext && ext.popGroupMarkerEXT) {
            ext.popGroupMarkerEXT();
        }
    }

    beginRenderPass(target: RenderTarget): void {
        this._currentRenderTarget = target;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target._glFrameBuffer);
        this.setViewport(0, 0, target.width, target.height);
        if (target._glDepthBuffer) {
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, target._glDepthBuffer);
        }
    }

    endRenderPass(): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this._currentRenderTarget = null;
        this.setViewport(0, 0, this.canvas.width, this.canvas.height);
    }

    static async create(canvas: HTMLCanvasElement, options: object = {}): Promise<GraphicsDevice> {
        let gl: WebGL2RenderingContext | null = null;
        
        try {
            gl = canvas.getContext('webgl2', options) as WebGL2RenderingContext;
        } catch (e) {
            // Fall back to webgl1 if needed
            gl = canvas.getContext('webgl', options) as WebGL2RenderingContext;
        }
        
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        
        return new GraphicsDevice(canvas, gl);
    }
}
