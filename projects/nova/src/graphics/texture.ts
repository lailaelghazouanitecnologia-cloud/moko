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
    private _mipmaps: boolean;
    private _wrapS: number;
    private _wrapT: number;
    private _minFilter: number;
    private _magFilter: number;
    private _anisotropy: number;
    private _needsUpload: boolean = true;

    constructor(
        device: WebGLDevice,
        options: {
            width?: number;
            height?: number;
            format?: number;
            type?: number;
            mipmaps?: boolean;
            wrapS?: number;
            wrapT?: number;
            minFilter?: number;
            magFilter?: number;
            anisotropy?: number;
        } = {}
    ) {
        this._device = device;
        this._gl = device.gl;
        
        this._width = options.width || 1;
        this._height = options.height || 1;
        this._format = options.format || this._gl.RGBA;
        this._internalFormat = this._format;
        this._type = options.type || this._gl.UNSIGNED_BYTE;
        this._mipmaps = options.mipmaps !== false;
        this._wrapS = options.wrapS || this._gl.CLAMP_TO_EDGE;
        this._wrapT = options.wrapT || this._gl.CLAMP_TO_EDGE;
        this._minFilter = options.minFilter || (this._mipmaps ? this._gl.LINEAR_MIPMAP_LINEAR : this._gl.LINEAR);
        this._magFilter = options.magFilter || this._gl.LINEAR;
        this._anisotropy = options.anisotropy || 1;

        this._texture = this._gl.createTexture();
        if (!this._texture) {
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

    get type(): number {
        return this._type;
    }

    get mipmaps(): boolean {
        return this._mipmaps;
    }

    get wrapS(): number {
        return this._wrapS;
    }

    get wrapT(): number {
        return this._wrapT;
    }

    get minFilter(): number {
        return this._minFilter;
    }

    get magFilter(): number {
        return this._magFilter;
    }

    get anisotropy(): number {
        return this._anisotropy;
    }

    get glTexture(): WebGLTexture | null {
        return this._texture;
    }

    setData(data: ArrayBufferView | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | null): void {
        this._needsUpload = true;
        this._device.activeTexture(this._device.maxTextureUnits - 1);
        this._device.bindTexture(this);
        
        if (data instanceof HTMLImageElement || data instanceof HTMLCanvasElement || data instanceof HTMLVideoElement) {
            this._width = data.width;
            this._height = data.height;
            this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._internalFormat, this._format, this._type, data);
        } else if (data) {
            this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._internalFormat, this._width, this._height, 0, this._format, this._type, data);
        } else {
            this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._internalFormat, this._width, this._height, 0, this._format, this._type, null);
        }

        if (this._mipmaps && this._isPowerOfTwo(this._width) && this._isPowerOfTwo(this._height)) {
            this._gl.generateMipmap(this._gl.TEXTURE_2D);
        }

        this._needsUpload = false;
    }

    bind(unit: number): void {
        this._device.activeTexture(unit);
        this._device.bindTexture(this);
    }

    upload(): void {
        if (!this._needsUpload || !this._texture) return;

        this._device.activeTexture(this._device.maxTextureUnits - 1);
        this._device.bindTexture(this);

        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, this._wrapS);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, this._wrapT);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, this._minFilter);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, this._magFilter);

        if (this._device.extTextureFilterAnisotropic && this._anisotropy > 1) {
            this._gl.texParameterf(
                this._gl.TEXTURE_2D,
                this._device.extTextureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
                Math.min(this._anisotropy, this._device.maxAnisotropy)
            );
        }

        this._needsUpload = false;
    }

    dispose(): void {
        if (this._texture) {
            this._gl.deleteTexture(this._texture);
            this._texture = null;
        }
    }

    private _isPowerOfTwo(value: number): boolean {
        return (value & (value - 1)) === 0;
    }
}
