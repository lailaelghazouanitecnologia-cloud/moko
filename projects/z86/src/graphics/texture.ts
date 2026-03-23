import { WebGLDevice } from './web-gl-device';
import { EventEmitter } from '../core';

export class Texture extends EventEmitter {
  private _gl: WebGL2RenderingContext;
  private _texture: WebGLTexture | null = null;
  private _width: number;
  private _height: number;
  private _format: number;
  private _internalFormat: number;
  private _type: number;
  private _target: number;
  private _device: WebGLDevice;
  private _mipmaps: boolean;

  constructor(
    device: WebGLDevice,
    width: number,
    height: number,
    format: number = WebGL2RenderingContext.RGBA,
    internalFormat: number = WebGL2RenderingContext.RGBA,
    type: number = WebGL2RenderingContext.UNSIGNED_BYTE,
    mipmaps: boolean = true
  ) {
    super();
    this._device = device;
    this._gl = device.gl;
    this._width = width;
    this._height = height;
    this._format = format;
    this._internalFormat = internalFormat;
    this._type = type;
    this._target = WebGL2RenderingContext.TEXTURE_2D;
    this._mipmaps = mipmaps;

    this._texture = this._gl.createTexture();
    if (!this._texture) {
      throw new Error('Failed to create WebGL texture');
    }

    this._gl.bindTexture(this._target, this._texture);
    this._gl.texImage2D(
      this._target,
      0,
      this._internalFormat,
      this._width,
      this._height,
      0,
      this._format,
      this._type,
      null
    );

    this._setDefaultParameters();
  }

  private _setDefaultParameters(): void {
    this._gl.texParameteri(this._target, this._gl.TEXTURE_WRAP_S, this._gl.CLAMP_TO_EDGE);
    this._gl.texParameteri(this._target, this._gl.TEXTURE_WRAP_T, this._gl.CLAMP_TO_EDGE);
    this._gl.texParameteri(this._target, this._gl.TEXTURE_MIN_FILTER, this._mipmaps ? this._gl.LINEAR_MIPMAP_LINEAR : this._gl.LINEAR);
    this._gl.texParameteri(this._target, this._gl.TEXTURE_MAG_FILTER, this._gl.LINEAR);
  }

  bind(unit: number = 0): void {
    this._gl.activeTexture(this._gl.TEXTURE0 + unit);
    this._gl.bindTexture(this._target, this._texture);
  }

  upload(data: ArrayBufferView | null): void {
    if (!this._texture) return;

    this._gl.bindTexture(this._target, this._texture);
    this._gl.texImage2D(
      this._target,
      0,
      this._internalFormat,
      this._width,
      this._height,
      0,
      this._format,
      this._type,
      data
    );

    if (this._mipmaps && data) {
      this._gl.generateMipmap(this._target);
    }
  }

  dispose(): void {
    if (this._texture) {
      this._gl.deleteTexture(this._texture);
      this._texture = null;
    }
    this.emit('dispose');
    this.removeAllListeners();
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get format(): number {
    return this._format;
  }

  get internalFormat(): number {
    return this._internalFormat;
  }

  get type(): number {
    return this._type;
  }

  get glTexture(): WebGLTexture | null {
    return this._texture;
  }
}
