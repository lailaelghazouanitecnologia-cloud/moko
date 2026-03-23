import { GraphicsDevice } from './graphics-device';
import { Texture } from './texture';

export class RenderTarget {
    private _device: GraphicsDevice;
    private _width: number;
    private _height: number;
    private _colorBuffer: Texture | null;
    private _depthBuffer: Texture | null;
    private _glFramebuffer: WebGLFramebuffer | null;
    private _glDepthStencilBuffer: WebGLRenderbuffer | null;
    private _glColorBuffers: WebGLTexture[];

    constructor(device: GraphicsDevice, options: {
        width: number;
        height: number;
        colorBuffer?: Texture;
        depthBuffer?: Texture;
    }) {
        this._device = device;
        this._width = options.width;
        this._height = options.height;
        this._colorBuffer = options.colorBuffer || null;
        this._depthBuffer = options.depthBuffer || null;
        this._glFramebuffer = null;
        this._glDepthStencilBuffer = null;
        this._glColorBuffers = [];

        this._createFramebuffer();
    }

    private _createFramebuffer(): void {
        const gl = (this._device as any)._gl as WebGLRenderingContext;
        this._glFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);

        if (this._colorBuffer) {
            const colorTexture = (this._colorBuffer as any)._glTexture as WebGLTexture;
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
            this._glColorBuffers.push(colorTexture);
        }

        if (this._depthBuffer) {
            const depthTexture = (this._depthBuffer as any)._glTexture as WebGLTexture;
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
        } else {
            this._glDepthStencilBuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this._glDepthStencilBuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this._width, this._height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._glDepthStencilBuffer);
        }

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error(`Framebuffer incomplete: ${status}`);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    get width(): number {
        return this._width;
    }

    get height(): number {
        return this._height;
    }

    get colorBuffer(): Texture | null {
        return this._colorBuffer;
    }

    get depthBuffer(): Texture | null {
        return this._depthBuffer;
    }

    destroy(): void {
        const gl = (this._device as any)._gl as WebGLRenderingContext;
        
        if (this._glFramebuffer) {
            gl.deleteFramebuffer(this._glFramebuffer);
            this._glFramebuffer = null;
        }

        if (this._glDepthStencilBuffer) {
            gl.deleteRenderbuffer(this._glDepthStencilBuffer);
            this._glDepthStencilBuffer = null;
        }

        this._glColorBuffers.length = 0;
    }
}
