import { EventEmitter } from '../core/EventEmitter';
import { Vec2 } from '../math/Vec2';
import { Element } from './Element';
import { Screen } from './Screen';

export class ScrollView extends Element {
  private _contentSize: Vec2;
  private _scrollPosition: Vec2;
  private _scrollEnabled: boolean;
  private _horizontalScrollEnabled: boolean;
  private _verticalScrollEnabled: boolean;
  private _scrollBarWidth: number;
  private _scrollBarColor: string;
  private _scrollBarOpacity: number;
  private _scrollBarAutoHide: boolean;
  private _scrollBarAutoHideDelay: number;
  private _scrollBarAutoHideTimer: number | null;
  private _viewport: Element | null;
  private _content: Element | null;
  private _horizontalScrollBar: Element | null;
  private _verticalScrollBar: Element | null;
  private _isDragging: boolean;
  private _dragStart: Vec2;
  private _dragStartScroll: Vec2;
  private _mouseMoveHandler: (event: MouseEvent) => void;
  private _mouseUpHandler: (event: MouseEvent) => void;
  private _touchMoveHandler: (event: TouchEvent) => void;
  private _touchEndHandler: (event: TouchEvent) => void;

  constructor(screen: Screen) {
    super(screen);
    this._contentSize = new Vec2(100, 100);
    this._scrollPosition = new Vec2(0, 0);
    this._scrollEnabled = true;
    this._horizontalScrollEnabled = true;
    this._verticalScrollEnabled = true;
    this._scrollBarWidth = 10;
    this._scrollBarColor = '#000000';
    this._scrollBarOpacity = 0.5;
    this._scrollBarAutoHide = true;
    this._scrollBarAutoHideDelay = 1000;
    this._scrollBarAutoHideTimer = null;
    this._viewport = null;
    this._content = null;
    this._horizontalScrollBar = null;
    this._verticalScrollBar = null;
    this._isDragging = false;
    this._dragStart = new Vec2(0, 0);
    this._dragStartScroll = new Vec2(0, 0);

    this._mouseMoveHandler = this._onMouseMove.bind(this);
    this._mouseUpHandler = this._onMouseUp.bind(this);
    this._touchMoveHandler = this._onTouchMove.bind(this);
    this._touchEndHandler = this._onTouchEnd.bind(this);

    this._createScrollBars();
    this._bindEvents();
  }

  private _createScrollBars(): void {
    this._horizontalScrollBar = new Element(this.screen);
    this._horizontalScrollBar.setLocalPosition(0, -this.height / 2 + this._scrollBarWidth / 2, 0);
    this._horizontalScrollBar.setLocalScale(this.width, this._scrollBarWidth, 1);
    this._horizontalScrollBar.setColor(this._scrollBarColor);
    this._horizontalScrollBar.setOpacity(this._scrollBarOpacity);
    this.addChild(this._horizontalScrollBar);

    this._verticalScrollBar = new Element(this.screen);
    this._verticalScrollBar.setLocalPosition(this.width / 2 - this._scrollBarWidth / 2, 0, 0);
    this._verticalScrollBar.setLocalScale(this._scrollBarWidth, this.height, 1);
    this._verticalScrollBar.setColor(this._scrollBarColor);
    this._verticalScrollBar.setOpacity(this._scrollBarOpacity);
    this.addChild(this._verticalScrollBar);
  }

  private _bindEvents(): void {
    this.on('mousedown', this._onMouseDown, this);
    this.on('touchstart', this._onTouchStart, this);
  }

  private _onMouseDown(event: MouseEvent): void {
    if (!this._scrollEnabled) return;
    this._startDrag(new Vec2(event.clientX, event.clientY));
    window.addEventListener('mousemove', this._mouseMoveHandler);
    window.addEventListener('mouseup', this._mouseUpHandler);
  }

  private _onMouseMove(event: MouseEvent): void {
    if (!this._isDragging) return;
    this._updateDrag(new Vec2(event.clientX, event.clientY));
  }

  private _onMouseUp(event: MouseEvent): void {
    this._endDrag();
    window.removeEventListener('mousemove', this._mouseMoveHandler);
    window.removeEventListener('mouseup', this._mouseUpHandler);
  }

  private _onTouchStart(event: TouchEvent): void {
    if (!this._scrollEnabled) return;
    const touch = event.touches[0];
    this._startDrag(new Vec2(touch.clientX, touch.clientY));
    window.addEventListener('touchmove', this._touchMoveHandler);
    window.addEventListener('touchend', this._touchEndHandler);
  }

  private _onTouchMove(event: TouchEvent): void {
    if (!this._isDragging) return;
    const touch = event.touches[0];
    this._updateDrag(new Vec2(touch.clientX, touch.clientY));
  }

  private _onTouchEnd(event: TouchEvent): void {
    this._endDrag();
    window.removeEventListener('touchmove', this._touchMoveHandler);
    window.removeEventListener('touchend', this._touchEndHandler);
  }

  private _startDrag(position: Vec2): void {
    this._isDragging = true;
    this._dragStart.copy(position);
    this._dragStartScroll.copy(this._scrollPosition);
  }

  private _updateDrag(position: Vec2): void {
    const delta = Vec2.sub(position, this._dragStart);
    const newScrollX = this._dragStartScroll.x - delta.x;
    const newScrollY = this._dragStartScroll.y - delta.y;
    this.scrollTo(newScrollX, newScrollY);
  }

  private _endDrag(): void {
    this._isDragging = false;
  }

  private _updateScrollBars(): void {
    if (!this._horizontalScrollBar || !this._verticalScrollBar) return;

    const maxScrollX = Math.max(0, this._contentSize.x - this.width);
    const maxScrollY = Math.max(0, this._contentSize.y - this.height);

    const scrollRatioX = maxScrollX > 0 ? this._scrollPosition.x / maxScrollX : 0;
    const scrollRatioY = maxScrollY > 0 ? this._scrollPosition.y / maxScrollY : 0;

    const horizontalBarWidth = Math.max(20, this.width * (this.width / this._contentSize.x));
    const verticalBarHeight = Math.max(20, this.height * (this.height / this._contentSize.y));

    this._horizontalScrollBar.setLocalScale(horizontalBarWidth, this._scrollBarWidth, 1);
    this._horizontalScrollBar.setLocalPosition(
      -this.width / 2 + horizontalBarWidth / 2 + scrollRatioX * (this.width - horizontalBarWidth),
      -this.height / 2 + this._scrollBarWidth / 2,
      0
    );

    this._verticalScrollBar.setLocalScale(this._scrollBarWidth, verticalBarHeight, 1);
    this._verticalScrollBar.setLocalPosition(
      this.width / 2 - this._scrollBarWidth / 2,
      this.height / 2 - verticalBarHeight / 2 - scrollRatioY * (this.height - verticalBarHeight),
      0
    );

    if (this._scrollBarAutoHide) {
      this._showScrollBars();
      this._scheduleScrollBarHide();
    }
  }

  private _showScrollBars(): void {
    if (this._horizontalScrollBar) this._horizontalScrollBar.setOpacity(this._scrollBarOpacity);
    if (this._verticalScrollBar) this._verticalScrollBar.setOpacity(this._scrollBarOpacity);
  }

  private _hideScrollBars(): void {
    if (this._horizontalScrollBar) this._horizontalScrollBar.setOpacity(0);
    if (this._verticalScrollBar) this._verticalScrollBar.setOpacity(0);
  }

  private _scheduleScrollBarHide(): void {
    if (this._scrollBarAutoHideTimer) {
      clearTimeout(this._scrollBarAutoHideTimer);
    }
    this._scrollBarAutoHideTimer = window.setTimeout(() => {
      this._hideScrollBars();
      this._scrollBarAutoHideTimer = null;
    }, this._scrollBarAutoHideDelay);
  }

  public render(): void {
    if (!this.enabled) return;
    super.render();
    if (this._content) {
      this._content.render();
    }
    if (this._horizontalScrollBar) {
      this._horizontalScrollBar.render();
    }
    if (this._verticalScrollBar) {
      this._verticalScrollBar.render();
    }
  }

  public update(dt: number): void {
    if (!this.enabled) return;
    super.update(dt);
    if (this._content) {
      this._content.update(dt);
    }
    if (this._horizontalScrollBar) {
      this._horizontalScrollBar.update(dt);
    }
    if (this._verticalScrollBar) {
      this._verticalScrollBar.update(dt);
    }
  }

  public scrollTo(x: number, y: number): void {
    const maxScrollX = Math.max(0, this._contentSize.x - this.width);
    const maxScrollY = Math.max(0, this._contentSize.y - this.height);

    this._scrollPosition.x = Math.max(0, Math.min(x, maxScrollX));
    this._scrollPosition.y = Math.max(0, Math.min(y, maxScrollY));

    if (this._content) {
      this._content.setLocalPosition(-this._scrollPosition.x, this._scrollPosition.y, 0);
    }

    this._updateScrollBars();
  }

  public scrollBy(dx: number, dy: number): void {
    this.scrollTo(this._scrollPosition.x + dx, this._scrollPosition.y + dy);
  }

  public scrollToTop(): void {
    this.scrollTo(this._scrollPosition.x, 0);
  }

  public scrollToBottom(): void {
    const maxScrollY = Math.max(0, this._contentSize.y - this.height);
    this.scrollTo(this._scrollPosition.x, maxScrollY);
  }

  public scrollToLeft(): void {
    this.scrollTo(0, this._scrollPosition.y);
  }

  public scrollToRight(): void {
    const maxScrollX = Math.max(0, this._contentSize.x - this.width);
    this.scrollTo(maxScrollX, this._scrollPosition.y);
  }

  public setContentSize(width: number, height: number): void {
    this._contentSize.set(width, height);
    this._updateScrollBars();
  }

  public setScrollEnabled(enabled: boolean): void {
    this._scrollEnabled = enabled;
  }

  public setHorizontalScrollEnabled(enabled: boolean): void {
    this._horizontalScrollEnabled = enabled;
    if (this._horizontalScrollBar) {
      this._horizontalScrollBar.enabled = enabled;
    }
  }

  public setVerticalScrollEnabled(enabled: boolean): void {
    this._verticalScrollEnabled = enabled;
    if (this._verticalScrollBar) {
      this._verticalScrollBar.enabled = enabled;
    }
  }

  public setScrollBarWidth(width: number): void {
    this._scrollBarWidth = width;
    this._updateScrollBars();
  }

  public setScrollBarColor(color: string): void {
    this._scrollBarColor = color;
    if (this._horizontalScrollBar) {
      this._horizontalScrollBar.setColor(color);
    }
    if (this._verticalScrollBar) {
      this._verticalScrollBar.setColor(color);
    }
  }

  public setScrollBarOpacity(opacity: number): void {
    this._scrollBarOpacity = opacity;
    this._updateScrollBars();
  }

  public setScrollBarAutoHide(autoHide: boolean): void {
    this._scrollBarAutoHide = autoHide;
    if (!autoHide) {
      this._showScrollBars();
    }
  }

  public setScrollBarAutoHideDelay(delay: number): void {
    this._scrollBarAutoHideDelay = delay;
  }

  public setViewport(viewport: Element): void {
    this._viewport = viewport;
  }

  public setContent(content: Element): void {
    if (this._content) {
      this.removeChild(this._content);
    }
    this._content = content;
    this.addChild(content);
    this._updateScrollBars();
  }

  public getScrollPosition(): Vec2 {
    return this._scrollPosition.clone();
  }

  public getContentSize(): Vec2 {
    return this._contentSize.clone();
  }

  public isScrollEnabled(): boolean {
    return this._scrollEnabled;
  }

  public isHorizontalScrollEnabled(): boolean {
    return this._horizontalScrollEnabled;
  }

  public isVerticalScrollEnabled(): boolean {
    return this._verticalScrollEnabled;
  }

  public getScrollBarWidth(): number {
    return this._scrollBarWidth;
  }

  public getScrollBarColor(): string {
    return this._scrollBarColor;
  }

  public getScrollBarOpacity(): number {
    return this._scrollBarOpacity;
  }

  public isScrollBarAutoHide(): boolean {
    return this._scrollBarAutoHide;
  }

  public getScrollBarAutoHideDelay(): number {
    return this._scrollBarAutoHideDelay;
  }

  public getViewport(): Element | null {
    return this._viewport;
  }

  public getContent(): Element | null {
    return this._content;
  }
}
