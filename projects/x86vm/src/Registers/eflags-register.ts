export class EFlagsRegister {
    private flags: number;

    constructor() {
        this.flags = 2;
    }

    getCF(): boolean {
        return (this.flags & 0x0001) !== 0;
    }

    setCF(value: boolean): void {
        if (value) {
            this.flags |= 0x0001;
        } else {
            this.flags &= ~0x0001;
        }
    }

    getPF(): boolean {
        return (this.flags & 0x0004) !== 0;
    }

    setPF(value: boolean): void {
        if (value) {
            this.flags |= 0x0004;
        } else {
            this.flags &= ~0x0004;
        }
    }

    getAF(): boolean {
        return (this.flags & 0x0010) !== 0;
    }

    setAF(value: boolean): void {
        if (value) {
            this.flags |= 0x0010;
        } else {
            this.flags &= ~0x0010;
        }
    }

    getZF(): boolean {
        return (this.flags & 0x0040) !== 0;
    }

    setZF(value: boolean): void {
        if (value) {
            this.flags |= 0x0040;
        } else {
            this.flags &= ~0x0040;
        }
    }

    getSF(): boolean {
        return (this.flags & 0x0080) !== 0;
    }

    setSF(value: boolean): void {
        if (value) {
            this.flags |= 0x0080;
        } else {
            this.flags &= ~0x0080;
        }
    }

    getTF(): boolean {
        return (this.flags & 0x0100) !== 0;
    }

    setTF(value: boolean): void {
        if (value) {
            this.flags |= 0x0100;
        } else {
            this.flags &= ~0x0100;
        }
    }

    getIF(): boolean {
        return (this.flags & 0x0200) !== 0;
    }

    setIF(value: boolean): void {
        if (value) {
            this.flags |= 0x0200;
        } else {
            this.flags &= ~0x0200;
        }
    }

    getDF(): boolean {
        return (this.flags & 0x0400) !== 0;
    }

    setDF(value: boolean): void {
        if (value) {
            this.flags |= 0x0400;
        } else {
            this.flags &= ~0x0400;
        }
    }

    getOF(): boolean {
        return (this.flags & 0x0800) !== 0;
    }

    setOF(value: boolean): void {
        if (value) {
            this.flags |= 0x0800;
        } else {
            this.flags &= ~0x0800;
        }
    }

    getIOPL(): number {
        return (this.flags >>> 12) & 0x03;
    }

    setIOPL(value: number): void {
        this.flags = (this.flags & ~0x3000) | ((value & 0x03) << 12);
    }

    getNT(): boolean {
        return (this.flags & 0x4000) !== 0;
    }

    setNT(value: boolean): void {
        if (value) {
            this.flags |= 0x4000;
        } else {
            this.flags &= ~0x4000;
        }
    }

    getRF(): boolean {
        return (this.flags & 0x00010000) !== 0;
    }

    setRF(value: boolean): void {
        if (value) {
            this.flags |= 0x00010000;
        } else {
            this.flags &= ~0x00010000;
        }
    }

    getVM(): boolean {
        return (this.flags & 0x00020000) !== 0;
    }

    setVM(value: boolean): void {
        if (value) {
            this.flags |= 0x00020000;
        } else {
            this.flags &= ~0x00020000;
        }
    }

    getAC(): boolean {
        return (this.flags & 0x00040000) !== 0;
    }

    setAC(value: boolean): void {
        if (value) {
            this.flags |= 0x00040000;
        } else {
            this.flags &= ~0x00040000;
        }
    }

    getVIF(): boolean {
        return (this.flags & 0x00080000) !== 0;
    }

    setVIF(value: boolean): void {
        if (value) {
            this.flags |= 0x00080000;
        } else {
            this.flags &= ~0x00080000;
        }
    }

    getVIP(): boolean {
        return (this.flags & 0x00100000) !== 0;
    }

    setVIP(value: boolean): void {
        if (value) {
            this.flags |= 0x00100000;
        } else {
            this.flags &= ~0x00100000;
        }
    }

    getID(): boolean {
        return (this.flags & 0x00200000) !== 0;
    }

    setID(value: boolean): void {
        if (value) {
            this.flags |= 0x00200000;
        } else {
            this.flags &= ~0x00200000;
        }
    }

    getValue(): number {
        return this.flags;
    }

    setValue(value: number): void {
        this.flags = value;
    }
}
