import { Element } from './element';
import { Vec2 } from '../math';

export class ScrollView extends Element {
    private content: Element | null = null;
    private horizontal: boolean = true;
    private vertical: boolean = true;
    private inertia: number = 0.95;
    private elasticity: number = 0.3;
    private scrollSensitivity: number = 1;
    private viewport: Element | null = null;
    private scrollbarH: Element | null = null;
    private scrollbarV: Element | null = null;
    private scrollPosition: Vec2 = new Vec2(0, 0);
    private velocity: Vec2 = new Vec2(0, 0);
    private isDragging: boolean = false;
    private dragStart: Vec2 = new Vec2(0, 0);
    private contentSize: Vec2 = new Vec2(0, 0);
    private viewportSize: Vec2 = new Vec2(0, 0);

    setContent(content: Element): void {
        this.content = content;
        if (this.viewport && content) {
            this.viewport.addChild(content);
            this.updateContentSize();
            this.updateScrollbars();
        }
    }

    setHorizontal(enabled: boolean): void {
        this.horizontal = enabled;
        if (!enabled) {
            this.scrollPosition.x = 0;
            this.velocity.x = 0;
        }
        this.updateScrollbars();
    }

    setVertical(enabled: boolean): void {
        this.vertical = enabled;
        if (!enabled) {
            this.scrollPosition.y = 0;
            this.velocity.y = 0;
        }
        this.updateScrollbars();
    }

    setInertia(inertia: number): void {
        this.inertia = Math.max(0, Math.min(1, inertia));
    }

    setElasticity(elasticity: number): void {
        this.elasticity = Math.max(0, Math.min(1, elasticity));
    }

    setScrollSensitivity(sensitivity: number): void {
        this.scrollSensitivity = Math.max(0.1, sensitivity);
    }

    scrollTo(x: number, y: number, animate: boolean = false): void {
        if (!animate) {
            this.scrollPosition.set(x, y);
            this.clampScrollPosition();
            this.updateScrollbars();
            return;
        }

        const startX = this.scrollPosition.x;
        const startY = this.scrollPosition.y;
        const deltaX = x - startX;
        const deltaY = y - startY;
        const duration = 300;
        const startTime = Date.now();

        const animateScroll = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            this.scrollPosition.x = startX + deltaX * eased;
            this.scrollPosition.y = startY + deltaY * eased;
            this.clampScrollPosition();
            this.updateScrollbars();

            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        };

        animateScroll();
    }

    scrollToElement(element: Element, animate: boolean = false): void {
        if (!this.content || !element) return;

        const elementBounds = element.getBounds();
        const viewportBounds = this.getViewportBounds();
        
        let targetX = this.scrollPosition.x;
        let targetY = this.scrollPosition.y;

        if (elementBounds.left < viewportBounds.left) {
            targetX = elementBounds.left;
        } else if (elementBounds.right > viewportBounds.right) {
            targetX = elementBounds.right - viewportBounds.width;
        }

        if (elementBounds.top < viewportBounds.top) {
            targetY = elementBounds.top;
        } else if (elementBounds.bottom > viewportBounds.bottom) {
            targetY = elementBounds.bottom - viewportBounds.height;
        }

        this.scrollTo(targetX, targetY, animate);
    }

    updateScrollbars(): void {
        if (!this.viewport || !this.content) return;

        this.updateContentSize();
        this.updateViewportSize();

        const maxScrollX = Math.max(0, this.contentSize.x - this.viewportSize.x);
        const maxScrollY = Math.max(0, this.contentSize.y - this.viewportSize.y);

        if (this.scrollbarH) {
            const scrollbarWidth = this.viewportSize.x * (this.viewportSize.x / this.contentSize.x);
            const scrollbarLeft = (this.scrollPosition.x / maxScrollX) * (this.viewportSize.x - scrollbarWidth);
            
            this.scrollbarH.setLocalPosition(scrollbarLeft, 0, 0);
            this.scrollbarH.setLocalScale(scrollbarWidth, 1, 1);
            this.scrollbarH.enabled = this.horizontal && maxScrollX > 0;
        }

        if (this.scrollbarV) {
            const scrollbarHeight = this.viewportSize.y * (this.viewportSize.y / this.contentSize.y);
            const scrollbarTop = (this.scrollPosition.y / maxScrollY) * (this.viewportSize.y - scrollbarHeight);
            
            this.scrollbarV.setLocalPosition(0, scrollbarTop, 0);
            this.scrollbarV.setLocalScale(1, scrollbarHeight, 1);
            this.scrollbarV.enabled = this.vertical && maxScrollY > 0;
        }
    }

    onMouseWheel(delta: number): void {
        if (!this.vertical && !this.horizontal) return;

        const wheelDelta = delta * this.scrollSensitivity;
        
        if (this.vertical) {
            this.velocity.y += wheelDelta * 0.1;
        } else if (this.horizontal) {
            this.velocity.x += wheelDelta * 0.1;
        }

        this.updateScroll();
    }

    onDrag(dx: number, dy: number): void {
        if (!this.isDragging) return;

        if (this.horizontal) {
            this.velocity.x = dx * 0.5;
        }
        if (this.vertical) {
            this.velocity.y = dy * 0.5;
        }

        this.updateScroll();
    }

    private updateScroll(): void {
        this.scrollPosition.x += this.velocity.x;
        this.scrollPosition.y += this.velocity.y;

        this.clampScrollPosition();

        this.velocity.x *= this.inertia;
        this.velocity.y *= this.inertia;

        if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.01) this.velocity.y = 0;

        this.updateScrollbars();

        if (Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.y) > 0.01) {
            requestAnimationFrame(() => this.updateScroll());
        }
    }

    private clampScrollPosition(): void {
        if (!this.viewport || !this.content) return;

        this.updateContentSize();
        this.updateViewportSize();

        const maxScrollX = Math.max(0, this.contentSize.x - this.viewportSize.x);
        const maxScrollY = Math.max(0, this.contentSize.y - this.viewportSize.y);

        if (this.horizontal) {
            if (this.scrollPosition.x < 0) {
                this.scrollPosition.x = 0;
                this.velocity.x *= -this.elasticity;
            } else if (this.scrollPosition.x > maxScrollX) {
                this.scrollPosition.x = maxScrollX;
                this.velocity.x *= -this.elasticity;
            }
        }

        if (this.vertical) {
            if (this.scrollPosition.y < 0) {
                this.scrollPosition.y = 0;
                this.velocity.y *= -this.elasticity;
            } else if (this.scrollPosition.y > maxScrollY) {
                this.scrollPosition.y = maxScrollY;
                this.velocity.y *= -this.elasticity;
            }
        }

        if (this.content) {
            this.content.setLocalPosition(-this.scrollPosition.x, -this.scrollPosition.y, 0);
        }
    }

    private updateContentSize(): void {
        if (!this.content) return;
        const bounds = this.content.getBounds();
        this.contentSize.x = bounds.width;
        this.contentSize.y = bounds.height;
    }

    private updateViewportSize(): void {
        if (!this.viewport) return;
        const bounds = this.viewport.getBounds();
        this.viewportSize.x = bounds.width;
        this.viewportSize.y = bounds.height;
    }

    private getViewportBounds(): BoundingBox {
        if (!this.viewport) {
            return new BoundingBox();
        }
        return this.viewport.getBounds();
    }

    onMouseDown(x: number, y: number): void {
        this.isDragging = true;
        this.dragStart.set(x, y);
        this.velocity.set(0, 0);
    }

    onMouseUp(): void {
        this.isDragging = false;
    }

    onMouseMove(dx: number, dy: number): void {
        if (this.isDragging) {
            this.onDrag(dx, dy);
        }
    }
}
