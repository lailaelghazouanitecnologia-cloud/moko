import { v4 as uuid } from 'uuid';

export class MemoryIndex {
    id: string;
    type: string;
    entries: Map<string, any>;
    vectors: Array<number[]>;
    metadata: Record<string, any>;

    constructor() {
        this.id = uuid();
        this.type = 'default';
        this.entries = new Map();
        this.vectors = [];
        this.metadata = {};
    }

    add(key: string, value: any, vector?: number[]): void {
        this.entries.set(key, value);
        if (vector) {
            this.vectors.push(vector);
        }
    }

    get(key: string): any | null {
        return this.entries.get(key) ?? null;
    }

    update(key: string, value: any): boolean {
        if (!this.entries.has(key)) {
            return false;
        }
        this.entries.set(key, value);
        return true;
    }

    delete(key: string): boolean {
        return this.entries.delete(key);
    }

    search(query: number[], k: number = 5): Array<{ key: string; score: number }> {
        const results: Array<{ key: string; score: number }> = [];
        const queryNorm = Math.sqrt(query.reduce((sum, val) => sum + val * val, 0));
        if (queryNorm === 0) return [];

        for (const [key, value] of this.entries) {
            const vectorIndex = this.vectors.findIndex(v => v.length === query.length);
            if (vectorIndex === -1) continue;

            const vector = this.vectors[vectorIndex];
            const dot = query.reduce((sum, q, i) => sum + q * vector[i], 0);
            const vectorNorm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
            const score = dot / (queryNorm * vectorNorm || 1);
            results.push({ key, score });
        }

        return results.sort((a, b) => b.score - a.score).slice(0, k);
    }

    searchByKey(pattern: string): Array<string> {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Array.from(this.entries.keys()).filter(key => regex.test(key));
    }

    getAll(): Array<[string, any]> {
        return Array.from(this.entries.entries());
    }

    clear(): void {
        this.entries.clear();
        this.vectors = [];
    }

    size(): number {
        return this.entries.size;
    }

    async buildIndex(): Promise<void> {
        // No-op for now, can be extended for async indexing
        return Promise.resolve();
    }

    getSimilar(key: string, k: number = 5): Array<string> {
        const entry = this.entries.get(key);
        if (!entry) return [];

        const entryVectorIndex = this.vectors.findIndex((_, i) => 
            Array.from(this.entries.keys())[i] === key
        );
        if (entryVectorIndex === -1) return [];

        const entryVector = this.vectors[entryVectorIndex];
        const results = this.search(entryVector, k + 1);
        return results.filter(r => r.key !== key).slice(0, k).map(r => r.key);
    }

    export(): Record<string, any> {
        return {
            id: this.id,
            type: this.type,
            entries: Object.fromEntries(this.entries),
            vectors: this.vectors,
            metadata: this.metadata
        };
    }

    import(data: Record<string, any>): void {
        if (data.id) this.id = data.id;
        if (data.type) this.type = data.type;
        if (data.entries) this.entries = new Map(Object.entries(data.entries));
        if (data.vectors) this.vectors = data.vectors;
        if (data.metadata) this.metadata = data.metadata;
    }

    getStats(): { size: number; dimensions: number } {
        const dimensions = this.vectors.length > 0 ? this.vectors[0].length : 0;
        return {
            size: this.entries.size,
            dimensions
        };
    }
}
