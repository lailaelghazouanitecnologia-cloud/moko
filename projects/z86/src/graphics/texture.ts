import { GraphicsDevice } from './graphics_device';
import { WebglGraphicsDevice } from './webgl_graphics_device';

export class Texture {
  private _device: GraphicsDevice;
  private _handle: WebGLTexture | null = null;
  private _width: number;
  private _height: number;
  private _format: number;
  private _internalFormat: number;
  private _type: number;
  private _minFilter: number;
  private _magFilter: number;
  private _wrapS: number;
  private _wrapT: number;
  private _mipmaps: boolean;

  constructor(
    device: GraphicsDevice,
    width: number,
    height: number,
    format: number,
    internalFormat: number,
    type: number,
    minFilter: number,
    magFilter: number,
    wrapS: number,
    wrapT: number,
    mipmaps: boolean
  ) {
    this._device = device;
    this._width = width;
    this._height = height;
    this._format = format;
    this._internalFormat = internalFormat;
    this._type = type;
    this._minFilter = minFilter;
    this._magFilter = magFilter;
    this._wrapS = wrapS;
    this._wrapT = wrapT;
    this._mipmaps = mipmaps;
  }

  get handle(): WebGLTexture | null {
    return this._handle;
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

  get minFilter(): number {
    return this._minFilter;
  }

  get magFilter(): number {
    return this._magFilter;
  }

  get wrapS(): number {
    return this._wrapS;
  }

  get wrapT(): number {
    return this._wrapT;
  }

  get mipmaps(): boolean {
    return this._mipmaps;
  }

  bind(unit: number): void {
    const gl = (this._device as WebglGraphicsDevice).gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this._handle);
  }

  upload(data: ArrayBufferView | null): void {
    const gl = (this._device as WebglGraphicsDevice).gl;
    if (!this._handle) {
      this._handle = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, this._handle);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this._internalFormat,
      this._width,
      this._height,
      0,
      this._format,
      this._type,
      data
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this._minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this._magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this._wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this._wrapT);
    if (this._mipmaps) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
  }

  dispose(): void {
    const gl = (this._device as WebglGraphicsDevice).gl;
    if (this._handle) {
      gl.deleteTexture(this._handle);
      this._handle = null;
    }
  }
}
