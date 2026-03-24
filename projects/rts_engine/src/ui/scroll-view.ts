import { Vec2 } from '../math/vec2';
import { Element } from './element';

interface ScrollViewOptions {
  width?: number;
  height?: number;
  scrollSensitivity?: number;
  horizontalScrollEnabled?: boolean;
  verticalScrollEnabled?: boolean;
  showHorizontalScrollbar?: boolean;
  showVerticalScrollbar?: boolean;
  scrollbarWidth?: number;
  scrollbarColor?: string;
  scrollbarTrackColor?: string;
  bounceEnabled?: boolean;
  bounceFactor?: number;
}

export class ScrollView extends Element {
  private contentWidth: number = 0;
  private contentHeight: number = 0;
  private scrollX: number = 0;
  private scrollY: number = 0;
  private scrollSensitivity: number = 1;
  private horizontalScrollEnabled: boolean = true;
  private verticalScrollEnabled: boolean = true;
  private showHorizontalScrollbar: boolean = true;
  private showVerticalScrollbar: boolean = true;
  private scrollbarWidth: number = 10;
  private scrollbarColor: string = 'rgba(100, 100, 100, 0.7)';
  private scrollbarTrackColor: string = 'rgba(200, 200, 200, 0.3)';
  private bounceEnabled: boolean = true;
  private bounceFactor: number = 0.5;
  private isDragging: boolean = false;
  private dragStart: Vec2 = new Vec2();
  private dragStartScroll: Vec2 = new Vec2();
  private velocity: Vec2 = new Vec2();
  private isDecelerating: boolean = false;
  private maxScrollX: number = 0;
  private maxScrollY: number = 0;
  private scrollbarHovered: { horizontal: boolean; vertical: boolean } = { horizontal: false, vertical: false };
  private scrollbarDragging: { horizontal: boolean; vertical: boolean } = { horizontal: false, vertical: false };

  constructor(options: ScrollViewOptions = {}) {
    super(0, 0, options.width ?? 200, options.height ?? 200);
    this.scrollSensitivity = options.scrollSensitivity ?? this.scrollSensitivity;
    this.horizontalScrollEnabled = options.horizontalScrollEnabled ?? this.horizontalScrollEnabled;
    this.verticalScrollEnabled = options.verticalScrollEnabled ?? this.verticalScrollEnabled;
    this.showHorizontalScrollbar = options.showHorizontalScrollbar ?? this.showHorizontalScrollbar;
    this.showVerticalScrollbar = options.showVerticalScrollbar ?? this.showVerticalScrollbar;
  }

  setContentSize(width: number, height: number): void {
    this.contentWidth = Math.max(0, width);
    this.contentHeight = Math.max(0, height);
    this.updateScrollLimits();
    this.clampScrollPosition();
  }

  getScrollPosition(): Vec2 {
    return new Vec2(this.scrollX, this.scrollY);
  }

  setScrollPosition(x: number, y: number, animated: boolean = false): void {
    const targetX = this.horizontalScrollEnabled ? Math.max(0, Math.min(x, this.maxScrollX)) : 0;
    const targetY = this.verticalScrollEnabled ? Math.max(0, Math.min(y, this.maxScrollY)) : 0;
    
    if (animated) {
      this.animateToScrollPosition(targetX, targetY);
    } else {
      this.scrollX = targetX;
      this.scrollY = targetY;
    }
  }

  scrollBy(deltaX: number, deltaY: number, animated: boolean = false): void {
    this.setScrollPosition(this.scrollX + deltaX, this.scrollY + deltaY, animated);
  }

  scrollToTop(animated: boolean = false): void {
    this.setScrollPosition(this.scrollX, 0, animated);
  }

  scrollToBottom(animated: boolean = false): void {
    this.setScrollPosition(this.scrollX, this.maxScrollY, animated);
  }

  scrollToLeft(animated: boolean = false): void {
    this.setScrollPosition(0, this.scrollY, animated);
  }

  scrollToRight(animated: boolean = false): void {
    this.setScrollPosition(this.maxScrollX, this.scrollY, animated);
  }

  getScrollVelocity(): Vec2 {
    return new Vec2(this.velocity.x, this.velocity.y);
  }

  stopScrolling(): void {
    this.velocity.set(0, 0);
    this.isDecelerating = false;
  }

  isScrollable(): boolean {
    return (this.horizontalScrollEnabled && this.contentWidth > this.width) ||
           (this.verticalScrollEnabled && this.contentHeight > this.height);
  }

  isScrolledToTop(): boolean {
    return this.scrollY <= 0;
  }

  isScrolledToBottom(): boolean {
    return this.scrollY >= this.maxScrollY;
  }

  isScrolledToLeft(): boolean {
    return this.scrollX <= 0;
  }

  isScrolledToRight(): boolean {
    return this.scrollX >= this.maxScrollX;
  }

  setHorizontalScrollEnabled(enabled: boolean): void {
    this.horizontalScrollEnabled = enabled;
    if (!enabled) {
      this.scrollX = 0;
    }
    this.updateScrollLimits();
  }

  setVerticalScrollEnabled(enabled: boolean): void {
    this.verticalScrollEnabled = enabled;
    if (!enabled) {
      this.scrollY = 0;
    }
    this.updateScrollLimits();
  }

  getContentOffset(): Vec2 {
    return new Vec2(-this.scrollX, -this.scrollY);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    ctx.save();
    
    const bounds = this.getBounds();
    ctx.beginPath();
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.clip();

    ctx.translate(-this.scrollX, -this.scrollY);
    super.render(ctx);
    ctx.translate(this.scrollX, this.scrollY);

    this.renderScrollbars(ctx);

    ctx.restore();
  }

  onTouchStart(x: number, y: number): boolean {
    if (!this.visible || !this.isEnabled()) return false;

    const local = this.screenToLocal(x, y);
    if (!this.hitTest(local.x, local.y)) return false;

    this.isDragging = true;
    this.dragStart.set(local.x, local.y);
    this.dragStartScroll.set(this.scrollX, this.scrollY);
    this.stopScrolling();

    return true;
  }

  onTouchMove(x: number, y: number): boolean {
    if (!this.visible || !this.isEnabled() || !this.isDragging) return false;

    const local = this.screenToLocal(x, y);
    const deltaX = (local.x - this.dragStart.x) * this.scrollSensitivity;
    const deltaY = (local.y - this.dragStart.y) * this.scrollSensitivity;

    if (this.horizontalScrollEnabled) {
      this.scrollX = this.dragStartScroll.x - deltaX;
    }
    if (this.verticalScrollEnabled) {
      this.scrollY = this.dragStartScroll.y - deltaY;
    }

    this.clampScrollPosition();
    return true;
  }

  onTouchEnd(x: number, y: number): boolean {
    if (!this.visible || !this.isEnabled() || !this.isDragging) return false;

    this.isDragging = false;
    this.startDeceleration();
    return true;
  }

  onMouseWheel(deltaX: number, deltaY: number): boolean {
    if (!this.visible || !this.isEnabled()) return false;

    const bounds = this.getBounds();
    const mousePos = this.getMousePosition();
    
    if (mousePos.x < bounds.x || mousePos.x > bounds.x + bounds.width ||
        mousePos.y < bounds.y || mousePos.y > bounds.y + bounds.height) {
      return false;
    }

    this.scrollBy(deltaX, deltaY);
    return true;
  }

  private updateScrollLimits(): void {
    this.maxScrollX = Math.max(0, this.contentWidth - this.width);
    this.maxScrollY = Math.max(0, this.contentHeight - this.height);
  }

  private clampScrollPosition(): void {
    this.scrollX = Math.max(0, Math.min(this.scrollX, this.maxScrollX));
    this.scrollY = Math.max(0, Math.min(this.scrollY, this.maxScrollY));
  }

  private startDeceleration(): void {
    if (!this.isDecelerating) {
      this.isDecelerating = true;
      this.decelerate();
    }
  }

  private decelerate(): void {
    if (!this.isDecelerating) return;

    const friction = 0.95;
    const minVelocity = 0.5;

    this.velocity.x *= friction;
    this.velocity.y *= friction;

    if (Math.abs(this.velocity.x) < minVelocity && Math.abs(this.velocity.y) < minVelocity) {
      this.isDecelerating = false;
      return;
    }

    this.scrollBy(this.velocity.x, this.velocity.y);
    requestAnimationFrame(() => this.decelerate());
  }

  private animateToScrollPosition(targetX: number, targetY: number): void {
    const startX = this.scrollX;
    const startY = this.scrollY;
    const duration = 300;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = this.easeOutCubic(progress);

      this.scrollX = startX + (targetX - startX) * easeProgress;
      this.scrollY = startY + (targetY - startY) * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private renderScrollbars(ctx: CanvasRenderingContext2D): void {
    const bounds = this.getBounds();

    if (this.showHorizontalScrollbar && this.contentWidth > this.width) {
      this.renderHorizontalScrollbar(ctx, bounds);
    }

    if (this.showVerticalScrollbar && this.contentHeight > this.height) {
      this.renderVerticalScrollbar(ctx, bounds);
    }
  }

  private renderHorizontalScrollbar(ctx: CanvasRenderingContext2D, bounds: {x: number, y: number, width: number, height: number}): void {
    const trackHeight = this.scrollbarWidth;
    const trackY = bounds.y + bounds.height - trackHeight;
    const trackWidth = bounds.width - (this.showVerticalScrollbar && this.contentHeight > this.height ? this.scrollbarWidth : 0);

    ctx.fillStyle = this.scrollbarTrackColor;
    ctx.fillRect(bounds.x, trackY, trackWidth, trackHeight);

    const scrollbarWidth = (this.width / this.contentWidth) * trackWidth;
    const scrollbarX = bounds.x + (this.scrollX / this.maxScrollX) * (trackWidth - scrollbarWidth);

    ctx.fillStyle = this.scrollbarColor;
    ctx.fillRect(scrollbarX, trackY, scrollbarWidth, trackHeight);
  }

  private renderVerticalScrollbar(ctx: CanvasRenderingContext2D, bounds: {x: number, y: number, width: number, height: number}): void {
    const trackWidth = this.scrollbarWidth;
    const trackX = bounds.x + bounds.width - trackWidth;
    const trackHeight = bounds.height - (this.showHorizontalScrollbar && this.contentWidth > this.width ? this.scrollbarWidth : 0);

    ctx.fillStyle = this.scrollbarTrackColor;
    ctx.fillRect(trackX, bounds.y, trackWidth, trackHeight);

    const scrollbarHeight = (this.height / this.contentHeight) * trackHeight;
    const scrollbarY = bounds.y + (this.scrollY / this.maxScrollY) * (trackHeight - scrollbarHeight);

    ctx.fillStyle = this.scrollbarColor;
    ctx.fillRect(trackX, scrollbarY, trackWidth, scrollbarHeight);
  }

  private screenToLocal(screenX: number, screenY: number): Vec2 {
    const bounds = this.getAbsolutePosition();
    return new Vec2(screenX - bounds.x, screenY - bounds.y);
  }

  private getMousePosition(): Vec2 {
    return new Vec2(0, 0);
  }

  private isEnabled(): boolean {
    return true;
  }
}
