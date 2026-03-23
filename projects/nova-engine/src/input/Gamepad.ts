export class Gamepad {
    private pads: Gamepad[] = [];
    private prevButtons: boolean[][] = [];
    private deadzone: number = 0.15;

    static readonly A: number = 0;
    static readonly B: number = 1;
    static readonly X: number = 2;
    static readonly Y: number = 3;

    update(): void {
        const gamepads = navigator.getGamepads();
        this.pads = [];
        this.prevButtons = [];

        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (gp) {
                this.pads.push(gp);
                this.prevButtons.push([...gp.buttons.map(b => b.pressed)]);
            }
        }
    }

    getAxis(padIndex: number, axis: number): number {
        if (padIndex < 0 || padIndex >= this.pads.length) return 0;
        const gp = this.pads[padIndex];
        if (!gp || !gp.axes[axis]) return 0;
        const val = gp.axes[axis];
        return Math.abs(val) < this.deadzone ? 0 : val;
    }

    isButtonDown(padIndex: number, btn: number): boolean {
        if (padIndex < 0 || padIndex >= this.pads.length) return false;
        const gp = this.pads[padIndex];
        if (!gp || !gp.buttons[btn]) return false;
        return gp.buttons[btn].pressed;
    }

    isButtonPressed(padIndex: number, btn: number): boolean {
        if (padIndex < 0 || padIndex >= this.pads.length) return false;
        const gp = this.pads[padIndex];
        if (!gp || !gp.buttons[btn]) return false;
        const curr = gp.buttons[btn].pressed;
        const prev = this.prevButtons[padIndex] && this.prevButtons[padIndex][btn];
        return curr && !prev;
    }

    rumble(padIndex: number, left: number, right: number, duration: number): void {
        if (padIndex < 0 || padIndex >= this.pads.length) return;
        const gp = this.pads[padIndex] as any;
        if (gp && gp.vibrationActuator) {
            gp.vibrationActuator.playEffect('dual-rumble', {
                duration: duration,
                strongMagnitude: left,
                weakMagnitude: right
            });
        }
    }

    count(): number {
        return this.pads.length;
    }

    isConnected(padIndex: number): boolean {
        return padIndex >= 0 && padIndex < this.pads.length;
    }
}
