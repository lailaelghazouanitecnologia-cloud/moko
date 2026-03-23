export class Mouse {
    private x: number = 0;
    private y: number = 0;
    private deltaX: number = 0;
    private deltaY: number = 0;
    private buttons: Map<number, boolean> = new Map();
    private prevButtons: Map<number, boolean> = new Map();
    private wheel: number = 0;

    static readonly LEFT_BUTTON: number = 0;
    static readonly MIDDLE_BUTTON: number = 1;
    static readonly RIGHT_BUTTON: number = 2;

    isButtonDown(button: number): boolean {
        return this.buttons.get(button) || false;
    }

    isButtonPressed(button: number): boolean {
        const current = this.buttons.get(button) || false;
        const previous = this.prevButtons.get(button) || false;
        return current && !previous;
    }

    isButtonReleased(button: number): boolean {
        const current = this.buttons.get(button) || false;
        const previous = this.prevButtons.get(button) || false;
        return !current && previous;
    }

    getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    getDelta(): { x: number; y: number } {
        return { x: this.deltaX, y: this.deltaY };
    }

    getWheel(): number {
        return this.wheel;
    }

    handleMouseMove(event: MouseEvent): void {
        this.deltaX = event.movementX;
        this.deltaY = event.movementY;
        this.x = event.clientX;
        this.y = event.clientY;
    }

    handleMouseDown(event: MouseEvent): void {
        this.buttons.set(event.button, true);
    }

    handleMouseUp(event: MouseEvent): void {
        this.buttons.set(event.button, false);
    }

    handleWheel(event: WheelEvent): void {
        this.wheel = event.deltaY;
    }

    update(): void {
        this.prevButtons.clear();
        this.buttons.forEach((value, key) => {
            this.prevButtons.set(key, value);
        });
        this.deltaX = 0;
        this.deltaY = 0;
        this.wheel = 0;
    }

    clear(): void {
        this.x = 0;
        this.y = 0;
        this.deltaX = 0;
        this.deltaY = 0;
        this.buttons.clear();
        this.prevButtons.clear();
        this.wheel = 0;
    }

    isInside(x: number, y: number, width: number, height: number): boolean {
        return this.x >= x && this.x <= x + width && this.y >= y && this.y <= y + height;
    }
}
