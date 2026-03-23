class Tags {
    private _list: Set<string>;

    constructor() {
        this._list = new Set<string>();
    }

    add(...tags: string[]): void {
        for (const tag of tags) {
            this._list.add(tag.toLowerCase());
        }
    }

    remove(...tags: string[]): void {
        for (const tag of tags) {
            this._list.delete(tag.toLowerCase());
        }
    }

    has(tag: string): boolean {
        return this._list.has(tag.toLowerCase());
    }

    hasAll(tags: string[]): boolean {
        for (const tag of tags) {
            if (!this.has(tag)) {
                return false;
            }
        }
        return true;
    }

    hasAny(tags: string[]): boolean {
        for (const tag of tags) {
            if (this.has(tag)) {
                return true;
            }
        }
        return false;
    }

    clear(): void {
        this._list.clear();
    }

    list(): string[] {
        return Array.from(this._list).sort();
    }

    toString(): string {
        return this.list().join(',');
    }

    fromString(str: string, sep: string = ','): void {
        this.clear();
        const parts = str.split(sep).map(s => s.trim()).filter(s => s.length > 0);
        this.add(...parts);
    }

    size(): number {
        return this._list.size;
    }

    static union(a: Tags, b: Tags): string[] {
        const combined = new Set<string>();
        a._list.forEach(tag => combined.add(tag));
        b._list.forEach(tag => combined.add(tag));
        return Array.from(combined).sort();
    }

    static intersect(a: Tags, b: Tags): string[] {
        const result: string[] = [];
        a._list.forEach(tag => {
            if (b._list.has(tag)) {
                result.push(tag);
            }
        });
        return result.sort();
    }
}
