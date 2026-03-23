import { EventHandler } from '../core';

export class Keyboard {
    private keys: Map<string, boolean> = new Map();
    private prevKeys: Map<string, boolean> = new Map();
    private events: EventHandler = new EventHandler();
    private attachedElement: HTMLElement | null = null;
    private boundKeyDown: (event: KeyboardEvent) => void;
    private boundKeyUp: (event: KeyboardEvent) => void;

    constructor() {
        this.boundKeyDown = this.onKeyDown.bind(this);
        this.boundKeyUp = this.onKeyUp.bind(this);
    }

    isPressed(key: string): boolean {
        return this.keys.get(key) || false;
    }

    wasPressed(key: string): boolean {
        const current = this.keys.get(key) || false;
        const previous = this.prevKeys.get(key) || false;
        return current && !previous;
    }

    wasReleased(key: string): boolean {
        const current = this.keys.get(key) || false;
        const previous = this.prevKeys.get(key) || false;
        return !current && previous;
    }

    update(): void {
        this.prevKeys.clear();
        for (const [key, value] of this.keys) {
            this.prevKeys.set(key, value);
        }
    }

    onKeyDown(event: KeyboardEvent): void {
        const key = event.code || event.key;
        this.keys.set(key, true);
        this.events.fire('keydown', key, event);
    }

    onKeyUp(event: KeyboardEvent): void {
        const key = event.code || event.key;
        this.keys.set(key, false);
        this.events.fire('keyup', key, event);
    }

    attach(element: HTMLElement): void {
        this.detach();
        this.attachedElement = element;
        element.addEventListener('keydown', this.boundKeyDown);
        element.addEventListener('keyup', this.boundKeyUp);
    }

    detach(): void {
        if (this.attachedElement) {
            this.attachedElement.removeEventListener('keydown', this.boundKeyDown);
            this.attachedElement.removeEventListener('keyup', this.boundKeyUp);
            this.attachedElement = null;
        }
    }

    destroy(): void {
        this.detach();
        this.events.off();
        this.keys.clear();
        this.prevKeys.clear();
    }

    static readonly KEY_A = 'KeyA';
    static readonly KEY_SPACE = 'Space';
    static readonly KEY_ENTER = 'Enter';
    static readonly KEY_SHIFT = 'ShiftLeft';
    static readonly KEY_CTRL = 'ControlLeft';
    static readonly KEY_ALT = 'AltLeft';
    static readonly KEY_ESC = 'Escape';
}
