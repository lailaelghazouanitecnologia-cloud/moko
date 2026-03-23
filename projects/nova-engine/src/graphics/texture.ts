import { GraphicsDevice } from './GraphicsDevice';

export class Texture {
    private texture: WebGLTexture;
    private width: number;
    private height: number;
    private format: number;
    private internalFormat: number;
    private type: number;
    private minFilter: number;
    private magFilter: number;
    private wrapS: number;
    private wrapT: number;
    private anisotropy: number;
    private mipmaps: boolean;
    private device: GraphicsDevice;
    private gl: WebGL2RenderingContext;
    private needsUpdate: boolean;

    constructor(device: GraphicsDevice) {
        this.device = device;
        this.gl = device.getGl();
        const texture = this.gl.createTexture();
        if (!texture) {
            throw new Error('Failed to create WebGL texture');
        }
        this.texture = texture;
        this.width = 0;
        this.height = 0;
        this.format = this.gl.RGBA;
        this.internalFormat = this.gl.RGBA;
        this.type = this.gl.UNSIGNED_BYTE;
        this.minFilter = this.gl.NEAREST;
        this.magFilter = this.gl.NEAREST;
        this.wrapS = this.gl.CLAMP_TO_EDGE;
        this.wrapT = this.gl.CLAMP_TO_EDGE;
        this.anisotropy = 1;
        this.mipmaps = false;
        this.needsUpdate = false;
    }

    bind(unit: number): void {
        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }

    unbind(unit: number): void {
        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    setImage(image: HTMLImageElement | HTMLCanvasElement | ImageData): void {
        this.width = image.width;
        this.height = image.height;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        if (image instanceof ImageData) {
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.internalFormat, this.width, this.height, 0, this.format, this.type, image.data);
        } else {
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.internalFormat, this.format, this.type, image);
        }
        if (this.mipmaps) {
            this.gl.generateMipmap(this.gl.TEXTURE_2D);
        }
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.needsUpdate = true;
    }

    setData(data: ArrayBufferView, level: number = 0): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, level, this.internalFormat, this.width, this.height, 0, this.format, this.type, data);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.needsUpdate = true;
    }

    generateMipmap(): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.mipmaps = true;
    }

    setFilters(minFilter: number, magFilter: number): void {
        this.minFilter = minFilter;
        this.magFilter = magFilter;
        this.needsUpdate = true;
    }

    setWrap(wrapS: number, wrapT: number): void {
        this.wrapS = wrapS;
        this.wrapT = wrapT;
        this.needsUpdate = true;
    }

    setAnisotropy(level: number): void {
        this.anisotropy = level;
        this.needsUpdate = true;
    }

    update(): void {
        if (!this.needsUpdate) return;
        
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.minFilter);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.magFilter);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.wrapS);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.wrapT);
        
        const ext = this.gl.getExtension('EXT_texture_filter_anisotropic');
        if (ext && this.anisotropy > 1) {
            this.gl.texParameterf(this.gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropy);
        }
        
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.needsUpdate = false;
    }

    destroy(): void {
        if (this.texture) {
            this.gl.deleteTexture(this.texture);
            this.texture = null!;
        }
    }

    static fromImage(image: HTMLImageElement): Promise<Texture> {
        return new Promise((resolve, reject) => {
            if (image.complete) {
                const device = GraphicsDevice.getInstance();
                const texture = new Texture(device);
                texture.setImage(image);
                resolve(texture);
            } else {
                image.onload = () => {
                    const device = GraphicsDevice.getInstance();
                    const texture = new Texture(device);
                    texture.setImage(image);
                    resolve(texture);
                };
                image.onerror = reject;
            }
        });
    }

    static fromFile(path: string): Promise<Texture> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                Texture.fromImage(img).then(resolve).catch(reject);
            };
            img.onerror = reject;
            img.src = path;
        });
    }

    static create(width: number, height: number, format: number = WebGL2RenderingContext.RGBA): Texture {
        const device = GraphicsDevice.getInstance();
        const texture = new Texture(device);
        texture.width = width;
        texture.height = height;
        texture.format = format;
        texture.internalFormat = format;
        
        const gl = device.getGl();
        gl.bindTexture(gl.TEXTURE_2D, texture.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, gl.UNSIGNED_BYTE, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        
        return texture;
    }

    getWidth(): number { return this.width; }
    getHeight(): number { return this.height; }
    getFormat(): number { return this.format; }
    getInternalFormat(): number { return this.internalFormat; }
    getType(): number { return this.type; }
    getMinFilter(): number { return this.minFilter; }
    getMagFilter(): number { return this.magFilter; }
    getWrapS(): number { return this.wrapS; }
    getWrapT(): number { return this.wrapT; }
    getAnisotropy(): number { return this.anisotropy; }
    hasMipmaps(): boolean { return this.mipmaps; }
}
