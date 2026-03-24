import { Button } from './button';

export class InputState {
    private buttons: number = 0;

    isPressed(button: Button): boolean {
        return (this.buttons & (1 << button)) !== 0;
    }

    setPressed(button: Button, pressed: boolean): void {
        if (pressed) {
            this.buttons |= (1 << button);
        } else {
            this.buttons &= ~(1 << button);
        }
    }

    clear(): void {
        this.buttons = 0;
    }

    copy(): InputState {
        const copy = new InputState();
        copy.buttons = this.buttons;
        return copy;
    }
}
