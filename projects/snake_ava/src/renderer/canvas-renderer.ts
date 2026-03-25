/**
 * Renders entities using HTML5 Canvas
 */
export class CanvasRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  pixelRatio: number;

  /**
   * Creates a new CanvasRenderer instance
   * @param canvas - The HTML canvas element to render to
   * @throws {Error} If canvas context cannot be obtained
   */
  constructor(canvas: HTMLCanvasElement) {
    if (!canvas) {
      throw new Error('Canvas element is required');
    }
    
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.pixelRatio = window.devicePixelRatio || 1;
  }

  /**
   * Clears the entire canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Draws a filled rectangle
   * @param x - The x coordinate of the upper-left corner
   * @param y - The y coordinate of the upper-left corner
   * @param w - The width of the rectangle
   * @param h - The height of the rectangle
   * @param color - The fill color
   */
  drawRect(x: number, y: number, w: number, h: number, color: string): void {
    this.#validateColor(color);
    this.#validateDimensions(w, h);
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  /**
   * Draws a filled circle
   * @param x - The x coordinate of the center
   * @param y - The y coordinate of the center
   * @param r - The radius of the circle
   * @param color - The fill color
   */
  drawCircle(x: number, y: number, r: number, color: string): void {
    this.#validateColor(color);
    this.#validateRadius(r);
    
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draws a stroked line
   * @param x1 - The x coordinate of the start point
   * @param y1 - The y coordinate of the start point
   * @param x2 - The x coordinate of the end point
   * @param y2 - The y coordinate of the end point
   * @param color - The stroke color
   * @param width - The line width
   */
  drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
    this.#validateColor(color);
    this.#validateLineWidth(width);
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  /**
   * Draws a text string
   * @param text - The text to draw
   * @param x - The x coordinate for the text
   * @param y - The y coordinate for the text
   * @param font - The font specification
   * @param color - The text color
   */
  drawText(text: string, x: number, y: number, font: string, color: string): void {
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }
    if (!font) {
      throw new Error('Font specification is required');
    }
    this.#validateColor(color);
    
    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  /**
   * Saves the current canvas state
   */
  save(): void {
    this.ctx.save();
  }

  /**
   * Restores the most recently saved canvas state
   */
  restore(): void {
    this.ctx.restore();
  }

  /**
   * Applies a scaling transformation
   * @param x - The horizontal scaling factor
   * @param y - The vertical scaling factor
   */
  scale(x: number, y: number): void {
    this.#validateScaleFactor(x);
    this.#validateScaleFactor(y);
    
    this.ctx.scale(x, y);
  }

  /**
   * Applies a translation transformation
   * @param x - The horizontal translation
   * @param y - The vertical translation
   */
  translate(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Translation values must be finite numbers');
    }
    
    this.ctx.translate(x, y);
  }

  /**
   * Validates a color string
   * @private
   */
  #validateColor(color: string): void {
    if (typeof color !== 'string' || color.length === 0) {
      throw new Error('Color must be a non-empty string');
    }
  }

  /**
   * Validates dimensions
   * @private
   */
  #validateDimensions(w: number, h: number): void {
    if (!Number.isFinite(w) || !Number.isFinite(h)) {
      throw new Error('Width and height must be finite numbers');
    }
    if (w < 0 || h < 0) {
      throw new Error('Width and height must be non-negative');
    }
  }

  /**
   * Validates radius
   * @private
   */
  #validateRadius(r: number): void {
    if (!Number.isFinite(r)) {
      throw new Error('Radius must be a finite number');
    }
    if (r < 0) {
      throw new Error('Radius must be non-negative');
    }
  }

  /**
   * Validates line width
   * @private
   */
  #validateLineWidth(width: number): void {
    if (!Number.isFinite(width)) {
      throw new Error('Line width must be a finite number');
    }
    if (width <= 0) {
      throw new Error('Line width must be positive');
    }
  }

  /**
   * Validates scale factor
   * @private
   */
  #validateScaleFactor(factor: number): void {
    if (!Number.isFinite(factor)) {
      throw new Error('Scale factor must be a finite number');
    }
    if (factor === 0) {
      throw new Error('Scale factor cannot be zero');
    }
  }
}
