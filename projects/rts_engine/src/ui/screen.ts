import { Element } from './element';
import { Timer } from '../core/timer';
import { Vec2 } from '../math/vec2';

/**
 * Screen represents the root container for all UI elements.
 * It manages rendering, input handling, and canvas operations.
 */
export class Screen extends Element {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private backgroundColor: string;
    private needsRedraw: boolean;
    private lastFrameTime: number;
    private frameId: number | null;
    private resizeObserver: ResizeObserver | null = null;
    private isDestroyed: boolean = false;

    /**
     * Creates a new Screen instance.
     * @param canvas - The HTML canvas element to render to
     * @throws Error if canvas is invalid or 2D context cannot be obtained
     */
    constructor(canvas: HTMLCanvasElement) {
        if (!canvas) {
            throw new Error('Canvas element is required');
        }

        super(0, 0, canvas.width, canvas.height);
        this.canvas = canvas;
        
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.ctx = context;
        this.backgroundColor = '#000000';
        this.needsRedraw = true;
        this.lastFrameTime = 0;
        this.frameId = null;

        this.setupResizeObserver();
    }

    /**
     * Gets the canvas element.
     * @returns The HTML canvas element
     */
    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * Gets the 2D rendering context.
     * @returns The canvas 2D context
     */
    getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }

    /**
     * Sets the background color.
     * @param color - CSS color string
     * @throws Error if color is invalid
     */
    setBackgroundColor(color: string): void {
        if (!color || typeof color !== 'string') {
            throw new Error('Invalid color provided');
        }
        this.backgroundColor = color;
        this.needsRedraw = true;
    }

    /**
     * Gets the current background color.
     * @returns The background color
     */
    getBackgroundColor(): string {
        return this.backgroundColor;
    }

    /**
     * Resizes the canvas and updates internal dimensions.
     * @param width - New width in pixels
     * @param height - New height in pixels
     * @throws Error if dimensions are invalid
     */
    resize(width: number, height: number): void {
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            throw new Error('Invalid dimensions provided');
        }

        this.canvas.width = width;
        this.canvas.height = height;
        this.setSize(width, height);
        this.needsRedraw = true;
    }

    /**
     * Marks the screen as needing a redraw.
     */
    requestRedraw(): void {
        this.needsRedraw = true;
    }

    /**
     * Renders the screen and all child elements.
     */
    render(): void {
        if (!this.needsRedraw || this.isDestroyed) {
            return;
        }

        try {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = this.backgroundColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.save();
            super.render(this.ctx);
            this.ctx.restore();

            this.needsRedraw = false;
        } catch (error) {
            console.error('Error during screen render:', error);
            throw error;
        }
    }

    /**
     * The main render loop.
     * @private
     */
    private renderLoop(): void {
        if (this.isDestroyed) {
            return;
        }

        const currentTime = Timer.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        this.render();

        this.frameId = requestAnimationFrame(() => this.renderLoop());
    }

    /**
     * Starts the render loop.
     */
    startRenderLoop(): void {
        if (this.frameId !== null || this.isDestroyed) {
            return;
        }
        this.lastFrameTime = Timer.now();
        this.renderLoop();
    }

    /**
     * Stops the render loop.
     */
    stopRenderLoop(): void {
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    /**
     * Handles canvas resize based on its bounding client rect.
     */
    handleResize(): void {
        if (this.isDestroyed) {
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        
        if (width !== this.canvas.width || height !== this.canvas.height) {
            this.resize(width, height);
        }
    }

    /**
     * Gets the mouse position relative to the canvas.
     * @param event - The mouse event
     * @returns Vec2 position
     * @throws Error if event is invalid
     */
    getMousePosition(event: MouseEvent): Vec2 {
        if (!event || typeof event.clientX !== 'number' || typeof event.clientY !== 'number') {
            throw new Error('Invalid mouse event');
        }

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return new Vec2(
            (event.clientX - rect.left) * scaleX,
            (event.clientY - rect.top) * scaleY
        );
    }

    /**
     * Gets the position of a specific touch relative to the canvas.
     * @param event - The touch event
     * @param touchIndex - Index of the touch to get (default: 0)
     * @returns Vec2 position or null if touch index is invalid
     * @throws Error if event is invalid
     */
    getTouchPosition(event: TouchEvent, touchIndex: number = 0): Vec2 | null {
        if (!event || !event.touches) {
            throw new Error('Invalid touch event');
        }
        if (!Number.isInteger(touchIndex) || touchIndex < 0) {
            return null;
        }

        if (touchIndex >= event.touches.length) {
            return null;
        }
        
        const touch = event.touches[touchIndex];
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return new Vec2(
            (touch.clientX - rect.left) * scaleX,
            (touch.clientY - rect.top) * scaleY
        );
    }

    /**
     * Performs a hit test at the given coordinates.
     * @param x - X coordinate
     * @param y - Y coordinate
     * @returns The topmost element at the position or null
     */
    hitTest(x: number, y: number): Element | null {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return null;
        }

        const children = this.getChildren();
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (child.hitTest(x, y)) {
                return child;
            }
        }
        return null;
    }

    /**
     * Gets the canvas width.
     * @returns Width in pixels
     */
    getWidth(): number {
        return this.canvas.width;
    }

    /**
     * Gets the canvas height.
     * @returns Height in pixels
     */
    getHeight(): number {
        return this.canvas.height;
    }

    /**
     * Gets the aspect ratio of the canvas.
     * @returns Width divided by height
     */
    getAspectRatio(): number {
        return this.canvas.width / this.canvas.height;
    }

    /**
     * Checks if the canvas is currently in fullscreen mode.
     * @returns True if in fullscreen
     */
    isFullscreen(): boolean {
        return !!(document.fullscreenElement && document.fullscreenElement === this.canvas);
    }

    /**
     * Requests fullscreen mode for the canvas.
     * @returns Promise that resolves when fullscreen is entered
     * @throws Error if request fails
     */
    requestFullscreen(): Promise<void> {
        try {
            return this.canvas.requestFullscreen();
        } catch (error) {
            throw new Error(`Failed to request fullscreen: ${error}`);
        }
    }

    /**
     * Exits fullscreen mode if currently active.
     * @returns Promise that resolves when fullscreen is exited
     */
    exitFullscreen(): Promise<void> {
        if (this.isFullscreen()) {
            try {
                return document.exitFullscreen();
            } catch (error) {
                throw new Error(`Failed to exit fullscreen: ${error}`);
            }
        }
        return Promise.resolve();
    }

    /**
     * Sets up automatic resize observation.
     * @private
     */
    private setupResizeObserver(): void {
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.handleResize();
            });
            this.resizeObserver.observe(this.canvas);
        }
    }

    /**
     * Cleans up resources and stops rendering.
     */
    destroy(): void {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;
        this.stopRenderLoop();

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        try {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        } catch (error) {
            console.warn('Error clearing canvas during destroy:', error);
        }
    }
}