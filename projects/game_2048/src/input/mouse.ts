import { Vec2 } from '../math/vec2';

/**
 * Mouse input abstraction for handling mouse events and tracking state.
 */
export class Mouse {
    private position: Vec2;
    private delta: Vec0;
    private isLocked: boolean;
    private wheelDelta: number;
    private buttons: Map<number, boolean>;
    private buttonsPressed: Set<number>;
    private buttonsReleased: Set<number>;
    private element: HTMLElement | null = null;
    private canvas: HTMLCanvasElement | null = null;

    constructor() {
        this.position = new Vec2(0, 0);
        this.delta = new Vec2(0, 0);
        this.isLocked = false;
        this.wheelDelta = 0;
        this.buttons = new Map<number, boolean>();
        this.buttonsPressed = new Set<number>();
        this.buttonsReleased = new Set<number>();
    }

    /**
     * Attach mouse event listeners to the specified element.
     * @param element - The HTML element to attach listeners to.
     * @throws {Error} Throws if element is not an HTMLElement.
     */
    attach(element: HTMLElement): void {
        if (!(element instanceof HTMLElement)) {
            throw new Error('Mouse.attach: element must be an instance of HTMLElement');
        }

        this.detach();

        this.element = element;
        this.canvas = element instanceof HTMLCanvasElement ? element : null;

        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handlePointerLockChange = this.handlePointerLockChange.bind(this);

        element.addEventListener('mousemove', this.handleMouseMove);
        element.addEventListener('mousedown', this.handleMouseDown);
        element.addEventListener('mouseup', this.handleMouseUp);
        element.addEventListener('wheel', this.handleWheel, { passive: false });
        element.addEventListener('click', this.handleClick);

        document.addEventListener('pointerlockchange', this.handlePointerLockChange);
        document.addEventListener('mozpointerlockchange', this.handlePointerLockChange);
        document.addEventListener('webkitpointerlockchange', this.handlePointerLockChange);
    }

    /**
     * Detach mouse event listeners and clean up resources.
     */
    detach(): void {
        if (this.element) {
            this.element.removeEventListener('mousemove', this.handleMouseMove);
            this.element.removeEventListener('mousedown', this.handleMouseDown);
            this.element.removeEventListener('mouseup', this.handleMouseUp);
            this.element.removeEventListener('wheel', this.handleWheel);
            this.handleClick && this.element.removeEventListener('click', this.handleClick);
        }

        document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
        document.removeEventListener('mozpointerlockchange', this.handlePointerLockChange);
        document.removeEventListener('webkitpointerlockchange', this.handlePointerLockChange);

        this.element = null;
        this.canvas = null;
    }

    /**
     * Handle mouse move events.
     */
    private handleMouseMove = (event: MouseEvent): void => {
        if (this.isLocked) {
            this.delta.set(event.movementX, event.movementY);
            this.position.add(this.delta);
        } else {
            const rect = this.element?.getBoundingClientRect();
            if (rect) {
                const newX = event.clientX - rect.left;
                const newY = event.clientY - rect.top;
                this.delta.set(newX - this.position.x, newY - this.position.y);
                this.position.set(newX, newY);
            }
        }
    };

    /**
     * Handle mouse button down events.
     */
    private handleMouseDown = (event: MouseEvent): void => {
        this.buttons.set(event.button, true);
        this.buttonsPressed.add(event.button);
    };

    /**
     * Handle mouse button up events.
     */
    private handleMouseUp = (event: MouseEvent): void => {
        this.buttons.set(event.button, false);
        this.buttonsReleased.add(event.button);
    };

    /**
     * Handle mouse wheel events.
     */
    private handleWheel = (event: WheelEvent): void => {
        this.wheelDelta = event.deltaY;
        event.preventDefault();
    };

    /**
     * Handle click events (currently a no-op).
     */
    private handleClick = (_event: MouseEvent): void => {
        // Handle click if needed
    };

    /**
     * Handle pointer lock change events.
     */
    private handlePointerLockChange = (): void => {
        this.isLocked = document.pointerLockElement === this.element ||
                       (document as any).mozPointerLockElement === this.element ||
                       (document as any).webkitPointerLockElement === this.element;
    };

    /**
     * Check if a mouse button is currently down.
     * @param button - The button code to check.
     * @returns True if the button is down, else false.
     */
    isButtonDown(button: number): boolean {
        return this.buttons.get(button) || false;
    }

    /**
     * Check if a mouse button was pressed this frame.
     * @param button - The button code to check.
     * @returns True if the button was pressed this frame, else false.
     */
    isButtonPressed(button: number): boolean {
        return this.buttonsPressed.has(button);
    }

    /**
     * Check if a mouse button was released this frame.
     * @param button - The button code to check.
     * @returns True if the button was released this frame, else false.
     */
    isButtonReleased(button: number): boolean {
        return this.buttonsReleased.has(button);
    }

    /**
     * Lock the mouse cursor to the current element.
     */
    lock(): void {
        if (this.element) {
            this.element.requestPointerLock();
        }
    }

    /**
     * Unlock the mouse cursor from the current element.
     */
    unlock(): void {
        document.exitPointerLock();
    }

    /**
     * Update the mouse state for the current frame.
     * @param _deltaTime - Time elapsed since the last frame (unused).
     */
    update(_deltaTime: number): void {
        this.buttonsPressed.clear();
        this.buttonsReleased.clear();
        this.wheelDelta = 0;

        if (!this.isLocked) {
            this.delta.set(0, 0);
        }
    }

    /**
     * Get the current mouse position in pixels relative to the attached element.
     * @returns A new Vec2 with the current position.
     */
    getPosition(): Vec2 {
        return this.position.clone();
    }

    /**
     * Get the current mouse delta since the last frame.
     * @returns A new Vec2 with the current delta.
     */
    getDelta(): Vec2 {
        return this.delta.clone();
    }

    /**
     * Get the current wheel delta for this frame.
     * @returns The wheel delta value.
     */
    getWheelDelta(): number {
        return this.wheelDelta;
    }

    /**
     * Check if the pointer is currently locked.
     * @returns True if locked, else false.
     */
    isPointerLocked(): boolean {
        return this.isLocked;
    }
}
