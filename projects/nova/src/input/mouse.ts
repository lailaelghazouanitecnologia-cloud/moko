import { Vec2 } from '../math';
import { EventHandler } from '../core';

export class Mouse {
    static readonly BUTTON_LEFT = 0;
    static readonly BUTTON_MIDDLE = 1;
    static readonly BUTTON_RIGHT = 2;

    position: Vec2 = new Vec2();
    delta: Vec2 = new Vec2();
    buttons: Map<number, boolean> = new Map();
    prevButtons: Map<number, boolean> = new Map();
    wheel: number = 0;
    events: EventHandler = new EventHandler();

    private element?: HTMLElement;
    private boundMouseMove?: (event: MouseEvent) => void;
    private boundMouseDown?: (event: MouseEvent) => void;
    private boundMouseUp?: (event: MouseEvent) => void;
    private boundWheel?: (event: WheelEvent) => void;

    isPressed(button: number): boolean {
        return this.buttons.get(button) || false;
    }

    wasPressed(button: number): boolean {
        return (this.buttons.get(button) || false) && !(this.prevButtons.get(button) || false);
    }

    wasReleased(button: number): boolean {
        return !(this.buttons.get(button) || false) && (this.prevButtons.get(button) || false);
    }

    getX(): number {
        return this.position.x;
    }

    getY(): number {
        return this.position.y;
    }

    getDeltaX(): number {
        return this.delta.x;
    }

    getDeltaY(): number {
        return this.delta.y;
    }

    getWheel(): number {
        return this.wheel;
    }

    update(): void {
        this.prevButtons.clear();
        for (const [key, value] of this.buttons) {
            this.prevButtons.set(key, value);
        }
        this.delta.set(0, 0);
        this.wheel = 0;
    }

    onMouseMove(event: MouseEvent): void {
        this.delta.x += event.movementX;
        this.delta.y += event.movementY;
        this.position.x = event.clientX;
        this.position.y = event.clientY;
    }

    onMouseDown(event: MouseEvent): void {
        this.buttons.set(event.button, true);
    }

    onMouseUp(event: MouseEvent): void {
        this.buttons.set(event.button, false);
    }

    onWheel(event: WheelEvent): void {
        this.wheel += event.deltaY;
        event.preventDefault();
    }

    attach(element: HTMLElement): void {
        this.detach();
        this.element = element;
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
        this.boundWheel = this.onWheel.bind(this);
        element.addEventListener('mousemove', this.boundMouseMove);
        element.addEventListener('mousedown', this.boundMouseDown);
        element.addEventListener('mouseup', this.boundMouseUp);
        element.addEventListener('wheel', this.boundWheel, { passive: false });
    }

    detach(): void {
        if (this.element && this.boundMouseMove && this.boundMouseDown && this.boundMouseUp && this.boundWheel) {
            this.element.removeEventListener('mousemove', this.boundMouseMove);
            this.element.removeEventListener('mousedown', this.boundMouseDown);
            this.element.removeEventListener('mouseup', this.boundMouseUp);
            this.element.removeEventListener('wheel', this.boundWheel);
            this.element = undefined;
            this.boundMouseMove = undefined;
            this.boundMouseDown = undefined;
            this.boundMouseUp = undefined;
            this.boundWheel = undefined;
        }
    }

    destroy(): void {
        this.detach();
        this.events.destroy();
    }
}
