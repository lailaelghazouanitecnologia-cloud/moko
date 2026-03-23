import { Element } from './element';
import { Color } from '../math';

export class Button extends Element {
    private text: string = '';
    private active: boolean = true;
    private pressed: boolean = false;
    private hovered: boolean = false;
    private transitionMode: string = 'color';
    private normalColor: Color = new Color(1, 1, 1, 1);
    private hoverColor: Color = new Color(0.8, 0.8, 0.8, 1);
    private pressedColor: Color = new Color(0.6, 0.6, 0.6, 1);
    private disabledColor: Color = new Color(0.5, 0.5, 0.5, 0.5);
    private onClick: Function | null = null;

    setText(text: string): void {
        this.text = text;
    }

    setActive(active: boolean): void {
        this.active = active;
        this.updateVisualState();
    }

    setTransitionMode(mode: string): void {
        this.transitionMode = mode;
    }

    setNormalColor(color: Color): void {
        this.normalColor = color;
        this.updateVisualState();
    }

    setHoverColor(color: Color): void {
        this.hoverColor = color;
        this.updateVisualState();
    }

    setPressedColor(color: Color): void {
        this.pressedColor = color;
        this.updateVisualState();
    }

    setDisabledColor(color: Color): void {
        this.disabledColor = color;
        this.updateVisualState();
    }

    onMouseEnter(): void {
        if (!this.active) return;
        this.hovered = true;
        this.updateVisualState();
    }

    onMouseLeave(): void {
        if (!this.active) return;
        this.hovered = false;
        this.pressed = false;
        this.updateVisualState();
    }

    onMouseDown(): void {
        if (!this.active) return;
        this.pressed = true;
        this.updateVisualState();
    }

    onMouseUp(): void {
        if (!this.active) return;
        if (this.pressed && this.hovered && this.onClick) {
            this.onClick();
        }
        this.pressed = false;
        this.updateVisualState();
    }

    updateVisualState(): void {
        if (!this.active) {
            this.applyColor(this.disabledColor);
            return;
        }

        if (this.pressed) {
            this.applyColor(this.pressedColor);
        } else if (this.hovered) {
            this.applyColor(this.hoverColor);
        } else {
            this.applyColor(this.normalColor);
        }
    }

    private applyColor(color: Color): void {
        if (this.transitionMode === 'color') {
            const element = this as any;
            if (element.color) {
                element.color = color;
            }
        }
    }
}
