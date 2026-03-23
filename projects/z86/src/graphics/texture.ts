import { WebGLDevice } from './web-gl-device';

export class Texture {
    private _device: WebGLDevice;
    private _gl: WebGLRenderingContext;
    private _texture: WebGLTexture | null = null;
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
        device: WebGLDevice,
        width: number,
        height: number,
        format: number = WebGLRenderingContext.RGBA,
        internalFormat: number = WebGLRenderingContext.RGBA,
        type: number = WebGLRenderingContext.UNSIGNED_BYTE,
        minFilter: number = WebGLRenderingContext.LINEAR,
        magFilter: number = WebGLRenderingContext.LINEAR,
        wrapS: number = WebGLRenderingContext.CLAMP_TO_EDGE,
        wrapT: number = WebGLRenderingContext.CLAMP_TO_EDGE,
        mipmaps: boolean = false
    ) {
        this._device = device;
        this._gl = device.gl;
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

        this._texture = this._gl.createTexture();
        if (!this._texture) {
            throw new Error('Failed to create WebGL texture');
        }

        this.bind();
        this._gl.texImage2D(
            this._gl.TEXTURE_2D,
            0,
            this._internalFormat,
            this._width,
            this._height,
            0,
            this._format,
            this._type,
            null
        );
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, this._minFilter);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, this._magFilter);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, this._wrapS);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, this._wrapT);
        this.unbind();
    }

    get glTexture(): WebGLTexture | null {
        return this._texture;
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

    bind(unit: number = 0): void {
        this._gl.activeTexture(this._gl.TEXTURE0 + unit);
        this._gl.bindTexture(this._gl.TEXTURE_2D, this._texture);
    }

    unbind(unit: number = 0): void {
        this._gl.activeTexture(this._gl.TEXTURE0 + unit);
        this._gl.bindTexture(this._gl.TEXTURE_2D, null);
    }

    upload(data: ArrayBufferView, level: number = 0): void {
        this.bind();
        this._gl.texImage2D(
            this._gl.TEXTURE_2D,
            level,
            this._internalFormat,
            this._width >> level,
            this._height >> level,
            0,
            this._format,
            this._type,
            data
        );
        if (this._mipmaps && level === 0) {
            this._gl.generateMipmap(this._gl.TEXTURE_2D);
        }
        this.unbind();
    }

    dispose(): void {
        if (this._texture) {
            this._gl.deleteTexture(this._texture);
            this._texture = null;
        }
    }
}
