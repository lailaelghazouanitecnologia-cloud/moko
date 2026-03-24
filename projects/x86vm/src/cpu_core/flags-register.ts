private carryFlag: boolean = false;
    private parityFlag: boolean = false;
    private auxiliaryFlag: boolean = false;
    private zeroFlag: boolean = false;
    private signFlag: boolean = false;
    private trapFlag: boolean = false;
    private interruptFlag: boolean = false;
    private directionFlag: boolean = false;
    private overflowFlag: boolean = false;

    getCF(): boolean {
        return this.carryFlag;
    }

    setCF(value: boolean): void {
        this.carryFlag = value;
    }

    getPF(): boolean {
        return this.parityFlag;
    }

    setPF(value: boolean): void {
        this.parityFlag = value;
    }

    getAF(): boolean {
        return this.auxiliaryFlag;
    }

    setAF(value: boolean): void {
        this.auxiliaryFlag = value;
    }

    getZF(): boolean {
        return this.zeroFlag;
    }

    setZF(value: boolean): void {
        this.zeroFlag = value;
    }

    getSF(): boolean {
        return this.signFlag;
    }

    setSF(value: boolean): void {
        this.signFlag = value;
    }

    getTF(): boolean {
        return this.trapFlag;
    }

    setTF(value: boolean): void {
        this.trapFlag = value;
    }

    getIF(): boolean {
        return this.interruptFlag;
    }

    setIF(value: boolean): void {
        this.interruptFlag = value;
    }

    getDF(): boolean {
        return this.directionFlag;
    }

    setDF(value: boolean): void {
        this.directionFlag = value;
    }

    getOF(): boolean {
        return this.overflowFlag;
    }

    setOF(value: boolean): void {
        this.overflowFlag = value;
    }

    getFlagsWord(): number {
        let flags = 0;
        if (this.carryFlag) flags |= 0x0001;
        if (this.parityFlag) flags |= 0x0004;
        if (this.auxiliaryFlag) flags |= 0x0010;
        if (this.zeroFlag) flags |= 0x0040;
        if (this.signFlag) flags |= 0x0080;
        if (this.trapFlag) flags |= 0x0100;
        if (this.interruptFlag) flags |= 0x0200;
        if (this.directionFlag) flags |= 0x0400;
        if (this.overflowFlag) flags |= 0x0800;
        return flags;
    }

    setFlagsWord(value: number): void {
        this.carryFlag = (value & 0x0001) !== 0;
        this.parityFlag = (value & 0x0004) !== 0;
        this.auxiliaryFlag = (value & 0x0010) !== 0;
        this.zeroFlag = (value & 0x0040) !== 0;
        this.signFlag = (value & 0x0080) !== 0;
        this.trapFlag = (value & 0x0100) !== 0;
        this.interruptFlag = (value & 0x0200) !== 0;
        this.directionFlag = (value & 0x0400) !== 0;
        this.overflowFlag = (value & 0x0800) !== 0;
    }

    updateArithmeticFlags(result: number, operandSize: number): void {
        const mask = operandSize === 8 ? 0xFF : operandSize === 16 ? 0xFFFF : 0xFFFFFFFF;
        const maskedResult = result & mask;
        
        this.zeroFlag = maskedResult === 0;
        this.signFlag = (maskedResult >> (operandSize - 1)) & 1 ? true : false;
        
        let parityCount = 0;
        let temp = maskedResult & 0xFF;
        while (temp) {
            parityCount += temp & 1;
            temp >>= 1;
        }
        this.parityFlag = (parityCount & 1) === 0;
    }

    updateOverflowFlag(a: number, b: number, result: number, operation: string): void {
        const signA = (a >> 15) & 1;
        const signB = (b >> 15) & 1;
        const signR = (result >> 15) & 1;
        
        switch (operation) {
            case 'add':
                this.overflowFlag = (signA === signB) && (signR !== signA);
                break;
            case 'sub':
                this.overflowFlag = (signA !== signB) && (signR !== signA);
                break;
            default:
                this.overflowFlag = false;
        }
    }

    reset(): void {
        this.carryFlag = false;
        this.parityFlag = false;
        this.auxiliaryFlag = false;
        this.zeroFlag = false;
        this.signFlag = false;
        this.trapFlag = false;
        this.interruptFlag = false;
        this.directionFlag = false;
        this.overflowFlag = false;
    }
}
