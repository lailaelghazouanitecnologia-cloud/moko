import { Texture } from './texture';
import { GraphicsDevice } from './graphics-device';

export class RenderTarget {
    private framebuffer: WebGLFramebuffer;
    private colorTexture: Texture;
    private depthTexture: Texture;
    private width: number;
    private height: number;
    private hasDepth: boolean;
    private hasStencil: boolean;
    private device: GraphicsDevice;
    private gl: WebGL2RenderingContext;

    private constructor(device: GraphicsDevice, width: number, height: number, options?: {
        hasDepth?: boolean;
        hasStencil?: boolean;
        colorFormat?: number;
        depthFormat?: number;
    }) {
        this.device = device;
        this.gl = device.gl as WebGL2RenderingContext;
        this.width = width;
        this.height = height;
        this.hasDepth = options?.hasDepth ?? true;
        this.hasStencil = options?.hasStencil ?? false;

        this.framebuffer = this.gl.createFramebuffer()!;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);

        const colorFormat = options?.colorFormat ?? this.gl.RGBA;
        this.colorTexture = new Texture(device, {
            width: width,
            height: height,
            format: colorFormat,
            mipmaps: false,
            wrapU: this.gl.CLAMP_TO_EDGE,
            wrapV: this.gl.CLAMP_TO_EDGE,
            minFilter: this.gl.LINEAR,
            magFilter: this.gl.LINEAR
        });

        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D,
            this.colorTexture.getGLTexture(),
            0
        );

        if (this.hasDepth) {
            const depthFormat = options?.depthFormat ?? (this.hasStencil ? this.gl.DEPTH24_STENCIL8 : this.gl.DEPTH_COMPONENT24);
            const attachmentPoint = this.hasStencil ? this.gl.DEPTH_STENCIL_ATTACHMENT : this.gl.DEPTH_ATTACHMENT;

            this.depthTexture = new Texture(device, {
                width: width,
                height: height,
                format: depthFormat,
                mipmaps: false,
                wrapU: this.gl.CLAMP_TO_EDGE,
                wrapV: this.gl.CLAMP_TO_EDGE,
                minFilter: this.gl.NEAREST,
                magFilter: this.gl.NEAREST
            });

            this.gl.framebufferTexture2D(
                this.gl.FRAMEBUFFER,
                attachmentPoint,
                this.gl.TEXTURE_2D,
                this.depthTexture.getGLTexture(),
                0
            );
        }

        const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
            throw new Error(`Framebuffer incomplete: ${status}`);
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    static create(width: number, height: number, options?: {
        hasDepth?: boolean;
        hasStencil?: boolean;
        colorFormat?: number;
        depthFormat?: number;
    }): RenderTarget {
        const device = GraphicsDevice.getInstance();
        return new RenderTarget(device, width, height, options);
    }

    bind(): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.viewport(0, 0, this.width, this.height);
    }

    unbind(): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    resize(width: number, height: number): void {
        if (width === this.width && height === this.height) return;

        this.width = width;
        this.height = height;

        this.colorTexture.destroy();
        this.colorTexture = new Texture(this.device, {
            width: width,
            height: height,
            format: this.gl.RGBA,
            mipmaps: false,
            wrapU: this.gl.CLAMP_TO_EDGE,
            wrapV: this.gl.CLAMP_TO_EDGE,
            minFilter: this.gl.LINEAR,
            magFilter: this.gl.LINEAR
        });

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D,
            this.colorTexture.getGLTexture(),
            0
        );

        if (this.hasDepth) {
            this.depthTexture.destroy();
            const depthFormat = this.hasStencil ? this.gl.DEPTH24_STENCIL8 : this.gl.DEPTH_COMPONENT24;
            const attachmentPoint = this.hasStencil ? this.gl.DEPTH_STENCIL_ATTACHMENT : this.gl.DEPTH_ATTACHMENT;

            this.depthTexture = new Texture(this.device, {
                width: width,
                height: height,
                format: depthFormat,
                mipmaps: false,
                wrapU: this.gl.CLAMP_TO_EDGE,
                wrapV: this.gl.CLAMP_TO_EDGE,
                minFilter: this.gl.NEAREST,
                magFilter: this.gl.NEAREST
            });

            this.gl.framebufferTexture2D(
                this.gl.FRAMEBUFFER,
                attachmentPoint,
                this.gl.TEXTURE_2D,
                this.depthTexture.getGLTexture(),
                0
            );
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    getColorTexture(): Texture {
        return this.colorTexture;
    }

    getDepthTexture(): Texture {
        return this.depthTexture;
    }

    destroy(): void {
        if (this.framebuffer) {
            this.gl.deleteFramebuffer(this.framebuffer);
            this.framebuffer = null!;
        }
        if (this.colorTexture) {
            this.colorTexture.destroy();
            this.colorTexture = null!;
        }
        if (this.depthTexture) {
            this.depthTexture.destroy();
            this.depthTexture = null!;
        }
    }
}
