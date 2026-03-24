import { Element } from './element';

export interface ImageOptions {
    src?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    visible?: boolean;
}

/**
 * Represents an image element that can be rendered on a canvas.
 * Supports loading images from URLs and provides load/error callbacks.
 */
export class Image extends Element {
    private image: HTMLImageElement | null = null;
    private src: string = '';
    private loaded: boolean = false;
    private onLoadHandlers: (() => void)[] = [];
    private onErrorHandlers: (() => void)[] = [];
    private isLoading: boolean = false;
    private retryCount: number = 0;
    private readonly maxRetries: number = 3;
    private readonly retryDelay: number = 1000;

    constructor(options: ImageOptions = {}) {
        super(
            options.x ?? 0,
            options.y ?? 0,
            options.width ?? 100,
            options.height ?? 100
        );
        this.visible = options.visible ?? true;
        if (options.src) {
            this.setSource(options.src);
        }
    }

    /**
     * Sets the image source URL and initiates loading
     * @param src - The URL of the image to load
     * @throws {Error} If src is not a valid string
     */
    public setSource(src: string): void {
        this.validateSource(src);
        
        if (this.src === src && this.loaded) return;
        if (this.isLoading) return;
        
        this.src = src;
        this.loaded = false;
        this.isLoading = true;
        this.retryCount = 0;
        this.image = new Image();
        this.image.crossOrigin = 'anonymous';
        
        this.setupImageListeners();
        this.loadImage();
    }

    /**
     * Gets the current image source URL
     * @returns The current source URL
     */
    public getSource(): string {
        return this.src;
    }

    /**
     * Checks if the image has been successfully loaded
     * @returns True if the image is loaded
     */
    public isLoaded(): boolean {
        return this.loaded;
    }

    /**
     * Checks if the image is currently loading
     * @returns True if the image is loading
     */
    public isLoadingImage(): boolean {
        return this.isLoading;
    }

    /**
     * Registers a callback to be invoked when the image loads successfully
     * @param callback - Function to call on successful load
     */
    public onLoad(callback: () => void): void {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        this.onLoadHandlers.push(callback);
        if (this.loaded) {
            try {
                callback();
            } catch (error) {
                console.error('Error in onLoad callback:', error);
            }
        }
    }

    /**
     * Registers a callback to be invoked when the image fails to load
     * @param callback - Function to call on error
     */
    public onError(callback: () => void): void {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        this.onErrorHandlers.push(callback);
    }

    /**
     * Renders the image to the canvas context
     * @param ctx - The canvas rendering context
     */
    protected renderSelf(ctx: CanvasRenderingContext2D): void {
        if (!this.visible || !this.loaded || !this.image) return;
        
        try {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } catch (error) {
            console.error('Error rendering image:', error);
            this.handleRenderError();
        }
    }

    /**
     * Gets the underlying HTML image element
     * @returns The image element or null if not loaded
     */
    public getImageElement(): HTMLImageElement | null {
        return this.image;
    }

    /**
     * Sets the image element directly, bypassing URL loading
     * @param image - The HTML image element to use
     * @throws {Error} If image is not a valid HTMLImageElement
     */
    public setImageElement(image: HTMLImageElement): void {
        this.validateImageElement(image);
        
        this.image = image;
        this.loaded = true;
        this.isLoading = false;
        this.src = image.src;
        
        if (this.width === 100 && this.height === 100 && image.naturalWidth > 0) {
            this.width = image.naturalWidth;
            this.height = image.naturalHeight;
        }
        
        this.onLoadHandlers.forEach(handler => {
            try {
                handler();
            } catch (error) {
                console.error('Error in onLoad callback:', error);
            }
        });
    }

    /**
     * Clears the current image source and resets the state
     */
    public clearSource(): void {
        this.src = '';
        this.loaded = false;
        this.isLoading = false;
        this.image = null;
        this.retryCount = 0;
        this.onLoadHandlers = [];
        this.onErrorHandlers = [];
    }

    /**
     * Reloads the current image source
     */
    public reload(): void {
        if (this.src) {
            this.setSource(this.src);
        }
    }

    /**
     * Gets the natural dimensions of the loaded image
     * @returns Object with width and height, or null if not loaded
     */
    public getNaturalDimensions(): { width: number; height: number } | null {
        if (!this.loaded || !this.image) return null;
        return {
            width: this.image.naturalWidth,
            height: this.image.naturalHeight
        };
    }

    /**
     * Scales the image to fit within the specified dimensions while maintaining aspect ratio
     * @param maxWidth - Maximum width
     * @param maxHeight - Maximum height
     */
    public scaleToFit(maxWidth: number, maxHeight: number): void {
        if (!this.loaded || !this.image) return;
        
        const aspectRatio = this.image.naturalWidth / this.image.naturalHeight;
        let { width, height } = this.calculateScaledDimensions(
            maxWidth,
            maxHeight,
            aspectRatio
        );
        
        this.width = width;
        this.height = height;
    }

    /**
     * Scales the image to fill the specified dimensions, potentially cropping
     * @param targetWidth - Target width
     * @param targetHeight - Target height
     */
    public scaleToFill(targetWidth: number, targetHeight: number): void {
        if (!this.loaded || !this.image) return;
        
        this.width = targetWidth;
        this.height = targetHeight;
    }

    /**
     * Resets the image to its natural dimensions
     */
    public resetToNaturalSize(): void {
        const dims = this.getNaturalDimensions();
        if (dims) {
            this.width = dims.width;
            this.height = dims.height;
        }
    }

    /**
     * Removes all registered load callbacks
     */
    public clearLoadHandlers(): void {
        this.onLoadHandlers = [];
    }

    /**
     * Removes all registered error callbacks
     */
    public clearErrorHandlers(): void {
        this.onErrorHandlers = [];
    }

    /**
     * Gets the current retry count
     * @returns Number of retry attempts
     */
    public getRetryCount(): number {
        return this.retryCount;
    }

    /**
     * Sets the maximum number of retry attempts
     * @param maxRetries - Maximum number of retries
     */
    public setMaxRetries(maxRetries: number): void {
        if (maxRetries < 0) {
            throw new Error('Max retries must be non-negative');
        }
        this.maxRetries = maxRetries;
    }

    private validateSource(src: string): void {
        if (typeof src !== 'string' || src.trim().length === 0) {
            throw new Error('Source must be a non-empty string');
        }
    }

    private validateImageElement(image: HTMLImageElement): void {
        if (!image || !(image instanceof HTMLImageElement)) {
            throw new Error('Image must be a valid HTMLImageElement');
        }
    }

    private setupImageListeners(): void {
        if (!this.image) return;
        
        this.image.onload = () => {
            this.isLoading = false;
            this.loaded = true;
            
            if (this.width === 100 && this.height === 100 && this.image) {
                const dims = this.getNaturalDimensions();
                if (dims) {
                    this.width = dims.width;
                    this.height = dims.height;
                }
            }
            
            this.onLoadHandlers.forEach(handler => {
                try {
                    handler();
                } catch (error) {
                    console.error('Error in onLoad callback:', error);
                }
            });
        };
        
        this.image.onerror = () => {
            this.handleImageError();
        };
    }

    private loadImage(): void {
        if (!this.image || !this.src) return;
        
        try {
            this.image.src = this.src;
        } catch (error) {
            this.handleImageError();
        }
    }

    private handleImageError(): void {
        this.isLoading = false;
        
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            setTimeout(() => {
                if (this.src) {
                    this.loadImage();
                }
            }, this.retryDelay * this.retryCount);
            return;
        }
        
        this.loaded = false;
        this.onErrorHandlers.forEach(handler => {
            try {
                handler();
            } catch (error) {
                console.error('Error in onError callback:', error);
            }
        });
    }

    private handleRenderError(): void {
        console.warn('Failed to render image, clearing source');
        this.clearSource();
    }

    private calculateScaledDimensions(
        maxWidth: number,
        maxHeight: number,
        aspectRatio: number
    ): { width: number; height: number } {
        let width = maxWidth;
        let height = width / aspectRatio;
        
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    }
}
