/**
 * Lightweight key-value tag manager
 */
export class Tags {
    private store: Map<string, string> = new Map();

    /**
     * Add or update a tag
     * @param key - The tag key
     * @param value - The tag value
     * @throws {TypeError} If key or value is not a string
     */
    set(key: string, value: string): void {
        if (typeof key !== 'string') {
            throw new TypeError('Key must be a string');
        }
        if (typeof value !== 'string') {
            throw new TypeError('Value must be a string');
        }
        if (key.length === 0) {
            throw new Error('Key cannot be empty');
        }
        this.store.set(key, value);
    }

    /**
     * Retrieve a tag value
     * @param key - The tag key
     * @returns The tag value or undefined if not found
     * @throws {TypeError} If key is not a string
     */
    get(key: string): string | undefined {
        if (typeof key !== 'string') {
            throw new TypeError('Key must be a string');
        }
        return this.store.get(key);
    }

    /**
     * Check if a tag exists
     * @param key - The tag key
     * @returns True if the tag exists, false otherwise
     * @throws {TypeError} If key is not a string
     */
    has(key: string): boolean {
        if (typeof key !== 'string') {
            throw new TypeError('Key must be a string');
        }
        return this.store.has(key);
    }

    /**
     * Remove a single tag
     * @param key - The tag key
     * @returns True if the tag was removed, false if it didn't exist
     * @throws {TypeError} If key is not a string
     */
    delete(key: string): boolean {
        if (typeof key !== 'string') {
            throw new TypeError('Key must be a string');
        }
        return this.store.delete(key);
    }

    /**
     * Remove all tags
     */
    clear(): void {
        this.store.clear();
    }

    /**
     * Get an iterator for all tag keys
     * @returns An iterator of all keys
     */
    keys(): IterableIterator<string> {
        return this.store.keys();
    }

    /**
     * Get an iterator for all tag values
     * @returns An iterator of all values
     */
    values(): IterableIterator<string> {
        return this.store.values();
    }

    /**
     * Get an iterator for all key-value pairs
     * @returns An iterator of all entries
     */
    entries(): IterableIterator<[string, string]> {
        return this.store.entries();
    }

    /**
     * Get the number of tags
     * @returns The size of the store
     */
    size(): number {
        return this.store.size;
    }

    /**
     * Convert tags to a plain object
     * @returns An object with all tags
     */
    toObject(): Record<string, string> {
        const obj: Record<string, string> = {};
        for (const [key, value] of this.store) {
            obj[key] = value;
        }
        return obj;
    }

    /**
     * Create a new Tags instance from an object
     * @param obj - The object to convert
     * @returns A new Tags instance
     * @throws {TypeError} If obj is not a plain object
     */
    static fromObject(obj: Record<string, string>): Tags {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
            throw new TypeError('Input must be a plain object');
        }
        const tags = new Tags();
        for (const [key, value] of Object.entries(obj)) {
            if (typeof key === 'string' && typeof value === 'string') {
                tags.set(key, value);
            }
        }
        return tags;
    }

    /**
     * Get all tags as an array of key-value pairs
     * @returns An array of entries
     */
    toArray(): [string, string][] {
        return Array.from(this.store.entries());
    }

    /**
     * Merge another Tags instance into this one
     * @param other - The other Tags instance
     * @throws {TypeError} If other is not a Tags instance
     */
    merge(other: Tags): void {
        if (!(other instanceof Tags)) {
            throw new TypeError('Argument must be a Tags instance');
        }
        for (const [key, value] of other.entries()) {
            this.set(key, value);
        }
    }

    /**
     * Create a copy of this Tags instance
     * @returns A new Tags instance with the same data
     */
    clone(): Tags {
        const newTags = new Tags();
        for (const [key, value] of this.store) {
            newTags.set(key, value);
        }
        return newTags;
    }

    /**
     * Filter tags by key prefix
     * @param prefix - The prefix to filter by
     * @returns A new Tags instance with matching tags
     * @throws {TypeError} If prefix is not a string
     */
    filterByPrefix(prefix: string): Tags {
        if (typeof prefix !== 'string') {
            throw new TypeError('Prefix must be a string');
        }
        const filtered = new Tags();
        for (const [key, value] of this.store) {
            if (key.startsWith(prefix)) {
                filtered.set(key, value);
            }
        }
        return filtered;
    }

    /**
     * Filter tags by value
     * @param value - The value to filter by
     * * @returns A new Tags instance with matching tags
     * @throws {TypeError} If value is not a string
     */
    filterByValue(value: string): Tags {
        if (typeof value !== 'string') {
            throw new TypeError('Value must be a string');
        }
        const filtered = new Tags();
        for (const [key, val] of this.store) {
            if (val === value) {
                filtered.set(key, val);
            }
        }
        return filtered;
    }
}
