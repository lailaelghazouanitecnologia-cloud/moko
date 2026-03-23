import { EventHandler } from '../core';
import { Keyboard } from './keyboard';
import { Mouse } from './mouse';
import { Touch } from './touch';

export class ElementInput {
    private element: HTMLElement | null = null;
    private focused: boolean = false;
    private captured: boolean = false;
    private keyboard: Keyboard | null = null;
    private mouse: Mouse | null = null;
    private touch: Touch | null = null;
    private events: EventHandler = new EventHandler();

    attach(element: HTMLElement): void {
        if (this.element) {
            this.detach();
        }
        
        this.element = element;
        this.keyboard = new Keyboard(element);
        this.mouse = new Mouse(element);
        this.touch = new Touch(element);
        
        this.element.addEventListener('focus', this.onFocus);
        this.element.addEventListener('blur', this.onBlur);
    }

    detach(): void {
        if (!this.element) return;
        
        this.element.removeEventListener('focus', this.onFocus);
        this.element.removeEventListener('blur', this.onBlur);
        
        if (this.keyboard) {
            this.keyboard.destroy();
            this.keyboard = null;
        }
        
        if (this.mouse) {
            this.mouse.destroy();
            this.mouse = null;
        }
        
        if (this.touch) {
            this.touch.destroy();
            this.touch = null;
        }
        
        this.element = null;
        this.focused = false;
        this.captured = false;
    }

    focus(): void {
        if (this.element && !this.focused) {
            this.element.focus();
        }
    }

    blur(): void {
        if (this.element && this.focused) {
            this.element.blur();
        }
    }

    capture(): void {
        if (!this.element || this.captured) return;
        
        this.captured = true;
        
        if (this.keyboard) {
            this.keyboard.attach(this.element);
        }
        
        if (this.mouse) {
            this.mouse.attach(this.element);
        }
        
        if (this.touch) {
            this.touch.attach(this.element);
        }
    }

    release(): void {
        if (!this.captured) return;
        
        this.captured = false;
        
        if (this.keyboard) {
            this.keyboard.detach();
        }
        
        if (this.mouse) {
            this.mouse.detach();
        }
        
        if (this.touch) {
            this.touch.detach();
        }
    }

    isFocused(): boolean {
        return this.focused;
    }

    isCaptured(): boolean {
        return this.captured;
    }

    getKeyboard(): Keyboard {
        if (!this.keyboard) {
            throw new Error('Keyboard not initialized');
        }
        return this.keyboard;
    }

    getMouse(): Mouse {
        if (!this.mouse) {
            throw new Error('Mouse not initialized');
        }
        return this.mouse;
    }

    getTouch(): Touch {
        if (!this.touch) {
            throw new Error('Touch not initialized');
        }
        return this.touch;
    }

    destroy(): void {
        this.detach();
        this.events.destroy();
    }

    private onFocus = (): void => {
        this.focused = true;
        this.events.fire('focus');
    };

    private onBlur = (): void => {
        this.focused = false;
        this.events.fire('blur');
    };
}
