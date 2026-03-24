export class Flags {
    c: boolean = false;
    z: boolean = false;
    i: boolean = false;
    d: boolean = false;
    b: boolean = false;
    u: boolean = false;
    v: boolean = false;
    n: boolean = false;

    toByte(): number {
        let result = 0;
        if (this.c) result |= Flags.C;
        if (this.z) result |= Flags.Z;
        if (this.i) result |= Flags.I;
        if (this.d) result |= Flags.D;
        if (this.b) result |= Flags.B;
        if (this.u) result |= Flags.U;
        if (this.v) result |= Flags.V;
        if (this.n) result |= Flags.N;
        return result;
    }

    fromByte(value: number): void {
        this.c = (value & Flags.C) !== 0;
        this.z = (value & Flags.Z) !== 0;
        this.i = (value & Flags.I) !== 0;
        this.d = (value & Flags.D) !== 0;
        this.b = (value & Flags.B) !== 0;
        this.u = (value & Flags.U) !== 0;
        this.v = (value & Flags.V) !== 0;
        this.n = (value & Flags.N) !== 0;
    }

    set(mask: number, on: boolean): void {
        if (on) {
            if (mask & Flags.C) this.c = true;
            if (mask & Flags.Z) this.z = true;
            if (mask & Flags.I) this.i = true;
            if (mask & Flags.D) this.d = true;
            if (mask & Flags.B) this.b = true;
            if (mask & Flags.U) this.u = true;
            if (mask & Flags.V) this.v = true;
            if (mask & Flags.N) this.n = true;
        } else {
            if (mask & Flags.C) this.c = false;
            if (mask & Flags.Z) this.z = false;
            if (mask & Flags.I) this.i = false;
            if (mask & Flags.D) this.d = false;
            if (mask & Flags.B) this.b = false;
            if (mask & Flags.U) this.u = false;
            if (mask & Flags.V) this.v = false;
            if (mask & Flags.N) this.n = false;
        }
    }

    static readonly C = 0x01;
    static readonly Z = 0x02;
    static readonly I = 0x04;
    static readonly D = 0x08;
    static readonly B = 0x10;
    static readonly U = 0x20;
    static readonly V = 0x40;
    static readonly N = 0x80;
}
