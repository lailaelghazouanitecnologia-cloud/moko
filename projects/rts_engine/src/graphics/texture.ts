/**
 * Represents a GPU texture resource.
 */
export interface Texture {
    /**
     * Uploads raw pixel data to the texture.
     * @param data - Raw pixel data in RGBA format. Length must be width * height * 4.
     * @throws {TypeError} If data is not a Uint8Array.
     * @throws {RangeError} If data length does not match texture dimensions.
     */
    setData(data: Uint8Array): void;

    /**
     * Returns the width of the texture in pixels.
     * @returns The width in pixels.
     */
    getWidth(): number;

    /**
     * Returns the height of the texture in pixels.
     * @returns The height in pixels.
     */
    getHeight(): number;
}

/**
 * Concrete implementation of a Texture.
 */
export class TextureImpl implements Texture {
    private _width: number;
    private _height: number;
    private _gl: WebGLRenderingContext;
    private _texture: WebGLTexture | null;

    constructor(gl: WebGLRenderingContext, width: number, height: number) {
        if (!gl) {
            throw new TypeError('WebGLRenderingContext is required');
        }
        if (!Number.isInteger(width) || width <= 0) {
            throw new RangeError('Width must be a positive integer');
        }
        if (!Number.isInteger(height) || height <= 0) {
            throw new RangeError('Height must be a positive integer');
        }

        this._gl = gl;
        this._width = width;
        this._height = height;
        this._texture = this._createTexture();
        if (!this._texture) {
            throw new Error('Failed to create WebGL texture');
        }
    }

    setData(data: Uint8Array): void {
        if (!(data instanceof Uint8Array)) {
            throw new TypeError('Expected Uint8Array for data');
        }
        const expectedLength = this._width * this._height * 4;
        if (data.length !== expectedLength) {
            throw new RangeError(
                `Data length ${data.length} does not match texture dimensions (expected ${expectedLength})`
            );
        }
        if (!this._texture) {
            throw new Error('Texture has been destroyed');
        }

        const gl = this._gl;
        gl.bindTexture(gl.TEXTURE_2D, this._texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this._width,
            this._height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    getWidth(): number {
        return this._width;
    }

    getHeight(): number {
        return this._height;
    }

    /**
     * Destroys the underlying WebGL texture and releases GPU resources.
     */
    destroy(): void {
        if (this._texture) {
            this._gl.deleteTexture(this._texture);
            this._texture = null;
        }
    }

    private _createTexture(): WebGLTexture | null {
        const gl = this._gl;
        const texture = gl.createTexture();
        if (!texture) return null;

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }
}
