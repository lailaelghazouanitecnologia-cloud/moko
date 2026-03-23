import { GraphicsDevice } from './graphicsdevice';
import { Texture } from './texture';

export class RenderTarget {
  private _device: GraphicsDevice;
  private _framebuffer: WebGLFramebuffer | null = null;
  private _colorTexture: Texture | null = null;
  private _depthBuffer: WebGLRenderbuffer | null = null;
  private _width: number = 0;
  private _height: number = 0;

  constructor(device: GraphicsDevice) {
    this._device = device;
    const gl = (device as any).gl as WebGLRenderingContext;
    this._framebuffer = gl.createFramebuffer();
    if (!this._framebuffer) {
      throw new Error('Failed to create framebuffer');
    }
  }

  attachTexture(texture: Texture): void {
    if (!this._framebuffer) {
      throw new Error('Framebuffer not initialized');
    }
    const gl = (this._device as any).gl as WebGLRenderingContext;
    this._colorTexture = texture;
    this._width = texture.width;
    this._height = texture.height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      (texture as any).texture as WebGLTexture,
      0
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  attachDepthBuffer(): void {
    if (!this._framebuffer) {
      throw new Error('Framebuffer not initialized');
    }
    const gl = (this._device as any).gl as WebGLRenderingContext;
    this._depthBuffer = gl.createRenderbuffer();
    if (!this._depthBuffer) {
      throw new Error('Failed to create depth buffer');
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, this._depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this._width, this._height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      this._depthBuffer
    );
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  bind(): void {
    if (!this._framebuffer) {
      throw new Error('Framebuffer not initialized');
    }
    const gl = (this._device as any).gl as WebGLRenderingContext;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
  }

  unbind(): void {
    const gl = (this._device as any).gl as WebGLRenderingContext;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    if (this._colorTexture) {
      (this._colorTexture as any).resize(width, height);
    }
    if (this._depthBuffer) {
      const gl = (this._device as any).gl as WebGLRenderingContext;
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._depthBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  destroy(): void {
    if (this._framebuffer) {
      const gl = (this._device as any).gl as WebGLRenderingContext;
      gl.deleteFramebuffer(this._framebuffer);
      this._framebuffer = null;
    }
    if (this._depthBuffer) {
      const gl = (this._device as any).gl as WebGLRenderingContext;
      gl.deleteRenderbuffer(this._depthBuffer);
      this._depthBuffer = null;
    }
  }
}
