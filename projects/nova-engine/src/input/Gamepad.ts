import { GamepadData } from './GamepadData';

export class Gamepad {
    private gamepads: Map<number, GamepadData> = new Map();
    private enabled: boolean = true;

    static readonly BUTTON_A: number = 0;
    static readonly BUTTON_B: number = 1;
    static readonly BUTTON_X: number = 2;
    static readonly BUTTON_Y: number = 3;
    static readonly AXIS_LEFT_X: number = 0;
    static readonly AXIS_LEFT_Y: number = 1;

    update(): void {
        if (!this.enabled) return;

        const rawGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        
        for (let i = 0; i < rawGamepads.length; i++) {
            const raw = rawGamepads[i];
            if (raw) {
                const data = new GamepadData();
                data.connected = true;
                data.id = raw.id;
                data.index = raw.index;
                data.mapping = raw.mapping;
                data.buttons = raw.buttons.map(b => b.value);
                data.axes = raw.axes.slice();
                
                this.gamepads.set(i, data);
            } else {
                this.gamepads.delete(i);
            }
        }
    }

    getGamepad(index: number): GamepadData | undefined {
        return this.gamepads.get(index);
    }

    getAllGamepads(): GamepadData[] {
        return Array.from(this.gamepads.values());
    }

    isConnected(index: number): boolean {
        return this.gamepads.has(index);
    }

    getButton(index: number, button: number): number {
        const gamepad = this.gamepads.get(index);
        if (!gamepad || !gamepad.buttons[button]) return 0;
        return gamepad.buttons[button];
    }

    isButtonPressed(index: number, button: number): boolean {
        const gamepad = this.gamepads.get(index);
        if (!gamepad || !gamepad.buttons[button]) return false;
        return gamepad.buttons[button] > 0.5;
    }

    getAxis(index: number, axis: number): number {
        const gamepad = this.gamepads.get(index);
        if (!gamepad || !gamepad.axes[axis]) return 0;
        return gamepad.axes[axis];
    }

    getStick(index: number, stick: number): {x: number, y: number} {
        const gamepad = this.gamepads.get(index);
        if (!gamepad) return {x: 0, y: 0};
        
        const baseAxis = stick * 2;
        return {
            x: gamepad.axes[baseAxis] || 0,
            y: gamepad.axes[baseAxis + 1] || 0
        };
    }

    vibrate(index: number, duration: number, weak: number, strong: number): void {
        const gamepad = this.gamepads.get(index);
        if (!gamepad) return;

        const rawGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const raw = rawGamepads[index];
        
        if (raw && raw.vibrationActuator) {
            raw.vibrationActuator.playEffect('dual-rumble', {
                duration: duration,
                strongMagnitude: strong,
                weakMagnitude: weak
            });
        }
    }

    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
    }
}
