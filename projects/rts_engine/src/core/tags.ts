/**
 * Lightweight tag manager for storing and retrieving key-value pairs.
 * Provides methods for adding, removing, checking existence, retrieving values,
 * listing keys, and clearing all tags.
 */
export class Tags {
    private tags: Map<string, any>;

    /**
     * Creates a new instance of Tags with an empty Map for storing tags.
     */
    constructor() {
        this.tags = new Map<string, any>();
    }

    /**
     * Adds a tag with the specified key and optional value.
     * @param key - The key for the tag.
     * @param value - The optional value associated with the key.
     * @throws {TypeError} If the key is not a string.
     */
    add(key: string, value?: any): void {
        if (typeof key !== 'string') {
            throw new TypeError('Key must be a string');
        }
        if (key.trim() === '') {
            throw new Error('Key cannot be an empty string');
        }
        this.tags.set(key, value);
    }

    /**
     * Removes the tag with the specified key.
     * @param key - The key of the tag to remove.
     * @returns true if the tag was removed, false if it did not exist.
     * @throws {TypeError} If the key is not a string.
     */
    remove(key: string): boolean {
        if (typeof key !== 'string') {
            throw new TypeError('Key must be a string');
        }
        return this.tags.delete(key);
    }

    /**
     * Checks if a tag exists with the specified key.
     * @param key - The key to check for existence.
     * @returns true if the tag exists, false otherwise.
     * @throws {TypeError} If the key is not a string.
     */
    has(key: string): boolean {
        if (typeof key !== 'string') {
            throw new TypeError('Key must be a string');
        }
        return this.tags.has(key);
    }

    /**
     * Retrieves the value associated with the specified key.
     * @param key - The key of the tag to retrieve.
     * @returns The value associated with the key, or undefined if not found.
     * @throws {TypeError} If the key is not a string.
     */
    get(key: string): any {
        if (typeof key !== 'string') {
            throw new TypeError('Key must be a string');
        }
        return this.tags.get(key);
    }

    /**
     * Returns an iterator over all tag keys.
     * @returns An iterator of all keys in the tags.
     */
    keys(): IterableIterator<string> {
        return this.tags.keys();
    }

    /**
     * Removes all tags.
     */
    clear(): void {
        this.tags.clear();
    }

    /**
     * Returns the number of tags stored.
     * @returns The number of tags.
     */
    size(): number {
        return this.tags.size;
    }

    /**
     * Returns an array of all tag entries.
     * @returns An array of key-value pairs.
     */
    entries(): Array<[string, any]> {
        return Array.from(this.tags.entries());
    }

    /**
     * Returns an array of all tag values.
     * @returns An array of values.
     */
    values(): Array<any> {
        return Array.from(this.tags.values());
    }

    /**
     * Creates a shallow copy of the tags.
     * @returns A new Map with the same tags.
     */
    clone(): Map<string, any> {
        return new Map(this.tags);
    }

    /**
     * Converts the tags to a plain object.
     * @returns An object with keys and values from the tags.
     */
    toObject(): Record<string, any> {
        const obj: Record<string, any> = {};
        this.tags.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }

    /**
     * Loads tags from a plain object.
     * @param obj - An object with key-value pairs to load.
     * @throws {TypeError} If the input is not a plain object.
     */
    fromObject(obj: Record<string, any>): void {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
            throw new TypeObject('Input must be a plain object');
        }
        this.tags.clear();
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                this.tags.set(key, obj[key]);
            }
        }
    }
}
