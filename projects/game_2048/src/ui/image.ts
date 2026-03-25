import { Texture } from '../graphics/texture';
// UNRESOLVED: import { View } from '../core/view';

export class Image extends View {
    private _src: string;
    private _width: number;
    private _height: number;
    private _scaleMode: 'stretch' | 'cover' | 'contain';
    private _tint: string;
    private _texture: Texture | null;
    private _imageData: HTMLImageElement | null;
    private _canvas: HTMLCanvasElement | null;
    private _context: CanvasRenderingContext2D | null;

    constructor(id: string = '') {
        super(id);
        this._src = '';
        this._width = 0;
        this._height = 0;
        this._scaleMode = 'stretch';
        this._tint = '#ffffff';
        this._texture = null;
        this._imageData = null;
        this._canvas = null;
        this._context = null;
    }

    get src(): string {
        return this._src;
    }

    get width(): number {
        return this._width;
    }

    get height(): number {
        return this._height;
    }

    get scaleMode(): 'stretch' | 'cover' | 'contain' {
        return this._scaleMode;
    }

    get tint(): string {
        return this._tint;
    }

    /**
     * Asynchronously loads an image from the specified URL.
     * @param url - The URL of the image to load.
     * @returns A promise that resolves when the image has been loaded successfully.
     * @throws {Error} Throws an error if the image fails to load.
     */
    async load(url: string): Promise<void> {
        if (!url || typeof url !== 'string') {
            throw new Error('Invalid URL: must be a non-empty string');
        }

        this._src = url;
        
        return new Promise((resolve, reject) => {
            const img = new Image() as HTMLImageElement;
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    this._imageData = img;
                    this._width = img.width;
                    this._height = img.height;
                    
                    this._canvas = document.createElement('canvas');
                    this._canvas.width = img.width;
                    this._canvas.height = img.height;
                    this._context = this._canvas.getContext('2d');
                    
                    if (!this._context) {
                        throw new Error('Failed to get 2D context from canvas');
                    }
                    
                    this._context.drawImage(img, 0, 0);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            img.onabort = () => {
                reject(new Error(`Image loading aborted: ${url}`));
            };
            
            img.src = url;
        });
    }

    /**
     * Unloads the current image and releases associated resources.
     */
    unload(): void {
        this._src = '';
        this._width = 0;
        this._height = 0;
        this._imageData = null;
        this._texture = null;
        
        if (this._canvas) {
            this._canvas.width = 0;
            this._canvas.height = 0;
            this._canvas = null;
        }
        
        this._context = null;
    }

    /**
     * Resizes the image display dimensions.
     * @param w - The new width in pixels.
     * @param h - The new height in pixels.
     * @throws {Error} Throws an error if width or height are negative.
     */
    resize(w: number, h: number): void {
        if (!Number.isFinite(w) || !Number.isFinite(h)) {
            throw new Error('Width and height must be finite numbers');
        }
        
        if (w < 0 || h < 0) {
            throw new Error('Width and height must be non-negative');
        }
        
        this._width = w;
        this._height = h;
    }

    /**
     * Sets the scale mode for image rendering.
     * @param mode - The scale mode: 'stretch', 'cover', or 'contain'.
     * @throws {Error} Throws an error if mode is invalid.
     */
    setScaleMode(mode: string): void {
        if (!mode || typeof mode !== 'string') {
            throw new Error('Invalid scale mode: must be a non-empty string');
        }
        
        const validModes: Array<'stretch' | 'cover' | 'contain'> = ['stretch', 'cover', 'contain'];
        if (!validModes.includes(mode as any)) {
            throw new Error('Invalid scale mode. Must be one of: stretch, cover, contain');
        }
        
        this._scaleMode = mode as 'stretch' | 'cover' | 'contain';
    }

    /**
     * Sets the tint color for the image.
     * @param color - The color string (e.g., '#ffffff').
     * @throws {Error} Throws an error if color is invalid.
     */
    setTint(color: string): void {
        if (!color || typeof color !== 'string') {
            throw new Error('Invalid color: must be a non-empty string');
        }
        
        this._tint = color;
    }

    /**
     * Gets the RGBA values of the pixel at the specified coordinates.
     * @param x - The x-coordinate of the pixel.
     * @param y - The y-coordinate of the pixel.
     * @returns An array containing the RGBA values [r, g, b, a].
     * @throws {Error} Throws an error if no image is loaded or coordinates are out of bounds.
     */
    getPixel(x: number, y: number): number[] {
        if (!this._context || !this._canvas) {
            throw new Error('No image loaded');
        }
        
        if (!Number.isInteger(x) || !Number.isInteger(y)) {
            throw new Error('Coordinates must be integers');
        }
        
        if (x < 0 || x >= this._canvas.width || y < 0 || y >= this._canvas.height) {
            throw new Error('Coordinates out of bounds');
        }
        
        const imageData = this._context.getImageData(x, y, 1, 1);
        const data = imageData.data;
        
        return [data[0], data[1], data[2], data[3]];
    }

    /**
     * Renders the image to the provided canvas context.
     * @param ctx - The canvas rendering context.
     */
    render(ctx: CanvasRenderingContext2D): void {
        if (!ctx) {
            throw new Error('Invalid rendering context');
        }
        
        if (!this.visible || !this._imageData) {
            return;
        }
        
        ctx.save();
        
        if (this._tint !== '#ffffff') {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = this._tint;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        let sx = 0;
        let sy = 0;
        let sw = this._imageData.width;
        let sh = this._imageData.height;
        let dx = this.x;
        let dy = this.y;
        let dw = this.width;
        let dh = this.height;
        
        if (this._scaleMode === 'contain') {
            const scale = Math.min(dw / sw, dh / sh);
            const newWidth = sw * scale;
            const newHeight = sh * scale;
            dx += (dw - newWidth) / 2;
            dy += (dh - newHeight) / 2;
            dw = newWidth;
            dh = newHeight;
        } else if (this._scaleMode === 'cover') {
            const scale = Math.max(dw / sw, dh / sh);
            const newWidth = sw * scale;
            const newHeight = sh * scale;
            if (newWidth > dw) {
                const diff = newWidth - dw;
                sx = diff / 2 / scale;
                sw = sw - diff / scale;
            }
            if (newHeight > dh) {
                const diff = newHeight - dh;
                sy = diff / 2 / scale;
                sh = sh - diff / scale;
            }
        }
        
        ctx.drawImage(this._imageData, sx, sy, sw, sh, dx, dy, dw, dh);
        
        ctx.restore();
    }

    /**
     * Updates the image state.
     * @param dt - The delta time in seconds since the last update.
     */
    update(dt: number): void {
        if (!Number.isFinite(dt) || dt < 0) {
            throw new Error('Delta time must be a non-negative finite number');
        }
        
        super.update(dt);
    }

    /**
     * Gets the current texture if available.
     * @returns The texture or null if not loaded.
     */
    get texture(): Texture | null {
        return this._texture;
    }

    /**
     * Gets the image data if loaded.
     * @returns The HTML image element or null if not loaded.
     */
    get imageData(): HTMLImageElement | null {
        return this._imageData;
    }

    /**
     * Gets the canvas element if created.
     * @returns The canvas element or null if not created.
     */
    get canvas(): HTMLCanvasElement | null {
        return this._canvas;
    }

    /**
     * Gets the 2D rendering context if available.
     * @returns The rendering context or null if not available.
     */
    get context(): CanvasRenderingContext2D | null {
        return this._context;
    }

    /**
     * Checks if an image is currently loaded.
     * @returns True if an image is loaded, false otherwise.
     */
    isLoaded(): boolean {
        return this._imageData !== null;
    }

    /**
     * Gets the aspect ratio of the loaded image.
     * @returns The aspect ratio or 0 if no image is loaded.
     */
    getAspectRatio(): number {
        if (this._width === 0) {
            return 0;
        }
        return this._height / this._width;
    }

    /**
     * Creates a data URL of the current image.
     * @returns The data URL or empty string if no image is loaded.
     */
    toDataURL(): string {
        if (!this._canvas) {
            return '';
        }
        return this._canvas.toDataURL();
    }
}