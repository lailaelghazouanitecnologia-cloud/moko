import { Element } from './element';
import { Vec2 } from '../math/vec2';

/**
 * A container that provides scrollable viewport functionality.
 * Supports mouse/touch dragging, wheel scrolling, and smooth inertia.
 */
export class ScrollView extends Element {
  private _content: Element | null = null;
  private _scrollX: number = 0;
  private _scrollY: number = 0;
  private _scrollWidth: number = 0;
  private _scrollHeight: number = 0;
  private _viewportWidth: number = 0;
  private _viewportHeight: number = 0;
  private _scrollEnabled: boolean = true;
  private _horizontalScroll: boolean = true;
  private _verticalScroll: boolean = true;
  private _scrollSpeed: number = 1.0;
  private _inertia: number = 0.95;
  private _velocity: Vec2 = new Vec2();
  private _isDragging: boolean = false;
  private _dragStart: Vec2 = new Vec2();
  private _dragStartScroll: Vec2 = new Vec2();

  constructor(id: string = '') {
    super(id);
  }

  /**
   * Gets the content element being scrolled.
   */
  get content(): Element | null {
    return this._content;
  }

  /**
   * Gets the current horizontal scroll position.
   */
  get scrollX(): number {
    return this._scrollX;
  }

  /**
   * Gets the current vertical scroll position.
   */
  get scrollY(): number {
    return this._scrollY;
  }

  /**
   * Gets the total scrollable width.
   */
  get scrollWidth(): number {
    return this._scrollWidth;
  }

  /**
   * Gets the total scrollable height.
   */
  get scrollHeight(): number {
    return this._scrollHeight;
  }

  /**
   * Gets the viewport width.
   */
  get viewportWidth(): number {
    return this._viewportWidth;
  }

  /**
   * Gets the viewport height.
   */
  get viewportHeight(): number {
    return this._viewportHeight;
  }

  /**
   * Gets whether scrolling is enabled.
   */
  get scrollEnabled(): boolean {
    return this._scrollEnabled;
  }

  /**
   * Gets whether horizontal scrolling is enabled.
   */
  get horizontalScroll(): boolean {
    return this._horizontalScroll;
  }

  /**
   * Gets whether vertical scrolling is enabled.
   */
  get verticalScroll(): boolean {
    return this._verticalScroll;
  }

  /**
   * Gets the scroll speed multiplier.
   */
  get scrollSpeed(): number {
    return this._scrollSpeed;
  }

  /**
   * Gets the inertia coefficient (0-1).
   */
  get inertia(): number {
    return this._inertia;
  }

  /**
   * Sets the content element to be scrolled.
   * @param content - The element to make scrollable
   * @throws Error if content is null or undefined
   */
  setContent(content: Element): void {
    if (!content) {
      throw new Error('Content cannot be null or undefined');
    }

    if (this._content) {
      this.removeChild(this._content);
    }
    this._content = content;
    this.addChild(content);
    this._updateScrollDimensions();
  }

  /**
   * Sets the scroll position.
   * @param x - Horizontal position
   * @param y - Vertical position
   */
  setScrollPosition(x: number, y: number): void {
    if (!this._isValidNumber(x) || !this._isValidNumber(y)) {
      return;
    }

    if (!this._horizontalScroll) x = 0;
    if (!this._verticalScroll) y = 0;
    
    const maxX = Math.max(0, this._scrollWidth - this._viewportWidth);
    const maxY = Math.max(0, this._scrollHeight - this._viewportHeight);
    
    this._scrollX = Math.max(0, Math.min(x, maxX));
    this._scrollY = Math.max(0, Math.min(y, maxY));
    
    if (this._content) {
      this._content.setPosition(-this._scrollX, -this._scrollY);
    }
  }

  /**
   * Sets the viewport size.
   * @param width - Viewport width
   * @param height - Viewport height
   */
  setViewportSize(width: number, height: number): void {
    if (!this._isValidNumber(width) || !this._isValidNumber(height) || width < 0 || height < 0) {
      return;
    }
    
    this._viewportWidth = width;
    this._viewportHeight = height;
    
    if (this.width === 0 && this.height === 0) {
      this.setSize(width, height);
    }
    
    this._updateScrollDimensions();
    this.setScrollPosition(this._scrollX, this._scrollY);
  }

  /**
   * Enables or disables scrolling.
   * @param enabled - Whether to enable scrolling
   */
  setScrollEnabled(enabled: boolean): void {
    this._scrollEnabled = enabled;
    if (!enabled) {
      this._isDragging = false;
      this._velocity.set(0, 0);
    }
  }

  /**
   * Enables or disables horizontal scrolling.
   * @param enabled - Whether to enable horizontal scrolling
   */
  setHorizontalScroll(enabled: boolean): void {
    this._horizontalScroll = enabled;
    if (!enabled) {
      this.setScrollPosition(0, this._scrollY);
    }
  }

  /**
   * Enables or disables vertical scrolling.
   * @param enabled - Whether to enable vertical scrolling
   */
  setVerticalScroll(enabled: boolean): void {
    this._verticalScroll = enabled;
    if (!enabled) {
      this.setScrollPosition(this._scrollX, 0);
    }
  }

  /**
   * Sets the scroll speed multiplier.
   * @param speed - Speed multiplier (must be >= 0)
   */
  setScrollSpeed(speed: number): void {
    if (!this._isValidNumber(speed) || speed < 0) {
      return;
    }
    this._scrollSpeed = speed;
  }

  /**
   * Sets the inertia coefficient.
   * @param inertia - Inertia value between 0 and 1
   */
  setInertia(inertia: number): void {
    if (!this._isValidNumber(inertia) || inertia < 0 || inertia > 1) {
      return;
    }
    this._inertia = inertia;
  }

  /**
   * Scrolls to the specified position.
   * @param x - Horizontal position
   * @param y - Vertical position
   */
  scrollTo(x: number, y: number): void {
    this.setScrollPosition(x, y);
  }

  /**
   * Scrolls to make an element visible.
   * @param element - The element to scroll to
   */
  scrollToElement(element: Element): void {
    if (!this._content || !this._content.contains(element)) {
      return;
    }
    
    const elementX = element.x;
    const elementY = element.y;
    const elementWidth = element.width;
    const elementHeight = element.height;
    
    let targetX = this._scrollX;
    let targetY = this._scrollY;
    
    if (this._horizontalScroll) {
      if (elementX < this._scrollX) {
        targetX = elementX;
      } else if (elementX + elementWidth > this._scrollX + this._viewportWidth) {
        targetX = elementX + elementWidth - this._viewportWidth;
      }
    }
    
    if (this._verticalScroll) {
      if (elementY < this._scrollY) {
        targetY = elementY;
      } else if (elementY + elementHeight > this._scrollY + this._viewportHeight) {
        targetY = elementY + elementHeight - this._viewportHeight;
      }
    }
    
    this.setScrollPosition(targetX, targetY);
  }

  /**
   * Scrolls to the top.
   */
  scrollToTop(): void {
    this.setScrollPosition(this._scrollX, 0);
  }

  /**
   * Scrolls to the bottom.
   */
  scrollToBottom(): void {
    const maxY = Math.max(0, this._scrollHeight - this._viewportHeight);
    this.setScrollPosition(this._scrollX, maxY);
  }

  /**
   * Scrolls to the left edge.
   */
  scrollToLeft(): void {
    this.setScrollPosition(0, this._scrollY);
  }

  /**
   * Scrolls to the right edge.
   */
  scrollToRight(): void {
    const maxX = Math.max(0, this._scrollWidth - this._viewportWidth);
    this.setScrollPosition(maxX, this._scrollY);
  }

  /**
   * Clears the content and resets scroll state.
   */
  clearContent(): void {
    if (this._content) {
      this.removeChild(this._content);
      this._content = null;
    }
    this._scrollWidth = 0;
    this._scrollHeight = 0;
    this.setScrollPosition(0, 0);
  }

  /**
   * Updates the scroll view state.
   * @param dt - Delta time in seconds
   */
  update(dt: number): void {
    if (!this._isValidNumber(dt) || dt <= 0) {
      return;
    }

    if (!this._scrollEnabled) {
      return;
    }
    
    if (this._inertia > 0 && (this._velocity.data[0] !== 0 || this._velocity.data[1] !== 0)) {
      this.setScrollPosition(
        this._scrollX + this._velocity.data[0] * this._scrollSpeed,
        this._scrollY + this._velocity.data[1] * this._scrollSpeed
      );
      
      this._velocity.data[0] *= this._inertia;
      this._velocity.data[1] *= this._inertia;
      
      if (Math.abs(this._velocity.data[0]) < 0.1) this._velocity.data[0] = 0;
      if (Math.abs(this._velocity.data[1]) < 0.1) this._velocity.data[1] = 0;
    }
  }

  /**
   * Renders the scroll view.
   * @param ctx - Canvas rendering context
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!ctx || !this.visible) {
      return;
    }
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.clip();
    
    super.render(ctx);
    
    ctx.restore();
  }

  /**
   * Checks if coordinates are within the viewport.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns True if inside viewport
   */
  contains(x: number, y: number): boolean {
    if (!this._isValidNumber(x) || !this._isValidNumber(y)) {
      return false;
    }
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  /**
   * Handles mouse down events.
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  onMouseDown(x: number, y: number): void {
    if (!this._scrollEnabled || !this.contains(x, y)) {
      return;
    }
    
    this._isDragging = true;
    this._dragStart.set(x, y);
    this._dragStartScroll.set(this._scrollX, this._scrollY);
    this._velocity.set(0, 0);
  }

  /**
   * Handles mouse move events.
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  onMouseMove(x: number, y: number): void {
    if (!this._scrollEnabled || !this._isDragging) {
      return;
    }
    
    const dx = (x - this._dragStart.x) * this._scrollSpeed;
    const dy = (y - this._dragStart.y) * this._scrollSpeed;
    
    this.setScrollPosition(
      this._dragStartScroll.x - dx,
      this._dragStartScroll.y - dy
    );
    
    this._velocity.set(-dx * 0.1, -dy * 0.1);
  }

  /**
   * Handles mouse up events.
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  onMouseUp(x: number, y: number): void {
    this._isDragging = false;
  }

  /**
   * Handles wheel events.
   * @param deltaX - Horizontal delta
   * @param deltaY - Vertical delta
   */
  onWheel(deltaX: number, deltaY: number): void {
    if (!this._scrollEnabled) {
      return;
    }
    
    if (!this._isValidNumber(deltaX) || !this._isValidNumber(deltaY)) {
      return;
    }
    
    this.setScrollPosition(
      this._scrollX + deltaX * this._scrollSpeed,
      this._scrollY + deltaY * this._scrollSpeed
    );
    
    this._velocity.set(-deltaX * 0.5, -deltaY * 0.5);
  }

  /**
   * Updates scroll dimensions based on content.
   */
  private _updateScrollDimensions(): void {
    if (!this._content) {
      this._scrollWidth = 0;
      this._scrollHeight = 0;
      return;
    }
    
    let maxWidth = 0;
    let maxHeight = 0;
    
    const measureChildren = (element: Element): void => {
      const right = element.x + element.width;
      const bottom = element.y + element.height;
      
      if (right > maxWidth) maxWidth = right;
      if (bottom > maxHeight) maxHeight = bottom;
      
      for (const child of element.children) {
        measureChildren(child);
      }
    };
    
    measureChildren(this._content);
    
    this._scrollWidth = maxWidth;
    this._scrollHeight = maxHeight;
  }

  /**
   * Validates if a value is a finite number.
   * @param value - Value to check
   * @returns True if valid number
   */
  private _isValidNumber(value: any): boolean {
    return typeof value === 'number' && isFinite(value);
  }
}
