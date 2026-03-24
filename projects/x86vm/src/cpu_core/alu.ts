flags: FlagsRegister;

    constructor() {
        this.flags = new FlagsRegister();
    }

    add(a: number, b: number): number {
        const result = (a + b) & 0xFFFF;
        const carry = (a + b) > 0xFFFF;
        this.flags.setCF(carry);
        this.flags.updateArithmeticFlags(result, 16);
        this.flags.updateOverflowFlag(a, b, result, 'add');
        return result;
    }

    sub(a: number, b: number): number {
        const result = (a - b) & 0xFFFF;
        const borrow = a < b;
        this.flags.setCF(borrow);
        this.flags.updateArithmeticFlags(result, 16);
        this.flags.updateOverflowFlag(a, b, result, 'sub');
        return result;
    }

    mul(a: number, b: number): number {
        const result = (a * b) & 0xFFFF;
        const high = Math.floor((a * b) / 0x10000) & 0xFFFF;
        this.flags.setCF(high !== 0);
        this.flags.setOF(high !== 0);
        this.flags.updateArithmeticFlags(result, 16);
        return result;
    }

    imul(a: number, b: number): number {
        const signedA = (a & 0x8000) ? (a - 0x10000) : a;
        const signedB = (b & 0x8000) ? (b - 0x10000) : b;
        const result = (signedA * signedB) & 0xFFFF;
        const fullResult = signedA * signedB;
        const high = (fullResult >> 16) & 0xFFFF;
        this.flags.setCF(high !== 0 && high !== 0xFFFF);
        this.flags.setOF(high !== 0 && high !== 0xFFFF);
        this.flags.updateArithmeticFlags(result, 16);
        return result;
    }

    div(a: number, b: number): number {
        if (b === 0) {
            throw new Error('Division by zero');
        }
        const result = Math.floor(a / b) & 0xFFFF;
        this.flags.updateArithmeticFlags(result, 16);
        return result;
    }

    idiv(a: number, b: number): number {
        if (b === 0) {
            throw new Error('Division by zero');
        }
        const signedA = (a & 0x8000) ? (a - 0x10000) : a;
        const signedB = (b & 0x8000) ? (b - 0x10000) : b;
        const result = Math.floor(signedA / signedB) & 0xFFFF;
        this.flags.updateArithmeticFlags(result, 16);
        return result;
    }

    and(a: number, b: number): number {
        const result = a & b & 0xFFFF;
        this.flags.setCF(false);
        this.flags.setOF(false);
        this.flags.updateArithmeticFlags(result, 16);
        return result;
    }

    or(a: number, b: number): number {
        const result = (a | b) & 0xFFFF;
        this.flags.setCF(false);
        this.flags.setOF(false);
        this.flags.updateArithmeticFlags(result, 16);
        return result;
    }

    xor(a: number, b: number): number {
        const result = (a ^ b) & 0xFFFF;
        this.flags.setCF(false);
        this.flags.setOF(false);
        this.flags.updateArithmeticFlags(result, 16);
        return result;
    }

    not(a: number): number {
        return (~a) & 0xFFFF;
    }

    shl(a: number, b: number): number {
        const shift = b & 0x1F;
        const result = (a << shift) & 0xFFFF;
        if (shift > 0) {
            this.flags.setCF((a << (shift - 1)) & 0x10000 ? true : false);
        }
        this.flags.updateArithmeticFlags(result, 16);
        this.flags.setOF(this.flags.getSF() !== ((a >> 15) & 1 ? true : false));
        return result;
    }

    shr(a: number, b: number): number {
        const shift = b & 0x1F;
        const result = (a >>> shift) & 0xFFFF;
        if (shift > 0) {
            this.flags.setCF(((a >>> (shift - 1)) & 1) ? true : false);
        }
        this.flags.updateArithmeticFlags(result, 16);
        this.flags.setOF(false);
        return result;
    }

    sar(a: number, b: number): number {
        const shift = b & 0x1F;
        const signed = (a & 0x8000) !== 0;
        let result = a >>> shift;
        if (signed) {
            result |= (0xFFFF << (16 - shift)) & 0xFFFF;
        }
        result &= 0xFFFF;
        if (shift > 0) {
            this.flags.setCF(((a >> (shift - 1)) & 1) ? true : false);
        }
        this.flags.updateArithmeticFlags(result, 16);
        this.flags.setOF(false);
        return result;
    }

    rol(a: number, b: number): number {
        const shift = b & 0x1F;
        let result = a;
        for (let i = 0; i < shift; i++) {
            const msb = (result >> 15) & 1;
            result = ((result << 1) | msb) & 0xFFFF;
        }
        if (shift > 0) {
            this.flags.setCF(((result >> 15) & 1) ? true : false);
            this.flags.setOF(this.flags.getCF() !== ((result >> 14) & 1 ? true : false));
        }
        return result;
    }

    ror(a: number, b: number): number {
        const shift = b & 0x1F;
        let result = a;
        for (let i = 0; i < shift; i++) {
            const lsb = result & 1;
            result = ((result >> 1) | (lsb << 15)) & 0xFFFF;
        }
        if (shift > 0) {
            this.flags.setCF((result & 0x8000) !== 0);
            this.flags.setOF(((result >> 15) & 1) !== ((result >> 14) & 1));
        }
        return result;
    }

    inc(a: number): number {
        const result = (a + 1) & 0xFFFF;
        this.flags.updateArithmeticFlags(result, 16);
        this.flags.updateOverflowFlag(a, 1, result, 'add');
        return result;
    }

    dec(a: number): number {
        const result = (a - 1) & 0xFFFF;
        this.flags.updateArithmeticFlags(result, 16);
        this.flags.updateOverflowFlag(a, 1, result, 'sub');
        return result;
    }

    neg(a: number): number {
        const result = (-a) & 0xFFFF;
        this.flags.setCF(a !== 0);
        this.flags.updateArithmeticFlags(result, 16);
        this.flags.updateOverflowFlag(0, a, result, 'sub');
        return result;
    }

    cmp(a: number, b: number): void {
        const result = (a - b) & 0xFFFF;
        const borrow = a < b;
        this.flags.setCF(borrow);
        this.flags.updateArithmeticFlags(result, 16);
        this.flags.updateOverflowFlag(a, b, result, 'sub');
    }

    test(a: number, b: number): void {
        const result = (a & b) & 0xFFFF;
        this.flags.setCF(false);
        this.flags.setOF(false);
        this.flags.updateArithmeticFlags(result, 16);
    }
}
