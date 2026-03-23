import { EventEmitter } from '../core/eventemitter';
import { Texture } from './texture';
import { WebGLDevice } from './webgldevice';

export class RenderTarget extends EventEmitter {
    private _gl: WebGLRenderingContext;
    private _framebuffer: WebGLFramebuffer | null = null;
    private _colorTexture: Texture | null = null;
    private _depthBuffer: WebGLRenderbuffer | null = null;
    private _width: number;
    private _height: number;
    private _device: WebGLDevice;

    constructor(device: WebGLDevice, options?: { width?: number; height?: number }) {
        super();
        this._device = device;
        this._gl = device.gl;
        this._width = options?.width || 1024;
        this._height = options?.height || 1024;
        this._framebuffer = this._gl.createFramebuffer();
        if (!this._framebuffer) {
            throw new Error('Failed to create framebuffer');
        }
    }

    attachTexture(texture: Texture): void {
        if (!this._framebuffer) return;
        this._colorTexture = texture;
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._framebuffer);
        this._gl.framebufferTexture2D(
            this._gl.FRAMEBUFFER,
            this._gl.COLOR_ATTACHMENT0,
            this._gl.TEXTURE_2D,
            texture.glTexture,
            0
        );
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
    }

    attachDepthBuffer(): void {
        if (!this._framebuffer) return;
        this._depthBuffer = this._gl.createRenderbuffer();
        this._gl.bindRenderbuffer(this._gl.RENDERBUFFER, this._depthBuffer);
        this._gl.renderbufferStorage(this._gl.RENDERBUFFER, this._gl.DEPTH_COMPONENT16, this._width, this._height);
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._framebuffer);
        this._gl.framebufferRenderbuffer(
            this._gl.FRAMEBUFFER,
            this._gl.DEPTH_ATTACHMENT,
            this._gl.RENDERBUFFER,
            this._depthBuffer
        );
        this._gl.bindRenderbuffer(this._gl.RENDERBUFFER, null);
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
    }

    bind(): void {
        if (!this._framebuffer) return;
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._framebuffer);
        this._gl.viewport(0, 0, this._width, this._height);
    }

    unbind(): void {
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
    }

    resize(width: number, height: number): void {
        this._width = width;
        this._height = height;
        if (this._colorTexture) {
            this._colorTexture.resize(width, height);
            this.attachTexture(this._colorTexture);
        }
        if (this._depthBuffer) {
            this._gl.bindRenderbuffer(this._gl.RENDERBUFFER, this._depthBuffer);
            this._gl.renderbufferStorage(this._gl.RENDERBUFFER, this._gl.DEPTH_COMPONENT16, width, height);
            this._gl.bindRenderbuffer(this._gl.RENDERBUFFER, null);
        }
    }

    get width(): number {
        return this._width;
    }

    get height(): number {
        return this._height;
    }

    get framebuffer(): WebGLFramebuffer | null {
        return this._framebuffer;
    }

    destroy(): void {
        if (this._framebuffer) {
            this._gl.deleteFramebuffer(this._framebuffer);
            this._framebuffer = null;
        }
        if (this._depthBuffer) {
            this._gl.deleteRenderbuffer(this._depthBuffer);
            this._depthBuffer = null;
        }
        this.emit('destroy');
    }
}
