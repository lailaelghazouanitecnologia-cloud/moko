private flags: FlagsRegister;

    constructor(flags: FlagsRegister) {
        this.flags = flags;
    }

    add(a: number, b: number): number {
        const result = (a + b) & 0xFFFF;
        const carry = (a + b) > 0xFFFF;
        const overflow = ((a ^ b) & 0x8000) === 0 && ((a ^ result) & 0x8000) !== 0;
        const parity = (result & 0xFF).toString(2).split('').filter(bit => bit === '1').length % 2 === 0;
        const zero = result === 0;
        const sign = (result & 0x8000) !== 0;
        const auxCarry = ((a & 0x0F) + (b & 0x0F)) > 0x0F;

        this.flags.setCF(carry);
        this.flags.setPF(parity);
        this.flags.setAF(auxCarry);
        this.flags.setZF(zero);
        this.flags.setSF(sign);
        this.flags.setOF(overflow);

        return result;
    }

    sub(a: number, b: number): number {
        const result = (a - b) & 0xFFFF;
        const borrow = (a - b) < 0;
        const overflow = ((a ^ b) & 0x8000) !== 0 && ((a ^ result) & 0x8000) !== 0;
        const parity = (result & 0xFF).toString(2).split('').filter(bit => bit === '1').length % 2 === 0;
        const zero = result === 0;
        const sign = (result & 0x8000) !== 0;
        const auxCarry = (a & 0x0F) < (b & 0x0F);

        this.flags.setCF(borrow);
        this.flags.setPF(parity);
        this.flags.setAF(auxCarry);
        this.flags.setZF(zero);
        this.flags.setSF(sign);
        this.flags.setOF(overflow);

        return result;
    }

    inc(value: number): number {
        const result = (value + 1) & 0xFFFF;
        const overflow = value === 0x7FFF;
        const parity = (result & 0xFF).toString(2).split('').filter(bit => bit === '1').length % 2 === 0;
        const zero = result === 0;
        const sign = (result & 0x8000) !== 0;
        const auxCarry = (value & 0x0F) === 0x0F;

        this.flags.setPF(parity);
        this.flags.setAF(auxCarry);
        this.flags.setZF(zero);
        this.flags.setSF(sign);
        this.flags.setOF(overflow);

        return result;
    }

    dec(value: number): number {
        const result = (value - 1) & 0xFFFF;
        const overflow = value === 0x8000;
        const parity = (result & 0xFF).toString(2).split('').filter(bit => bit === '1').length % 2 === 0;
        const zero = result === 0;
        const sign = (result & 0x8000) !== 0;
        const auxCarry = (value & 0x0F) === 0x00;

        this.flags.setPF(parity);
        this.flags.setAF(auxCarry);
        this.flags.setZF(zero);
        this.flags.setSF(sign);
        this.flags.setOF(overflow);

        return result;
    }

    and(a: number, b: number): number {
        const result = a & b;
        const parity = (result & 0xFF).toString(2).split('').filter(bit => bit === '1').length % 2 === 0;
        const zero = result === 0;
        const sign = (result & 0x8000) !== 0;

        this.flags.setCF(false);
        this.flags.setPF(parity);
        this.flags.setZF(zero);
        this.flags.setSF(sign);
        this.flags.setOF(false);

        return result;
    }

    or(a: number, b: number): number {
        const result = a | b;
        const parity = (result & 0xFF).toString(2).split('').filter(bit => bit === '1').length % 2 === 0;
        const zero = result === 0;
        const sign = (result & 0x8000) !== 0;

        this.flags.setCF(false);
        this.flags.setPF(parity);
        this.flags.setZF(zero);
        this.flags.setSF(sign);
        this.flags.setOF(false);

        return result;
    }

    xor(a: number, b: number): number {
        const result = a ^ b;
        const parity = (result & 0xFF).toString(2).split('').filter(bit => bit === '1').length % 2 === 0;
        const zero = result === 0;
        const sign = (result & 0x8000) !== 0;

        this.flags.setCF(false);
        this.flags.setPF(parity);
        this.flags.setZF(zero);
        this.flags.setSF(sign);
        this.flags.setOF(false);

        return result;
    }

    not(value: number): number {
        return (~value) & 0xFFFF;
    }

    shl(value: number, count: number): number {
        const shiftCount = count & 0x1F;
        const result = (value << shiftCount) & 0xFFFF;
        const carry = (value & (0x8000 >> (shiftCount - 1))) !== 0;
        const parity = (result & 0xFF).toString(2).split('').filter(bit => bit === '1').length % 2 === 0;
        const zero = result === 0;
        const sign = (result & 0x8000) !== 0;

        this.flags.setCF(carry);
        this.flags.setPF(parity);
        this.flags.setZF(zero);
        this.flags.setSF(sign);
        this.flags.setOF(false);

        return result;
    }

    shr(value: number, count: number): number {
        const shiftCount = count & 0x1F;
        const result = value >> shiftCount;
        const carry = (value & (1 << (shiftCount - 1))) !== 0;
        const parity = (result & 0xFF).toString(2).split('').filter(bit => bit === '1').length % 2 === 0;
        const zero = result === 0;
        const sign = (result & 0x8000) !== 0;

        this.flags.setCF(carry);
        this.flags.setPF(parity);
        this.flags.setZF(zero);
        this.flags.setSF(sign);
        this.flags.setOF(false);

        return result;
    }

    cmp(a: number, b: number): void {
        this.sub(a, b);
    }

    test(a: number, b: number): void {
        this.and(a, b);
    }
}
