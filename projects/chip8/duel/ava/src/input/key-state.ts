export class KeyState {
    pressed: boolean = false;
    pressTime: number = 0;
    releaseTime: number = 0;

    press(currentTime: number): void {
        this.pressed = true;
        this.pressTime = currentTime;
    }

    release(currentTime: number): void {
        this.pressed = false;
        this.releaseTime = currentTime;
    }

    isPressed(): boolean {
        return this.pressed;
    }

    getPressDuration(currentTime: number): number {
        if (!this.pressed) return 0;
        return currentTime - this.pressTime;
    }

    getReleaseDuration(currentTime: number): number {
        if (this.pressed) return 0;
        return currentTime - this.releaseTime;
    }

    wasPressed(duration: number): boolean {
        if (!this.pressed) return false;
        const now = performance.now();
        return (now - this.pressTime) <= duration;
    }

    clone(): KeyState {
        const state = new KeyState();
        state.pressed = this.pressed;
        state.pressTime = this.pressTime;
        state.releaseTime = this.releaseTime;
        return state;
    }

    reset(): void {
        this.pressed = false;
        this.pressTime = 0;
        this.releaseTime = 0;
    }

    update(deltaTime: number): void {
        // Update timing info if needed for future features
        // Currently handled by external time tracking
    }

    toString(): string {
        return `KeyState{pressed:${this.pressed},pressTime:${this.pressTime},releaseTime:${this.releaseTime}}`;
    }
}
