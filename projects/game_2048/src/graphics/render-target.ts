class RenderTarget {
    width: number;
    height: number;
    colorTexture: Texture;
    depthTexture: Texture;
    framebuffer: WebGLFramebuffer;

    private _gl: WebGLRenderingContext;

    /**
     * Creates a new RenderTarget instance.
     * @param width - The width of the render target in pixels
     * @param height - The height of the render target in pixels
     * @param colorTexture - The color texture attached to this render target
     * @param depthTexture - The depth texture attached to this render target (optional)
     * @param framebuffer - The WebGL framebuffer object
     * @param gl - The WebGL rendering context
     */
    constructor(width: number, height: number, colorTexture: Texture, depthTexture: Texture, framebuffer: WebGLFramebuffer, gl: WebGLRenderingContext) {
        this.width = width;
        this.height = height;
        this.colorTexture = colorTexture;
        this.depthTexture = depthTexture;
        this.framebuffer = framebuffer;
        this._gl = gl;
    }

    /**
     * Factory method to create a new render target with color and optional depth buffer
     * @param device - The graphics device
     * @param width - Width of the render target
     * @param height - Height of the render target
     * @param depth - Whether to create a depth buffer (default: false)
     * @returns A new RenderTarget instance
     * @throws Error if WebGL context is not available or framebuffer creation fails
     */
    static create(device: GraphicsDevice, width: number, height: number, depth: boolean = false): RenderTarget {
        if (!device) {
            throw new Error('GraphicsDevice is required');
        }

        if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) {
            throw new Error('Width and height must be positive finite numbers');
        }

        const gl = (device as any).gl || (device as any)._gl;
        if (!gl) {
            throw new Error('GraphicsDevice must provide WebGL context');
        }

        const framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            throw new Error('Failed to create framebuffer');
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        const colorTexture = new Texture(device, {
            width,
            height,
            format: 'rgba8',
            mipmaps: false
        });

        const colorTextureHandle = (colorTexture as any).gpuHandle || (colorTexture as any)._texture;
        if (!colorTextureHandle) {
            gl.deleteFramebuffer(framebuffer);
            colorTexture.destroy();
            throw new Error('Failed to get color texture handle');
        }

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTextureHandle, 0);

        let depthTexture: Texture;
        if (depth) {
            depthTexture = new Texture(device, {
                width,
                height,
                format: 'depth',
                mipmaps: false
            });
            
            const depthTextureHandle = (depthTexture as any).gpuHandle || (depthTexture as any)._texture;
            if (!depthTextureHandle) {
                gl.deleteFramebuffer(framebuffer);
                colorTexture.destroy();
                depthTexture.destroy();
                throw new Error('Failed to get depth texture handle');
            }
            
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTextureHandle, 0);
        } else {
            depthTexture = null as any;
        }

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            gl.deleteFramebuffer(framebuffer);
            colorTexture.destroy();
            if (depthTexture) depthTexture.destroy();
            throw new Error(`Framebuffer incomplete: ${status}`);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return new RenderTarget(width, height, colorTexture, depthTexture, framebuffer, gl);
    }

    /**
     * Destroys the render target and releases all GPU resources
     */
    destroy(): void {
        if (this.framebuffer) {
            this._gl.deleteFramebuffer(this.framebuffer);
            this.framebuffer = null as any;
        }
        if (this.colorTexture) {
            this.colorTexture.destroy();
            this.colorTexture = null as any;
        }
        if (this.depthTexture) {
            this.depthTexture.destroy();
            this.depthTexture = null as any;
        }
    }

    /**
     * Resizes the render target and its textures
     * @param width - New width in pixels
     * @param height - New height in pixels
     * @throws Error if dimensions are invalid
     */
    resize(width: number, height: number): void {
        if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) {
            throw new Error('Width and height must be positive finite numbers');
        }

        this.width = width;
        this.height = height;

        if (this.colorTexture) {
            this.colorTexture.resize(width, height);
        }
        if (this.depthTexture) {
            this.depthTexture.resize(width, height);
        }
    }

    /**
     * Gets the color texture attached to this render target
     * @returns The color texture
     */
    getColorTexture(): Texture {
        return this.colorTexture;
    }

    /**
     * Gets the depth texture attached to this render target
     * @returns The depth texture, or null if none exists
     */
    getDepthTexture(): Texture {
        return this.depthTexture;
    }

    /**
     * Binds this render target as the active framebuffer
     * @param device - The graphics device
     * @throws Error if device is invalid
     */
    bind(device: GraphicsDevice): void {
        if (!device) {
            throw new Error('GraphicsDevice is required');
        }

        const gl = (device as any).gl || (device as any)._gl;
        if (!gl) {
            throw new Error('GraphicsDevice must provide WebGL context');
        }

        if (!this.framebuffer) {
            throw new Error('RenderTarget has been destroyed');
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.viewport(0, 0, this.width, this.height);
    }

    /**
     * Unbinds this render target and restores the default framebuffer
     * @param device - The graphics device
     * @throws Error if device is invalid
     */
    unbind(device: GraphicsDevice): void {
        if (!device) {
            throw new Error('GraphicsDevice is required');
        }

        const gl = (device as any).gl || (device as any)._gl;
        if (!gl) {
            throw new Error('GraphicsDevice must provide WebGL context');
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}

export { RenderTarget };
