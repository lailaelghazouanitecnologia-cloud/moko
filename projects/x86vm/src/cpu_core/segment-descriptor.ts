private base: number;
    private limit: number;
    private type: number;
    private dpl: number;
    private present: boolean;

    constructor() {
        this.base = 0;
        this.limit = 0;
        this.type = 0;
        this.dpl = 0;
        this.present = false;
    }

    getBase(): number {
        return this.base;
    }

    setBase(value: number): void {
        this.base = value;
    }

    getLimit(): number {
        return this.limit;
    }

    setLimit(value: number): void {
        this.limit = value;
    }

    getType(): number {
        return this.type;
    }

    setType(value: number): void {
        this.type = value;
    }

    getDPL(): number {
        return this.dpl;
    }

    setDPL(value: number): void {
        this.dpl = value;
    }

    isPresent(): boolean {
        return this.present;
    }

    setPresent(value: boolean): void {
        this.present = value;
    }

    validate(): boolean {
        return this.present && this.limit > 0;
    }

    expandDown(): boolean {
        return (this.type & 0x04) !== 0;
    }
}
