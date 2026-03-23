import { Texture } from './texture';

export class RenderTarget {
    gl: WebGL2RenderingContext;
    framebuffer: WebGLFramebuffer;
    colorBuffer: Texture | null;
    depthBuffer: WebGLRenderbuffer | null;
    width: number;
    height: number;

    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        this.gl = gl;
        this.width = width;
        this.height = height;
        this.framebuffer = gl.createFramebuffer()!;
        this.colorBuffer = null;
        this.depthBuffer = null;
    }

    bind(): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    }

    unbind(): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    resize(w: number, h: number): void {
        this.width = w;
        this.height = h;

        if (this.colorBuffer) {
            this.colorBuffer.resize(w, h);
        }

        if (this.depthBuffer) {
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthBuffer);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, w, h);
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        }
    }

    readPixels(x: number, y: number, w: number, h: number, data: Uint8Array): void {
        this.bind();
        this.gl.readPixels(x, y, w, h, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
        this.unbind();
    }

    destroy(): void {
        if (this.colorBuffer) {
            this.colorBuffer.destroy();
            this.colorBuffer = null;
        }

        if (this.depthBuffer) {
            this.gl.deleteRenderbuffer(this.depthBuffer);
            this.depthBuffer = null;
        }

        this.gl.deleteFramebuffer(this.framebuffer);
    }

    static createColor(gl: WebGL2RenderingContext, w: number, h: number): RenderTarget {
        const rt = new RenderTarget(gl, w, h);
        
        const colorTexture = new Texture(gl);
        colorTexture.setSize(w, h);
        colorTexture.setFormat(gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
        colorTexture.setFiltering(gl.LINEAR, gl.LINEAR);
        colorTexture.setWrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
        colorTexture.uploadData(null);
        
        rt.colorBuffer = colorTexture;
        
        rt.bind();
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture.texture, 0);
        rt.unbind();
        
        return rt;
    }

    static createColorDepth(gl: WebGL2RenderingContext, w: number, h: number): RenderTarget {
        const rt = RenderTarget.createColor(gl, w, h);
        
        const depthBuffer = gl.createRenderbuffer()!;
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        
        rt.depthBuffer = depthBuffer;
        
        rt.bind();
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
        rt.unbind();
        
        return rt;
    }
}
