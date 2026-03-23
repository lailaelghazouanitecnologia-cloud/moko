import { EventHandler } from '../core';
import { TouchData } from './touch-data';

export class Touch {
    touches: Map<number, TouchData> = new Map();
    changedTouches: TouchData[] = [];
    events: EventHandler = new EventHandler();

    getTouch(id: number): TouchData | undefined {
        return this.touches.get(id);
    }

    getAllTouches(): TouchData[] {
        return Array.from(this.touches.values());
    }

    getTouchCount(): number {
        return this.touches.size;
    }

    onTouchStart(event: TouchEvent): void {
        event.preventDefault();
        this.changedTouches = [];
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchData = new TouchData(touch.identifier, touch.clientX, touch.clientY);
            this.touches.set(touch.identifier, touchData);
            this.changedTouches.push(touchData);
        }
        
        this.events.fire('touchstart', this.changedTouches);
    }

    onTouchMove(event: TouchEvent): void {
        event.preventDefault();
        this.changedTouches = [];
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchData = this.touches.get(touch.identifier);
            if (touchData) {
                touchData.x = touch.clientX;
                touchData.y = touch.clientY;
                this.changedTouches.push(touchData);
            }
        }
        
        this.events.fire('touchmove', this.changedTouches);
    }

    onTouchEnd(event: TouchEvent): void {
        event.preventDefault();
        this.changedTouches = [];
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchData = this.touches.get(touch.identifier);
            if (touchData) {
                touchData.x = touch.clientX;
                touchData.y = touch.clientY;
                this.changedTouches.push(touchData);
                this.touches.delete(touch.identifier);
            }
        }
        
        this.events.fire('touchend', this.changedTouches);
    }

    onTouchCancel(event: TouchEvent): void {
        event.preventDefault();
        this.changedTouches = [];
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchData = this.touches.get(touch.identifier);
            if (touchData) {
                this.changedTouches.push(touchData);
                this.touches.delete(touch.identifier);
            }
        }
        
        this.events.fire('touchcancel', this.changedTouches);
    }

    attach(element: HTMLElement): void {
        element.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        element.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        element.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        element.addEventListener('touchcancel', this.onTouchCancel.bind(this), { passive: false });
    }

    detach(): void {
        // Implementation will be handled by the element that attached the listeners
    }

    destroy(): void {
        this.touches.clear();
        this.changedTouches = [];
        this.events.off();
    }
}
