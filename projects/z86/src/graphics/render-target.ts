import { EventEmitter } from '../core';
import { Vec2, Vec4 } from '../math';
import { GraphicsDevice } from './graphics-device';
import { Texture } from './texture';

export class RenderTarget extends EventEmitter {
  private _device: GraphicsDevice;
  private _glFramebuffer: WebGLFramebuffer | null = null;
  private _colorTextures: Texture[] = [];
  private _depthTexture: Texture | null = null;
  private _width: number;
  private _height: number;
  private _samples: number;

  constructor(device: GraphicsDevice, options: {
    width: number;
    height: number;
    samples?: number;
    colorTextures?: Texture[];
    depthTexture?: Texture;
  }) {
    super();
    this._device = device;
    this._width = options.width;
    this._height = options.height;
    this._samples = options.samples || 1;
    this._colorTextures = options.colorTextures || [];
    this._depthTexture = options.depthTexture || null;

    const gl = (this._device as any).gl;
    this._glFramebuffer = gl.createFramebuffer();
    if (!this._glFramebuffer) {
      throw new Error('Failed to create WebGL framebuffer');
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);

    this._colorTextures.forEach((texture, index) => {
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0 + index,
        gl.TEXTURE_2D,
        (texture as any)._glTexture,
        0
      );
    });

    if (this._depthTexture) {
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.TEXTURE_2D,
        (this._depthTexture as any)._glTexture,
        0
      );
    }

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete: ${status}`);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  attachTexture(texture: Texture, attachment: number = 0): void {
    const gl = (this._device as any).gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0 + attachment,
      gl.TEXTURE_2D,
      (texture as any)._glTexture,
      0
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (attachment < this._colorTextures.length) {
      this._colorTextures[attachment] = texture;
    } else {
      this._colorTextures.push(texture);
    }
  }

  attachDepthBuffer(texture: Texture): void {
    const gl = (this._device as any).gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      (texture as any)._glTexture,
      0
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this._depthTexture = texture;
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

  get colorTextures(): Texture[] {
    return this._colorTextures.slice();
  }

  get depthTexture(): Texture | null {
    return this._depthTexture;
  }

  destroy(): void {
    if (this._glFramebuffer) {
      const gl = (this._device as any).gl;
      gl.deleteFramebuffer(this._glFramebuffer);
      this._glFramebuffer = null;
    }
    this._colorTextures = [];
    this._depthTexture = null;
  }
}
