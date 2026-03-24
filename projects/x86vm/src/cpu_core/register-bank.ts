private ax: number = 0;
    private bx: number = 0;
    private cx: number = 0;
    private dx: number = 0;
    private sp: number = 0;
    private bp: number = 0;
    private si: number = 0;
    private di: number = 0;
    private flags: FlagsRegister;

    constructor() {
        this.flags = new FlagsRegister();
    }

    getAX(): number {
        return this.ax;
    }

    setAX(value: number): void {
        this.ax = value & 0xFFFF;
    }

    getAH(): number {
        return (this.ax >> 8) & 0xFF;
    }

    setAH(value: number): void {
        this.ax = (this.ax & 0x00FF) | ((value & 0xFF) << 8);
    }

    getAL(): number {
        return this.ax & 0xFF;
    }

    setAL(value: number): void {
        this.ax = (this.ax & 0xFF00) | (value & 0xFF);
    }

    getBX(): number {
        return this.bx;
    }

    setBX(value: number): void {
        this.bx = value & 0xFFFF;
    }

    getCX(): number {
        return this.cx;
    }

    setCX(value: number): void {
        this.cx = value & 0xFFFF;
    }

    getDX(): number {
        return this.dx;
    }

    setDX(value: number): void {
        this.dx = value & 0xFFFF;
    }

    getSP(): number {
        return this.sp;
    }

    setSP(value: number): void {
        this.sp = value & 0xFFFF;
    }

    getBP(): number {
        return this.bp;
    }

    setBP(value: number): void {
        this.bp = value & 0xFFFF;
    }

    getSI(): number {
        return this.si;
    }

    setSI(value: number): void {
        this.si = value & 0xFFFF;
    }

    getDI(): number {
        return this.di;
    }

    setDI(value: number): void {
        this.di = value & 0xFFFF;
    }

    getRegisterValue(reg: Register): number {
        switch (reg) {
            case Register.AX: return this.ax;
            case Register.BX: return this.bx;
            case Register.CX: return this.cx;
            case Register.DX: return this.dx;
            case Register.SP: return this.sp;
            case Register.BP: return this.bp;
            case Register.SI: return this.si;
            case Register.DI: return this.di;
            default: return 0;
        }
    }

    setRegisterValue(reg: Register, value: number): void {
        const maskedValue = value & 0xFFFF;
        switch (reg) {
            case Register.AX: this.ax = maskedValue; break;
            case Register.BX: this.bx = maskedValue; break;
            case Register.CX: this.cx = maskedValue; break;
            case Register.DX: this.dx = maskedValue; break;
            case Register.SP: this.sp = maskedValue; break;
            case Register.BP: this.bp = maskedValue; break;
            case Register.SI: this.si = maskedValue; break;
            case Register.DI: this.di = maskedValue; break;
        }
    }

    push(value: number): void {
        this.sp = (this.sp - 2) & 0xFFFF;
    }

    pop(): number {
        const value = 0;
        this.sp = (this.sp + 2) & 0xFFFF;
        return value;
    }

    reset(): void {
        this.ax = 0;
        this.bx = 0;
        this.cx = 0;
        this.dx = 0;
        this.sp = 0;
        this.bp = 0;
        this.si = 0;
        this.di = 0;
        this.flags.reset();
    }
}
