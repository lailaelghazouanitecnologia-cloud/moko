import { EventEmitter } from '../core';
import { Vec2 } from '../math';
import { Element } from './element';

export class ScrollView extends Element {
    private contentElement: HTMLElement;
    private viewportElement: HTMLElement;
    private scrollOffset: Vec2;
    private contentSize: Vec2;
    private viewportSize: Vec2;
    private isDragging: boolean;
    private dragStart: Vec2;
    private dragStartOffset: Vec2;
    private touchStartTime: number;
    private velocity: Vec2;
    private animationFrame: number | null;

    constructor() {
        super();
        this.contentElement = document.createElement('div');
        this.viewportElement = document.createElement('div');
        this.scrollOffset = new Vec2(0, 0);
        this.contentSize = new Vec2(0, 0);
        this.viewportSize = new Vec2(0, 0);
        this.isDragging = false;
        this.dragStart = new Vec2(0, 0);
        this.dragStartOffset = new Vec2(0, 0);
        this.touchStartTime = 0;
        this.velocity = new Vec2(0, 0);
        this.animationFrame = null;

        this.setupDOM();
        this.bindEvents();
    }

    private setupDOM(): void {
        this.viewportElement.style.overflow = 'hidden';
        this.viewportElement.style.position = 'relative';
        this.viewportElement.style.width = '100%';
        this.viewportElement.style.height = '100%';

        this.contentElement.style.position = 'absolute';
        this.contentElement.style.top = '0';
        this.contentElement.style.left = '0';

        this.viewportElement.appendChild(this.contentElement);
        this.element.appendChild(this.viewportElement);
    }

    private bindEvents(): void {
        this.viewportElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.viewportElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.viewportElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.viewportElement.addEventListener('mouseleave', this.onMouseUp.bind(this));

        this.viewportElement.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.viewportElement.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.viewportElement.addEventListener('touchend', this.onTouchEnd.bind(this));
        this.viewportElement.addEventListener('touchcancel', this.onTouchEnd.bind(this));

        this.viewportElement.addEventListener('wheel', this.onWheel.bind(this));
    }

    private onMouseDown(event: MouseEvent): void {
        this.startDrag(new Vec2(event.clientX, event.clientY));
    }

    private onMouseMove(event: MouseEvent): void {
        if (this.isDragging) {
            this.updateDrag(new Vec2(event.clientX, event.clientY));
        }
    }

    private onMouseUp(): void {
        this.endDrag();
    }

    private onTouchStart(event: TouchEvent): void {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.touchStartTime = Date.now();
            this.startDrag(new Vec2(touch.clientX, touch.clientY));
        }
    }

    private onTouchMove(event: TouchEvent): void {
        if (this.isDragging && event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            this.updateDrag(new Vec2(touch.clientX, touch.clientY));
        }
    }

    private onTouchEnd(): void {
        this.endDrag();
    }

    private onWheel(event: WheelEvent): void {
        event.preventDefault();
        const delta = new Vec2(event.deltaX, event.deltaY);
        this.scrollBy(delta);
    }

    private startDrag(position: Vec2): void {
        this.isDragging = true;
        this.dragStart = position.clone();
        this.dragStartOffset = this.scrollOffset.clone();
        this.velocity.set(0, 0);
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    private updateDrag(position: Vec2): void {
        const delta = Vec2.sub(position, this.dragStart);
        const newOffset = Vec2.sub(this.dragStartOffset, delta);
        this.setContentOffset(newOffset);
    }

    private endDrag(): void {
        this.isDragging = false;
        this.applyMomentum();
    }

    private applyMomentum(): void {
        const lastOffset = this.scrollOffset.clone();
        const checkMovement = () => {
            if (this.isDragging) return;
            
            const currentOffset = this.scrollOffset.clone();
            const delta = Vec2.sub(currentOffset, lastOffset);
            this.velocity = Vec2.lerp(this.velocity, delta, 0.1);
            
            if (this.velocity.length() > 0.1) {
                const newOffset = Vec2.add(this.scrollOffset, this.velocity);
                this.setContentOffset(newOffset);
                this.velocity.mulScalar(0.95);
                this.animationFrame = requestAnimationFrame(checkMovement);
            } else {
                this.animationFrame = null;
            }
            
            lastOffset.copy(currentOffset);
        };
        
        this.animationFrame = requestAnimationFrame(checkMovement);
    }

    private clampOffset(offset: Vec2): Vec2 {
        const maxX = Math.max(0, this.contentSize.x - this.viewportSize.x);
        const maxY = Math.max(0, this.contentSize.y - this.viewportSize.y);
        
        return new Vec2(
            Math.max(0, Math.min(maxX, offset.x)),
            Math.max(0, Math.min(maxY, offset.y))
        );
    }

    private updateContentPosition(): void {
        this.contentElement.style.transform = `translate(-${this.scrollOffset.x}px, -${this.scrollOffset.y}px)`;
    }

    public scrollTo(x: number, y: number): void {
        const targetOffset = new Vec2(x, y);
        const clampedOffset = this.clampOffset(targetOffset);
        this.setContentOffset(clampedOffset);
    }

    public scrollBy(delta: Vec2): void {
        const newOffset = Vec2.add(this.scrollOffset, delta);
        const clampedOffset = this.clampOffset(newOffset);
        this.setContentOffset(clampedOffset);
    }

    public setContentSize(width: number, height: number): void {
        this.contentSize.set(width, height);
        this.contentElement.style.width = `${width}px`;
        this.contentElement.style.height = `${height}px`;
        
        const clampedOffset = this.clampOffset(this.scrollOffset);
        if (!clampedOffset.equals(this.scrollOffset)) {
            this.setContentOffset(clampedOffset);
        }
    }

    public getContentOffset(): Vec2 {
        return this.scrollOffset.clone();
    }

    private setContentOffset(offset: Vec2): void {
        this.scrollOffset.copy(offset);
        this.updateContentPosition();
    }

    public setViewportSize(width: number, height: number): void {
        this.viewportSize.set(width, height);
    }

    public appendChild(element: Element): void {
        this.contentElement.appendChild(element.element);
    }

    public removeChild(element: Element): void {
        this.contentElement.removeChild(element.element);
    }

    public destroy(): void {
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
        }
        super.destroy();
    }
}
