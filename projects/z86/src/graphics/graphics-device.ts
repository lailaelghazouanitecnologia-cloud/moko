import { EventEmitter } from '../core';
import { Vec2, Vec4 } from '../math';
import { ScopeSpace } from './scope-space';

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
    abstract clear(color?: Vec4, depth?: number, stencil?: number): void;
    abstract draw(primitive: number, num: number, indexed?: boolean): void;
    abstract setBlendState(enable: boolean, func?: number, equation?: number): void;
    abstract setDepthState(test: boolean, write: boolean, func?: number): void;
    abstract setCullMode(mode: 'none' | 'front' | 'back'): void;
    abstract setStencilState(test: boolean, op?: number, mask?: number): void;
    abstract copyRenderTarget(src: any, dst: any): void;
    abstract pushMarker(name: string): void;
    abstract popMarker(): void;

    abstract createTexture(): any;
    abstract createShader(): any;
    abstract createBuffer(): any;
}
