import { WebGL2RenderingContext } from './graphics-device';

export class Texture {
    private gl: WebGL2RenderingContext;
    private texture: WebGLTexture;
    private width: number;
    private height: number;
    private format: number;
    private internalFormat: number;
    private type: number;
    private wrapU: number;
    private wrapV: number;
    private minFilter: number;
    private magFilter: number;
    private anisotropy: number;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        this.texture = gl.createTexture()!;
        this.width = 0;
        this.height = 0;
        this.format = gl.RGBA;
        this.internalFormat = gl.RGBA;
        this.type = gl.UNSIGNED_BYTE;
        this.wrapU = gl.CLAMP_TO_EDGE;
        this.wrapV = gl.CLAMP_TO_EDGE;
        this.minFilter = gl.LINEAR;
        this.magFilter = gl.LINEAR;
        this.anisotropy = 1;
    }

    bind(unit: number): void {
        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }

    setFilters(min: number, mag: number): void {
        this.minFilter = min;
        this.magFilter = mag;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, min);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, mag);
    }

    setWrap(u: number, v: number): void {
        this.wrapU = u;
        this.wrapV = v;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, u);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, v);
    }

    generateMips(): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
    }

    upload(data: ArrayBufferView | HTMLImageElement): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        
        if (data instanceof HTMLImageElement) {
            this.width = data.width;
            this.height = data.height;
            this.gl.texImage2D(
                this.gl.TEXTURE_2D,
                0,
                this.internalFormat,
                this.format,
                this.type,
                data
            );
        } else {
            const buffer = data as ArrayBufferView;
            const size = Math.sqrt(buffer.byteLength / 4);
            this.width = size;
            this.height = size;
            this.gl.texImage2D(
                this.gl.TEXTURE_2D,
                0,
                this.internalFormat,
                this.width,
                this.height,
                0,
                this.format,
                this.type,
                buffer
            );
        }
    }

    uploadSub(x: number, y: number, w: number, h: number, data: ArrayBufferView): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texSubImage2D(
            this.gl.TEXTURE_2D,
            0,
            x,
            y,
            w,
            h,
            this.format,
            this.type,
            data
        );
    }

    destroy(): void {
        if (this.texture) {
            this.gl.deleteTexture(this.texture);
            this.texture = null!;
        }
    }

    static fromImage(gl: WebGL2RenderingContext, img: HTMLImageElement): Texture {
        const texture = new Texture(gl);
        texture.upload(img);
        return texture;
    }

    static fromData(gl: WebGL2RenderingContext, w: number, h: number, data: Uint8Array): Texture {
        const texture = new Texture(gl);
        texture.width = w;
        texture.height = h;
        texture.upload(data);
        return texture;
    }
}
