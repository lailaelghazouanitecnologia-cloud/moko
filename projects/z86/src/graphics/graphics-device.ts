import { EventEmitter } from '../core';
import { Vec2, Vec4, Color } from '../math';
import { ScopeSpace } from './scope-space';
import { Texture } from './texture';
import { Shader } from './shader';
import { VertexBuffer } from './vertex-buffer';
import { IndexBuffer } from './index-buffer';
import { RenderTarget } from './render-target';

export abstract class GraphicsDevice extends EventEmitter {
    canvas: HTMLCanvasElement;
    scope: ScopeSpace;
    maxTextures: number;
    maxTextureSize: number;
    maxCubeMapSize: number;
    maxVolumeSize: number;
    maxAnisotropy: number;
    supportsInstancing: boolean;
    supportsUniformBuffers: boolean;

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;
        this.scope = new ScopeSpace();
    }

    abstract setViewport(x: number, y: number, w: number, h: number): void;
    abstract setScissor(x: number, y: number, w: number, h: number): void;
    abstract clear(color?: Color, depth?: number, stencil?: number): void;
    abstract draw(primitive: number, numIndices: number, useIndices: boolean): void;
    abstract setBlendState(enabled: boolean, srcFactor: number, dstFactor: number, srcAlphaFactor?: number, dstAlphaFactor?: number): void;
    abstract setDepthState(enabled: boolean, write: boolean, func: number): void;
    abstract setCullMode(mode: number): void;
    abstract setStencilState(enabled: boolean, func: number, ref: number, mask: number, failOp: number, zFailOp: number, zPassOp: number): void;
    abstract copyRenderTarget(source: RenderTarget, dest: RenderTarget, color: boolean, depth: boolean): void;
    abstract pushMarker(name: string): void;
    abstract popMarker(): void;

    createTexture(options: any): Texture {
        return new Texture(this, options);
    }

    createShader(options: any): Shader {
        return new Shader(this, options);
    }

    createBuffer(vertexFormat: any, numVertices: number, usage: number, initialData?: ArrayBufferView): VertexBuffer {
        return new VertexBuffer(this, vertexFormat, numVertices, usage, initialData);
    }
}
