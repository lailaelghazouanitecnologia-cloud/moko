import { KeyboardEvent } from './InputManager';

export class Keyboard {
    private keys: Map<string, boolean> = new Map();
    private prevKeys: Map<string, boolean> = new Map();

    static readonly KEY_SPACE: string = " ";
    static readonly KEY_ENTER: string = "Enter";

    isDown(key: string): boolean {
        return this.keys.get(key) || false;
    }

    isPressed(key: string): boolean {
        return (this.keys.get(key) || false) && !(this.prevKeys.get(key) || false);
    }

    isReleased(key: string): boolean {
        return !(this.keys.get(key) || false) && (this.prevKeys.get(key) || false);
    }

    update(): void {
        this.prevKeys.clear();
        for (const [k, v] of this.keys) {
            this.prevKeys.set(k, v);
        }
    }

    reset(): void {
        this.keys.clear();
        this.prevKeys.clear();
    }

    onKeyDown(e: KeyboardEvent): void {
        this.keys.set(e.key, true);
    }

    onKeyUp(e: KeyboardEvent): void {
        this.keys.set(e.key, false);
    }

    anyPressed(): boolean {
        for (const v of this.keys.values()) {
            if (v) return true;
        }
        return false;
    }

    combo(keys: string[]): boolean {
        for (const k of keys) {
            if (!this.isDown(k)) return false;
        }
        return true;
    }
}
