export class Mouse {
    static readonly LEFT = 0;
    static readonly MIDDLE = 1;
    static readonly RIGHT = 2;

    x: number = 0;
    y: number = 0;
    dx: number = 0;
    dy: number = 0;
    buttons: Map<number, boolean> = new Map();
    prevButtons: Map<number, boolean> = new Map();
    locked: boolean = false;

    isDown(btn: number): boolean {
        return this.buttons.get(btn) || false;
    }

    isPressed(btn: number): boolean {
        return (this.buttons.get(btn) || false) && !(this.prevButtons.get(btn) || false);
    }

    isReleased(btn: number): boolean {
        return !(this.buttons.get(btn) || false) && (this.prevButtons.get(btn) || false);
    }

    update(): void {
        this.prevButtons.clear();
        this.buttons.forEach((v, k) => this.prevButtons.set(k, v));
        this.dx = 0;
        this.dy = 0;
    }

    onMove(e: MouseEvent): void {
        this.dx = e.movementX;
        this.dy = e.movementY;
        this.x += this.dx;
        this.y += this.dy;
    }

    onDown(e: MouseEvent): void {
        this.buttons.set(e.button, true);
    }

    onUp(e: MouseEvent): void {
        this.buttons.set(e.button, false);
    }

    lock(canvas: HTMLCanvasElement): void {
        canvas.requestPointerLock();
        this.locked = true;
    }

    unlock(): void {
        document.exitPointerLock();
        this.locked = false;
    }
}
