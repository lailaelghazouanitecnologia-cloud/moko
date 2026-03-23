import { EventEmitter } from '../core';

export class MemoryQuery {
    static readonly DEFAULT_LIMIT = 10;
    static readonly DEFAULT_THRESHOLD = 0.7;

    private _text: string = '';
    private _vector: number[] = [];
    private _filters: Record<string, any> = {};
    private _indices: string[] = [];
    private _limit: number = MemoryQuery.DEFAULT_LIMIT;
    private _threshold: number = MemoryQuery.DEFAULT_THRESHOLD;

    constructor() {}

    setText(text: string): MemoryQuery {
        this._text = text;
        return this;
    }

    setVector(vector: number[]): MemoryQuery {
        this._vector = [...vector];
        return this;
    }

    addFilter(key: string, value: any): MemoryQuery {
        this._filters[key] = value;
        return this;
    }

    setIndices(indices: string[]): MemoryQuery {
        this._indices = [...indices];
        return this;
    }

    setLimit(limit: number): MemoryQuery {
        this._limit = limit;
        return this;
    }

    setThreshold(threshold: number): MemoryQuery {
        this._threshold = threshold;
        return this;
    }

    build(): Record<string, any> {
        return {
            text: this._text,
            vector: [...this._vector],
            filters: { ...this._filters },
            indices: [...this._indices],
            limit: this._limit,
            threshold: this._threshold
        };
    }

    static fromText(text: string): MemoryQuery {
        const query = new MemoryQuery();
        query._text = text;
        return query;
    }

    static fromVector(vector: number[]): MemoryQuery {
        const query = new MemoryQuery();
        query._vector = [...vector];
        return query;
    }

    combine(other: MemoryQuery): MemoryQuery {
        const result = new MemoryQuery();
        result._text = this._text || other._text;
        result._vector = this._vector.length > 0 ? [...this._vector] : [...other._vector];
        result._filters = { ...this._filters, ...other._filters };
        result._indices = this._indices.length > 0 ? [...this._indices] : [...other._indices];
        result._limit = Math.min(this._limit, other._limit);
        result._threshold = Math.max(this._threshold, other._threshold);
        return result;
    }

    validate(): boolean {
        return (this._text.length > 0 || this._vector.length > 0) &&
               this._limit > 0 &&
               this._threshold >= 0 && this._threshold <= 1;
    }

    toJSON(): string {
        return JSON.stringify({
            text: this._text,
            vector: this._vector,
            filters: this._filters,
            indices: this._indices,
            limit: this._limit,
            threshold: this._threshold
        });
    }

    static fromJSON(data: string): MemoryQuery {
        const parsed = JSON.parse(data);
        const query = new MemoryQuery();
        query._text = parsed.text || '';
        query._vector = parsed.vector || [];
        query._filters = parsed.filters || {};
        query._indices = parsed.indices || [];
        query._limit = parsed.limit || MemoryQuery.DEFAULT_LIMIT;
        query._threshold = parsed.threshold || MemoryQuery.DEFAULT_THRESHOLD;
        return query;
    }
}
