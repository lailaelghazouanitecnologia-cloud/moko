import { WebGLDevice } from './webgl-device';

export class Texture {
    width: number;
    height: number;
    format: string;
    mipLevels: number;
    gpuHandle: any;

    private _gl: WebGLRenderingContext;
    private _target: number;
    private _internalFormat: number;
    _pixelFormat: number;
    private _pixelType: number;
    private _data: Map<number, ArrayBufferView>;

    /**
     * Creates a new Texture instance.
     * @param device - The WebGL device context.
     * @param options - Optional configuration for the texture.
     * @throws {Error} Throws if the device is not provided or does not have a valid WebGL context.
     */
    constructor(device: WebGLDevice, options?: {
        width?: number,
        height?: number,
        format?: string,
        mipLevels?: number,
        target?: number,
        internalFormat?: number,
        pixelFormat?: number,
        pixelType?: number
    }) {
        if (!device || !device.gl) {
            throw new Error('Invalid WebGL device provided.');
        }
        this._gl = device.gl;
        this.width = options?.width || 1;
        this.height = options?.height || 1;
        this.format = options?.format || 'rgba8';
        this.mipLevels = options?.mipLevels || 1;
        this._target = options?.target || this._gl.TEXTURE_2D;
        this._internalFormat = options?.internalFormat || this._gl.RGBA;
        this._pixelFormat = options?.pixelFormat || this._gl.RGBA;
        this._pixelType = options?.pixelType || this._gl.UNSIGNED_BYTE;
        this._data = new Map();

        this.gpuHandle = this._gl.createTexture();
        if (!this.gpuHandle) {
            throw new Error('Failed to create texture.');
        }
        this._gl.bindTexture(this._target, this.gpuHandle);
        this._gl.texParameteri(this._target, this._gl.TEXTURE_MIN_FILTER, this._gl.LINEAR);
        this._gl.texParameteri(this._target, this._gl.TEXTURE_MAG_FILTER, this._gl.LINEAR);
        this._gl.texParameteri(this._target, this._gl.TEXTURE_WRAP_S, this._gl.CLAMP_TO_EDGE);
        this._gl.texParameteri(this._target, this._gl.TEXTURE_WRAP_T, this._gl.CLAMP_TO_EDGE);
        this._gl.bindTexture(this._target, null);
    }

    /**
     * Uploads pixel data to the texture at the specified mip level.
     * @param data - The pixel data to upload.
     * @param mip - The mip level to upload to.
     * @throws {Error} Throws if data is not provided or if the texture handle is invalid.
     */
    setData(data: ArrayBufferView, mip: number): void {
        if (!data) {
            throw new Error('Data must be provided for setData.');
        }
        if (!this.gpuHandle) {
            throw new Error('Texture has been destroyed or not initialized.');
        }
        this._gl.bindTexture(this._target, this.gpuHandle);
        if (this._target === this._gl.TEXTURE_2D) {
            this._gl.texImage2D(
                this._target,
                mip,
                this._internalFormat,
                this.width >> mip,
                this.height >> mip,
                0,
                this._pixelFormat,
                this._pixelType,
                data
            );
        } else {
            this._gl.texImage2D(
                this._target,
                mip,
                this._internalFormat,
                this._pixelFormat,
                this._pixelType,
                data
            );
        }
        this._data.set(mip, data);
        this._gl.bindTexture(this._target, null);
    }

    /**
     * Reads back pixel data from the texture at the specified mip level.
     * @param mip - The mip level to read from.
     * @returns The pixel data for the mip level, or an empty array if not found.
     */
    getData(mip: number): ArrayBufferView {
        return this._data.get(mip) || new Uint8Array(0);
    }

    /**
     * Generates mipmaps for the texture.
     * @throws {Error} Throws if the texture handle is invalid.
     */
    generateMips(): void {
        if (!this.gpuHandle) {
            throw new Error('Texture has been destroyed or not initialized.');
        }
        this._gl.bindTexture(this._target, this.gpuHandle);
        this._gl.generateMipmap(this._target);
        this._gl.bindTexture(this._target, null);
    }

    /**
     * Binds the texture to the specified texture unit.
     * @param unit - The texture unit to bind to.
     * @throws {Error} Throws if the texture handle is invalid.
     */
    bind(unit: number): void {
        if (!this.gpuHandle) {
            throw new Error('Texture has been destroyed or not initialized.');
        }
        if (unit < 0 || unit >= this._gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) {
            throw new Error('Invalid texture unit specified.');
        }
        this._gl.activeTexture(this._gl.TEXTURE0 + unit);
        this._gl.bindTexture(this._target, this.gpuHandle);
    }

    /**
     * Destroys the texture and releases GPU memory.
     */
    destroy(): void {
        if (this.gpuHandle) {
            this._gl.deleteTexture(this.gpuHandle);
            this.gpuHandle = null;
        }
        this._data.clear();
    }

    /**
     * Resizes the texture to the specified dimensions.
     * @param w - The new width.
     * @param h - The new height.
     * @throws {Error} Throws if dimensions are invalid or texture handle is invalid.
     */
    resize(w: number, h: number): void {
        if (w <= 0 || h <= 0) {
            throw new Error('Width and height must be positive integers.');
        }
        if (!this.gpuHandle) {
            throw new Error('Texture has been destroyed or not initialized.');
        }
        this.width = w;
        this.height = h;
        this._gl.bindTexture(this._target, this.gpuHandle);
        if (this._target === this._gl.TEXTURE_2D) {
            this._gl.texImage2D(
                this._target,
                0,
                this._internalFormat,
                w,
                h,
                0,
                this._pixelFormat,
                this._pixelType,
                null
            );
        }
        this._gl.bindTexture(this._target, null);
    }
}
