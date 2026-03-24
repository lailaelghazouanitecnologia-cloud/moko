import { Flags } from './flags';

export class Registers {
    a: number;
    x: number;
    y: number;
    sp: number;
    pc: number;
    p: Flags;

    constructor() {
        this.a = 0;
        this.x = 0;
        this.y = 0;
        this.sp = 253;
        this.pc = 0;
        this.p = new Flags();
    }

    getStatus(): number {
        let status = 0;
        if (this.p.n) status |= 0x80;
        if (this.p.v) status |= 0x40;
        if (this.p.b) status |= 0x10;
        if (this.p.d) status |= 0x08;
        if (this.p.i) status |= 0x04;
        if (this.p.z) status |= 0x02;
        if (this.p.c) status |= 0x01;
        return status;
    }

    setStatus(value: number): void {
        this.p.n = (value & 0x80) !== 0;
        this.p.v = (value & 0x40) !== 0;
        this.p.b = (value & 0x10) !== 0;
        this.p.d = (value & 0x08) !== 0;
        this.p.i = (value & 0x04) !== 0;
        this.p.z = (value & 0x02) !== 0;
        this.p.c = (value & 0x01) !== 0;
    }

    clone(): Registers {
        const r = new Registers();
        r.a = this.a;
        r.x = this.x;
        r.y = this.y;
        r.sp = this.sp;
        r.pc = this.pc;
        r.p = this.p.clone();
        return r;
    }
}
