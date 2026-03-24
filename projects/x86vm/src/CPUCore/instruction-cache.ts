import { CacheLine } from './cache-line';

export class InstructionCache {
    private cacheLines: CacheLine[];
    private size: number;
    private associativity: number;
    private lineSize: number;
    private hitRate: number;
    private hits: number;
    private misses: number;
    private lruCounter: number;

    constructor(size: number = 32768, associativity: number = 4, lineSize: number = 64) {
        this.size = size;
        this.associativity = associativity;
        this.lineSize = lineSize;
        this.hitRate = 0;
        this.hits = 0;
        this.misses = 0;
        this.lruCounter = 0;
        
        const numSets = size / (associativity * lineSize);
        this.cacheLines = new Array(numSets * associativity);
        
        for (let i = 0; i < this.cacheLines.length; i++) {
            this.cacheLines[i] = new CacheLine(lineSize);
        }
    }

    fetch(address: number): CacheLine {
        const index = this.getIndex(address);
        const tag = this.getTag(address);
        const setStart = index * this.associativity;
        const setEnd = setStart + this.associativity;

        for (let i = setStart; i < setEnd; i++) {
            const line = this.cacheLines[i];
            if (line.valid && line.tag === tag) {
                this.hits++;
                this.updateLRU(line);
                this.updateHitRate();
                return line;
            }
        }

        this.misses++;
        this.updateHitRate();
        
        const newLine = this.allocateLine(address);
        newLine.tag = tag;
        newLine.valid = true;
        newLine.dirty = false;
        newLine.lastUsed = ++this.lruCounter;
        
        return newLine;
    }

    read(address: number): number {
        const line = this.getCacheLine(address);
        if (!line) {
            const fetchedLine = this.fetch(address);
            const offset = address & (this.lineSize - 1);
            return fetchedLine.data[offset];
        }
        
        const offset = address & (this.lineSize - 1);
        return line.data[offset];
    }

    prefetch(address: number): void {
        const index = this.getIndex(address);
        const tag = this.getTag(address);
        const setStart = index * this.associativity;
        const setEnd = setStart + this.associativity;

        for (let i = setStart; i < setEnd; i++) {
            const line = this.cacheLines[i];
            if (line.valid && line.tag === tag) {
                return;
            }
        }

        const newLine = this.allocateLine(address);
        newLine.tag = tag;
        newLine.valid = true;
        newLine.dirty = false;
        newLine.lastUsed = ++this.lruCounter;
    }

    invalidate(address: number): void {
        const index = this.getIndex(address);
        const tag = this.getTag(address);
        const setStart = index * this.associativity;
        const setEnd = setStart + this.associativity;

        for (let i = setStart; i < setEnd; i++) {
            const line = this.cacheLines[i];
            if (line.valid && line.tag === tag) {
                if (line.dirty) {
                    this.writeBack(line);
                }
                line.valid = false;
                return;
            }
        }
    }

    flush(): void {
        for (const line of this.cacheLines) {
            if (line.valid && line.dirty) {
                this.writeBack(line);
            }
            line.valid = false;
            line.dirty = false;
        }
        this.hits = 0;
        this.misses = 0;
        this.hitRate = 0;
    }

    getHitRate(): number {
        return this.hitRate;
    }

    getCacheLine(address: number): CacheLine | null {
        const index = this.getIndex(address);
        const tag = this.getTag(address);
        const setStart = index * this.associativity;
        const setEnd = setStart + this.associativity;

        for (let i = setStart; i < setEnd; i++) {
            const line = this.cacheLines[i];
            if (line.valid && line.tag === tag) {
                return line;
            }
        }
        return null;
    }

    allocateLine(address: number): CacheLine {
        const index = this.getIndex(address);
        const setStart = index * this.associativity;
        const setEnd = setStart + this.associativity;

        for (let i = setStart; i < setEnd; i++) {
            const line = this.cacheLines[i];
            if (!line.valid) {
                return line;
            }
        }

        return this.evictLine();
    }

    evictLine(): CacheLine {
        let lruIndex = 0;
        let lruValue = Infinity;

        for (let i = 0; i < this.cacheLines.length; i++) {
            const line = this.cacheLines[i];
            if (line.valid && line.lastUsed < lruValue) {
                lruValue = line.lastUsed;
                lruIndex = i;
            }
        }

        const evictedLine = this.cacheLines[lruIndex];
        if (evictedLine.dirty) {
            this.writeBack(evictedLine);
        }

        return evictedLine;
    }

    updateLRU(line: CacheLine): void {
        line.lastUsed = ++this.lruCounter;
    }

    isHit(address: number): boolean {
        const index = this.getIndex(address);
        const tag = this.getTag(address);
        const setStart = index * this.associativity;
        const setEnd = setStart + this.associativity;

        for (let i = setStart; i < setEnd; i++) {
            const line = this.cacheLines[i];
            if (line.valid && line.tag === tag) {
                return true;
            }
        }
        return false;
    }

    getTag(address: number): number {
        const offsetBits = Math.log2(this.lineSize);
        const indexBits = Math.log2(this.size / (this.associativity * this.lineSize));
        return address >>> (offsetBits + indexBits);
    }

    getIndex(address: number): number {
        const offsetBits = Math.log2(this.lineSize);
        const numSets = this.size / (this.associativity * this.lineSize);
        return (address >>> offsetBits) & (numSets - 1);
    }

    writeBack(line: CacheLine): void {
        line.dirty = false;
    }

    setAssociativity(ways: number): void {
        if (ways !== this.associativity) {
            this.flush();
            this.associativity = ways;
            const numSets = this.size / (ways * this.lineSize);
            this.cacheLines = new Array(numSets * ways);
            
            for (let i = 0; i < this.cacheLines.length; i++) {
                this.cacheLines[i] = new CacheLine(this.lineSize);
            }
        }
    }

    private updateHitRate(): void {
        const total = this.hits + this.misses;
        if (total > 0) {
            this.hitRate = this.hits / total;
        }
    }
}
