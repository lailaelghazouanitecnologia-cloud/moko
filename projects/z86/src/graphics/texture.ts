import { EventEmitter } from '../core/event-emitter';
import { GraphicsDevice } from './graphics-device';

export class Texture extends EventEmitter {
  private _device: GraphicsDevice;
  private _gl: WebGLRenderingContext;
  private _webglTexture: WebGLTexture | null = null;
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
  private _anisotropy: number;
  private _needsUpload: boolean = true;

  constructor(device: GraphicsDevice, options: {
    width?: number;
    height?: number;
    format?: number;
    internalFormat?: number;
    type?: number;
    minFilter?: number;
    magFilter?: number;
    wrapS?: number;
    wrapT?: number;
    mipmaps?: boolean;
    anisotropy?: number;
  } = {}) {
    super();
    this._device = device;
    this._gl = (device as any).gl;
    this._width = options.width || 1;
    this._height = options.height || 1;
    this._format = options.format || this._gl.RGBA;
    this._internalFormat = options.internalFormat || this._gl.RGBA;
    this._type = options.type || this._gl.UNSIGNED_BYTE;
    this._minFilter = options.minFilter || this._gl.NEAREST;
    this._magFilter = options.magFilter || this._gl.NEAREST;
    this._wrapS = options.wrapS || this._gl.CLAMP_TO_EDGE;
    this._wrapT = options.wrapT || this._gl.CLAMP_TO_EDGE;
    this._mipmaps = options.mipmaps !== undefined ? options.mipmaps : false;
    this._anisotropy = options.anisotropy || 1;
    this._webglTexture = this._gl.createTexture();
    if (!this._webglTexture) {
      throw new Error('Failed to create WebGL texture');
    }
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

  get anisotropy(): number {
    return this._anisotropy;
  }

  set width(value: number) {
    if (this._width !== value) {
      this._width = value;
      this._needsUpload = true;
    }
  }

  set height(value: number) {
    if (this._height !== value) {
      this._height = value;
      this._needsUpload = true;
    }
  }

  set format(value: number) {
    if (this._format !== value) {
      this._format = value;
      this._needsUpload = true;
    }
  }

  set internalFormat(value: number) {
    if (this._internalFormat !== value) {
      this._internalFormat = value;
      this._needsUpload = true;
    }
  }

  set type(value: number) {
    if (this._type !== value) {
      this._type = value;
      this._needsUpload = true;
    }
  }

  set minFilter(value: number) {
    if (this._minFilter !== value) {
      this._minFilter = value;
      this._needsUpload = true;
    }
  }

  set magFilter(value: number) {
    if (this._magFilter !== value) {
      this._magFilter = value;
      this._needsUpload = true;
    }
  }

  set wrapS(value: number) {
    if (this._wrapS !== value) {
      this._wrapS = value;
      this._needsUpload = true;
    }
  }

  set wrapT(value: number) {
    if (this._wrapT !== value) {
      this._wrapT = value;
      this._needsUpload = true;
    }
  }

  set mipmaps(value: boolean) {
    if (this._mipmaps !== value) {
      this._mipmaps = value;
      this._needsUpload = true;
    }
  }

  set anisotropy(value: number) {
    if (this._anisotropy !== value) {
      this._anisotropy = value;
      this._needsUpload = true;
    }
  }

  bind(unit: number = 0): void {
    const gl = this._gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this._webglTexture);
    if (this._needsUpload) {
      this.upload();
    }
  }

  upload(data?: ArrayBufferView | null): void {
    const gl = this._gl;
    const texture = this._webglTexture;
    if (!texture) return;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, this._internalFormat, this._width, this._height, 0, this._format, this._type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this._minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this._magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this._wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this._wrapT);

    if (this._mipmaps) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    const ext = gl.getExtension('EXT_texture_filter_anisotropic');
    if (ext && this._anisotropy > 1) {
      gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(this._anisotropy, ext.maxAnisotropy || 16));
    }

    this._needsUpload = false;
  }

  dispose(): void {
    if (this._webglTexture) {
      this._gl.deleteTexture(this._webglTexture);
      this._webglTexture = null;
    }
    this.emit('dispose');
  }
}
