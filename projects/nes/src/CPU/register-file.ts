export class RegisterFile {
    private A: number;
    private X: number;
    private Y: number;
    private SP: number;
    private PC: number;
    private P: number;

    constructor() {
        this.A = 0;
        this.X = 0;
        this.Y = 0;
        this.SP = 0xFF;
        this.PC = 0;
        this.P = 0x20;
    }

    getA(): number {
        return this.A;
    }

    setA(value: number): void {
        this.A = value & 0xFF;
    }

    getX(): number {
        return this.X;
    }

    setX(value: number): void {
        this.X = value & 0xFF;
    }

    getY(): number {
        return this.Y;
    }

    setY(value: number): void {
        this.Y = value & 0xFF;
    }

    getSP(): number {
        return this.SP;
    }

    setSP(value: number): void {
        this.SP = value & 0xFF;
    }

    getPC(): number {
        return this.PC;
    }

    setPC(value: number): void {
        this.PC = value & 0xFFFF;
    }

    incrementPC(): void {
        this.PC = (this.PC + 1) & 0xFFFF;
    }

    addPC(offset: number): void {
        this.PC = (this.PC + offset) & 0xFFFF;
    }

    getP(): number {
        return this.P;
    }

    setP(value: number): void {
        this.P = value & 0xFF;
    }

    getFlag(bit: number): boolean {
        return (this.P & bit) !== 0;
    }

    setFlag(bit: number, value: boolean): void {
        if (value) {
            this.P |= bit;
        } else {
            this.P &= ~bit;
        }
    }

    getCarry(): boolean {
        return this.getFlag(0x01);
    }

    setCarry(value: boolean): void {
        this.setFlag(0x01, value);
    }

    getZero(): boolean {
        return this.getFlag(0x02);
    }

    setZero(value: boolean): void {
        this.setFlag(0x02, value);
    }

    getInterrupt(): boolean {
        return this.getFlag(0x04);
    }

    setInterrupt(value: boolean): void {
        this.setFlag(0x04, value);
    }

    getDecimal(): boolean {
        return this.getFlag(0x08);
    }

    setDecimal(value: boolean): void {
        this.setFlag(0x08, value);
    }

    getOverflow(): boolean {
        return this.getFlag(0x40);
    }

    setOverflow(value: boolean): void {
        this.setFlag(0x40, value);
    }

    getNegative(): boolean {
        return this.getFlag(0x80);
    }

    setNegative(value: boolean): void {
        this.setFlag(0x80, value);
    }

    clone(): RegisterFile {
        const copy = new RegisterFile();
        copy.A = this.A;
        copy.X = this.X;
        copy.Y = this.Y;
        copy.SP = this.SP;
        copy.PC = this.PC;
        copy.P = this.P;
        return copy;
    }
}
