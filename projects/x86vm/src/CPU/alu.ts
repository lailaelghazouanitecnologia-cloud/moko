import { FlagsRegister } from './flags-register';

export class ALU {
    public flags: FlagsRegister;

    constructor(flags: FlagsRegister) {
        this.flags = flags;
    }

    add(a: number, b: number): number {
        const result = (a + b) >>> 0;
        const carry = result < (a >>> 0) || result < (b >>> 0);
        
        this.flags.setCF(carry);
        this.flags.updateParity(result);
        this.flags.updateSign(result, 32);
        this.flags.updateZero(result);
        this.flags.updateOverflow(a, b, result, 'add');
        
        return result;
    }

    sub(a: number, b: number): number {
        const result = (a - b) >>> 0;
        const borrow = (a >>> 0) < (b >>> 0);
        
        this.flags.setCF(borrow);
        this.flags.updateParity(result);
        this.flags.updateSign(result, 32);
        this.flags.updateZero(result);
        this.flags.updateOverflow(a, b, result, 'sub');
        
        return result;
    }

    mul(a: number, b: number): number {
        const result = (a * b) >>> 0;
        const high = ((a >>> 0) * (b >>> 0)) >>> 32;
        
        this.flags.setCF(high !== 0);
        this.flags.setOF(high !== 0);
        
        return result;
    }

    imul(a: number, b: number): number {
        const aSigned = (a << 0);
        const bSigned = (b << 0);
        const result = (aSigned * bSigned) >>> 0;
        
        const high = Math.floor((aSigned * bSigned) / 0x100000000);
        this.flags.setCF(high !== (result >> 31));
        this.flags.setOF(high !== (result >> 31));
        
        return result;
    }

    div(a: number, b: number): number {
        if (b === 0) {
            throw new Error('Division by zero');
        }
        
        const aUnsigned = a >>> 0;
        const bUnsigned = b >>> 0;
        const result = Math.floor(aUnsigned / bUnsigned) >>> 0;
        
        return result;
    }

    idiv(a: number, b: number): number {
        if (b === 0) {
            throw new Error('Division by zero');
        }
        
        const result = Math.floor(a / b);
        return result;
    }

    and(a: number, b: number): number {
        const result = (a & b) >>> 0;
        
        this.flags.setCF(false);
        this.flags.setOF(false);
        this.flags.updateParity(result);
        this.flags.updateSign(result, 32);
        this.flags.updateZero(result);
        
        return result;
    }

    or(a: number, b: number): number {
        const result = (a | b) >>> 0;
        
        this.flags.setCF(false);
        this.flags.setOF(false);
        this.flags.updateParity(result);
        this.flags.updateSign(result, 32);
        this.flags.updateZero(result);
        
        return result;
    }

    xor(a: number, b: number): number {
        const result = (a ^ b) >>> 0;
        
        this.flags.setCF(false);
        this.flags.setOF(false);
        this.flags.updateParity(result);
        this.flags.updateSign(result, 32);
        this.flags.updateZero(result);
        
        return result;
    }

    not(a: number): number {
        return (~a) >>> 0;
    }

    shl(a: number, count: number): number {
        const shiftCount = count & 31;
        const result = (a << shiftCount) >>> 0;
        
        if (shiftCount > 0) {
            const msb = (a >>> (32 - shiftCount)) & 1;
            this.flags.setCF(msb === 1);
            this.flags.updateOF(this.flags.getCF() ^ ((result >>> 31) & 1));
        }
        
        this.flags.updateParity(result);
        this.flags.updateSign(result, 32);
        this.updateZero(result);
        
        return result;
    }

    shr(a: number, count: number): number {
        const shiftCount = count & 31;
        const result = (a >>> 0) >>> shiftCount;
        
        if (shiftCount > 0) {
            const lsb = (a >>> (shiftCount - 1)) & 1;
            this.flags.setCF(lsb === 1);
            this.flags.setOF(false);
        }
        
        this.flags.updateParity(result);
        this.flags.updateSign(result, 32);
        this.flags.updateZero(result);
        
        return result;
    }

    sar(a: number, count: number): number {
        const shiftCount = count & 31;
        const result = a >> shiftCount;
        
        if (shiftCount > 0) {
            const lsb = (a >>> (shiftCount - 1)) & 1;
            this.flags.setCF(lsb === 1);
            this.flags.setOF(false);
        }
        
        this.flags.updateParity(result);
        this.flags.updateSign(result, 32);
        this.flags.updateZero(result);
        
        return result;
    }

    rol(a: number, count: number): number {
        const shiftCount = count & 31;
        let result = a;
        
        for (let i = 0; i < shiftCount; i++) {
            const msb = (result >>> 31) & 1;
            result = ((result << 1) | msb) >>> 0;
            this.flags.setCF(msb === 1);
        }
        
        if (shiftCount === 1) {
            this.flags.setOF(this.flags.getCF() ^ ((result >>> 31) & 1));
        }
        
        return result;
    }

    ror(a: number, count: number): number {
        const shiftCount = count & 31;
        let result = a;
        
        for (let i = 0; i < shiftCount; i++) {
            const lsb = result & 1;
            result = ((result >>> 1) | (lsb << 31)) >>> 0;
            this.flags.setCF(lsb === 1);
        }
        
        if (shiftCount === 1) {
            this.flags.setOF(((result >>> 31) & 1) ^ ((result >>> 30) & 1));
        }
        
        return result;
    }

    inc(a: number): number {
        const result = (a + 1) >>> 0;
        
        this.flags.updateParity(result);
        this.flags.updateSign(result, 32);
        this.flags.updateZero(result);
        this.flags.updateOverflow(a, 1, result, 'add');
        
        return result;
    }

    dec(a: number): number {
        const result = (a - 1) >>> 0;
        
        this.flags.updateParity(result);
        this.flags.updateSign(result, 32);
        this.flags.updateZero(result);
        this.flags.updateOverflow(a, 1, result, 'sub');
        
        return result;
    }

    neg(a: number): number {
        const result = (-a) >>> 0;
        
        this.flags.setCF(a !== 0);
        this.flags.updateParity(result);
        this.flags.updateSign(result, 32);
        this.flags.updateZero(result);
        this.flags.updateOverflow(a, a, result, 'sub');
        
        return result;
    }

    cmp(a: number, b: number): void {
        this.sub(a, b);
    }

    test(a: number, b: number): void {
        const result = (a & b) >>> 0;
        
        this.flags.setCF(false);
        this.flags.setOF(false);
        this.flags.updateParity(result);
        this.flags.updateSign(result, 32);
        this.flags.updateZero(result);
    }
}
