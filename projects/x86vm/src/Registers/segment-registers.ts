export class SegmentRegisters {
    private segments: Map<string, number> = new Map();

    constructor() {
        this.segments.set('CS', 0);
        this.segments.set('DS', 0);
        this.segments.set('ES', 0);
        this.segments.set('SS', 0);
        this.segments.set('FS', 0);
        this.segments.set('GS', 0);
    }

    getCS(): number {
        return this.segments.get('CS') || 0;
    }

    setCS(value: number): void {
        this.segments.set('CS', value & 0xFFFF);
    }

    getDS(): number {
        return this.segments.get('DS') || 0;
    }

    setDS(value: number): void {
        this.segments.set('DS', value & 0xFFFF);
    }

    getES(): number {
        return this.segments.get('ES') || 0;
    }

    setES(value: number): void {
        this.segments.set('ES', value & 0xFFFF);
    }

    getSS(): number {
        return this.segments.get('SS') || 0;
    }

    setSS(value: number): void {
        this.segments.set('SS', value & 0xFFFF);
    }

    getFS(): number {
        return this.segments.get('FS') || 0;
    }

    setFS(value: number): void {
        this.segments.set('FS', value & 0xFFFF);
    }

    getGS(): number {
        return this.segments.get('GS') || 0;
    }

    setGS(value: number): void {
        this.segments.set('GS', value & 0xFFFF);
    }

    getSegment(name: string): number {
        const segment = this.segments.get(name.toUpperCase());
        return segment !== undefined ? segment : 0;
    }

    setSegment(name: string, value: number): void {
        this.segments.set(name.toUpperCase(), value & 0xFFFF);
    }

    getEffectiveAddress(segment: string, offset: number): number {
        const segmentValue = this.getSegment(segment);
        return (segmentValue << 4) + (offset & 0xFFFF);
    }
}
