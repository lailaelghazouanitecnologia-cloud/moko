import { EventHandler } from '../core/event-handler.js';
import { Vec2 } from '../math/vec2.js';
import { Color } from '../math/color.js';
import { WebglGraphicsDevice } from './webgl/webgl-graphics-device.js';
import { Shader } from './shader.js';
import { Texture } from './texture.js';
import { RenderTarget } from './render-target.js';

export class GraphicsDevice extends EventHandler {
    canvas: HTMLCanvasElement;
    scope: any;
    maxTextures: number;
    maxTextureSize: number;
    maxCubeMapSize: number;
    maxVolumeSize: number;
    maxAnisotropy: number;
    supportsInstancing: boolean;
    supportsUniformBuffers: boolean;

    constructor(canvas: HTMLCanvasElement, options?: any) {
        super();
        this.canvas = canvas;
        this.scope = {};
        this.maxTextures = 16;
        this.maxTextureSize = 4096;
        this.maxCubeMapSize = 4096;
        this.maxVolumeSize = 2048;
        this.maxAnisotropy = 16;
        this.supportsInstancing = false;
        this.supportsUniformBuffers = false;
    }

    setViewport(x: number, y: number, w: number, h: number): void {
        // Implementation for setting viewport
    }

    setScissor(x: number, y: number, w: number, h: number): void {
        // Implementation for setting scissor rectangle
    }

    clear(color?: Color, depth?: number, stencil?: number): void {
        // Implementation for clearing buffers
    }

    draw(primitive: any, numInstances?: number): void {
        // Implementation for submitting draw call
    }

    setBlendState(blend: boolean, srcBlend?: number, dstBlend?: number, blendOp?: number, srcBlendAlpha?: number, dstBlendAlpha?: number, blendOpAlpha?: number): void {
        // Implementation for enabling/disabling blending
    }

    setDepthState(depthTest: boolean, depthWrite?: boolean, depthFunc?: number): void {
        // Implementation for depth test/write
    }

    setCullMode(cullMode: number): void {
        // Implementation for setting cull mode (front/back/none)
    }

    setStencilState(stencilTest: boolean, func?: number, ref?: number, mask?: number, failOp?: number, zFailOp?: number, zPassOp?: number, readMask?: number, writeMask?: number): void {
        // Implementation for stencil func/ops
    }

    copyRenderTarget(source: RenderTarget, dest: RenderTarget, color?: boolean, depth?: boolean): void {
        // Implementation for blitting between targets
    }

    pushMarker(name: string): void {
        // Implementation for beginning debug label
    }

    popMarker(): void {
        // Implementation for ending debug label
    }

    createTexture(width: number, height: number, format?: number, mipmaps?: boolean, options?: any): Texture {
        return new Texture(this, width, height, format, mipmaps, options);
    }

    createShader(vertexShader: string, fragmentShader: string, attributes?: any): Shader {
        return new Shader(this, vertexShader, fragmentShader, attributes);
    }

    createBuffer(usage: number, size: number, data?: ArrayBufferView): any {
        return { usage, size, data };
    }
}

export async function createGraphicsDevice(canvas: HTMLCanvasElement, options?: any): Promise<GraphicsDevice> {
    try {
        const webglDevice = new WebglGraphicsDevice(canvas, options);
        return webglDevice;
    } catch (e) {
        throw new Error('Failed to create graphics device');
    }
}
