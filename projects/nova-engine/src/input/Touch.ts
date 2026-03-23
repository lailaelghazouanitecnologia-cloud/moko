import { TouchData } from './TouchData';

export class Touch {
  private touches: Map<number, TouchData> = new Map();
  private prevTouches: Map<number, TouchData> = new Map();

  getTouch(id: number): TouchData | undefined {
    return this.touches.get(id);
  }

  getAllTouches(): TouchData[] {
    return Array.from(this.touches.values());
  }

  getTouchCount(): number {
    return this.touches.size;
  }

  handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchData: TouchData = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        force: touch.force || 0,
        radiusX: touch.radiusX || 0,
        radiusY: touch.radiusY || 0,
        rotationAngle: touch.rotationAngle || 0
      };
      this.touches.set(touch.identifier, touchData);
    }
  }

  handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const existingTouch = this.touches.get(touch.identifier);
      if (existingTouch) {
        existingTouch.x = touch.clientX;
        existingTouch.y = touch.clientY;
        existingTouch.force = touch.force || 0;
        existingTouch.radiusX = touch.radiusX || 0;
        existingTouch.radiusY = touch.radiusY || 0;
        existingTouch.rotationAngle = touch.rotationAngle || 0;
      }
    }
  }

  handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touches.delete(touch.identifier);
    }
  }

  handleTouchCancel(event: TouchEvent): void {
    event.preventDefault();
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touches.delete(touch.identifier);
    }
  }

  update(): void {
    this.prevTouches.clear();
    this.touches.forEach((touch, id) => {
      this.prevTouches.set(id, { ...touch });
    });
  }

  clear(): void {
    this.touches.clear();
    this.prevTouches.clear();
  }

  isAnyTouch(): boolean {
    return this.touches.size > 0;
  }
}
