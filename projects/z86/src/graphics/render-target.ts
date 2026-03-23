import { GraphicsDevice } from './graphics-device';
import { Texture } from './texture';

export class RenderTarget {
    private _device: GraphicsDevice;
    private _glFramebuffer: WebGLFramebuffer | null;
    private _colorBuffers: Texture[];
    private _depthBuffer: Texture | null;
    private _width: number;
    private _height: number;
    private _samples: number;

    constructor(device: GraphicsDevice, options: {
        colorBuffers?: Texture[],
        depthBuffer?: Texture,
        width?: number,
        height?: number,
        samples?: number
    } = {}) {
        this._device = device;
        this._colorBuffers = options.colorBuffers || [];
        this._depthBuffer = options.depthBuffer || null;
        this._width = options.width || 0;
        this._height = options.height || 0;
        this._samples = options.samples || 1;
        this._glFramebuffer = null;

        this._createFramebuffer();
    }

    private _createFramebuffer(): void {
        const gl = (this._device as any).gl;
        if (!gl) return;

        this._glFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);

        this._colorBuffers.forEach((texture, index) => {
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER,
                gl.COLOR_ATTACHMENT0 + index,
                gl.TEXTURE_2D,
                (texture as any)._glTexture,
                0
            );
        });

        if (this._depthBuffer) {
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER,
                gl.DEPTH_ATTACHMENT,
                gl.TEXTURE_2D,
                (this._depthBuffer as any)._glTexture,
                0
            );
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

    get samples(): number {
        return this._samples;
    }

    get colorBuffers(): Texture[] {
        return this._colorBuffers;
    }

    get depthBuffer(): Texture | null {
        return this._depthBuffer;
    }

    destroy(): void {
        if (this._glFramebuffer) {
            const gl = (this._device as any).gl;
            gl.deleteFramebuffer(this._glFramebuffer);
            this._glFramebuffer = null;
        }
    }
}
