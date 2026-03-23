import { TouchEvent } from './InputManager';

export class Touch {
  private touches: Map<number, {x: number, y: number}> = new Map();
  private prevTouches: Map<number, {x: number, y: number}> = new Map();
  private lastTouchTime: number = 0;
  private readonly TAP_MAX_DURATION: number = 300;

  count(): number {
    return this.touches.size;
  }

  getPosition(id: number): {x: number, y: number} | null {
    return this.touches.get(id) || null;
  }

  onStart(e: TouchEvent): void {
    const changedTouches = e.changedTouches;
    for (let i = 0; i < changedTouches.length; i++) {
      const touch = changedTouches[i];
      this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }
    if (changedTouches.length > 0) {
      this.lastTouchTime = performance.now();
    }
  }

  onMove(e: TouchEvent): void {
    const changedTouches = e.changedTouches;
    for (let i = 0; i < changedTouches.length; i++) {
      const touch = changedTouches[i];
      if (this.touches.has(touch.identifier)) {
        this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }
    }
  }

  onEnd(e: TouchEvent): void {
    const changedTouches = e.changedTouches;
    for (let i = 0; i < changedTouches.length; i++) {
      const touch = changedTouches[i];
      this.touches.delete(touch.identifier);
    }
  }

  update(): void {
    this.prevTouches.clear();
    this.touches.forEach((pos, id) => {
      this.prevTouches.set(id, { x: pos.x, y: pos.y });
    });
  }

  isSingleTap(): boolean {
    if (this.touches.size !== 1) return false;
    const now = performance.now();
    const elapsed = now - this.lastTouchTime;
    return elapsed <= this.TAP_MAX_DURATION;
  }

  isPinching(): boolean {
    if (this.touches.size !== 2) return false;
    const [id1, id2] = Array.from(this.touches.keys());
    const curr1 = this.touches.get(id1)!;
    const curr2 = this.touches.get(id2)!;
    const prev1 = this.prevTouches.get(id1);
    const prev2 = this.prevTouches.get(id2);
    if (!prev1 || !prev2) return false;
    const dxCurr = curr2.x - curr1.x;
    const dyCurr = curr2.y - curr1.y;
    const dxPrev = prev2.x - prev1.x;
    const dyPrev = prev2.y - prev1.y;
    const distCurr = Math.sqrt(dxCurr * dxCurr + dyCurr * dyCurr);
    const distPrev = Math.sqrt(dxPrev * dxPrev + dyPrev * dyPrev);
    return Math.abs(distCurr - distPrev) > 1;
  }
}
