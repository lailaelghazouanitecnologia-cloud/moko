import { JoypadState } from './joypad-state';

export class InputPoller {
    private joypad1: JoypadState;
    private joypad2: JoypadState;
    private joypad1Shift: number = 0;
    private joypad2Shift: number = 0;
    private strobe: boolean = false;

    static readonly JOYPAD1_ADDRESS: number = 0x4016;
    static readonly JOYPAD2_ADDRESS: number = 0x4017;

    constructor() {
        this.joypad1 = new JoypadState();
        this.joypad2 = new JoypadState();
    }

    reset(): void {
        this.joypad1.reset();
        this.joypad2.reset();
        this.joypad1Shift = 0;
        this.joypad2Shift = 0;
        this.strobe = false;
    }

    setJoypad1State(state: JoypadState): void {
        this.joypad1 = state.clone();
        if (this.strobe) {
            this.updateShiftRegisters();
        }
    }

    setJoypad2State(state: JoypadState): void {
        this.joypad2 = state.clone();
        if (this.strobe) {
            this.updateShiftRegisters();
        }
    }

    readJoypad1(): number {
        const bit = this.joypad1Shift & 0x01;
        this.joypad1Shift >>= 1;
        return bit;
    }

    readJoypad2(): number {
        const bit = this.joypad2Shift & 0x01;
        this.joypad2Shift >>= 1;
        return bit;
    }

    writeStrobe(value: number): void {
        const oldStrobe = this.strobe;
        this.strobe = (value & 0x01) === 0x01;
        
        if (!oldStrobe && this.strobe) {
            this.updateShiftRegisters();
        }
    }

    updateShiftRegisters(): void {
        this.joypad1Shift = this.joypad1.toByte();
        this.joypad2Shift = this.joypad2.toByte();
    }

    getJoypad1State(): JoypadState {
        return this.joypad1.clone();
    }

    getJoypad2State(): JoypadState {
        return this.joypad2.clone();
    }

    isStrobeEnabled(): boolean {
        return this.strobe;
    }
}
