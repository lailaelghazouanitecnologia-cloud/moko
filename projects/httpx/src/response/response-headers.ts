export class ResponseHeaders {
    private readonly headers: Map<string, string[]>;

    constructor(headers: Map<string, string[]> = new Map()) {
        this.headers = new Map(headers);
    }

    set(name: string, value: string | string[]): ResponseHeaders {
        const normalizedName = this.normalize(name);
        const newHeaders = new Map(this.headers);
        const values = Array.isArray(value) ? [...value] : [value];
        newHeaders.set(normalizedName, values);
        return new ResponseHeaders(newHeaders);
    }

    append(name: string, value: string): ResponseHeaders {
        const normalizedName = this.normalize(name);
        const newHeaders = new Map(this.headers);
        const existing = newHeaders.get(normalizedName) || [];
        newHeaders.set(normalizedName, [...existing, value]);
        return new ResponseHeaders(newHeaders);
    }

    get(name: string): string | undefined {
        const normalizedName = this.normalize(name);
        const values = this.headers.get(normalizedName);
        return values && values.length > 0 ? values[0] : undefined;
    }

    getAll(name: string): string[] {
        const normalizedName = this.normalize(name);
        const values = this.headers.get(normalizedName);
        return values ? [...values] : [];
    }

    has(name: string): boolean {
        const normalizedName = this.normalize(name);
        return this.headers.has(normalizedName);
    }

    delete(name: string): ResponseHeaders {
        const normalizedName = this.normalize(name);
        const newHeaders = new Map(this.headers);
        newHeaders.delete(normalizedName);
        return new ResponseHeaders(newHeaders);
    }

    keys(): IterableIterator<string> {
        return this.headers.keys();
    }

    values(): IterableIterator<string> {
        const self = this;
        return (function* () {
            for (const values of self.headers.values()) {
                for (const value of values) {
                    yield value;
                }
            }
        })();
    }

    entries(): IterableIterator<[string, string]> {
        const self = this;
        return (function* () {
            for (const [name, values] of self.headers.entries()) {
                for (const value of values) {
                    yield [name, value];
                }
            }
        })();
    }

    forEach(callback: (value: string, name: string) => void): void {
        for (const [name, values] of this.headers.entries()) {
            for (const value of values) {
                callback(value, name);
            }
        }
    }

    toObject(): Record<string, string | string[]> {
        const obj: Record<string, string | string[]> = {};
        for (const [name, values] of this.headers.entries()) {
            obj[name] = values.length === 1 ? values[0] : [...values];
        }
        return obj;
    }

    toJSON(): Record<string, string> {
        const obj: Record<string, string> = {};
        for (const [name, values] of this.headers.entries()) {
            obj[name] = values.length === 1 ? values[0] : values.join(', ');
        }
        return obj;
    }

    normalize(name: string): string {
        return name.toLowerCase();
    }

    clone(): ResponseHeaders {
        return new ResponseHeaders(new Map(this.headers));
    }
}
