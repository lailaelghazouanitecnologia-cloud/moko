/**
 * Tag manager with pattern matching capabilities
 */
export class Tags {
    private tags: Set<string> = new Set<string>();

    /**
     * Add one or more tags to the collection
     * @param tags - Tags to add
     * @throws {TypeError} If any tag is not a string
     */
    add(...tags: string[]): void {
        if (!tags || tags.length === 0) {
            return;
        }

        for (const tag of tags) {
            if (typeof tag !== 'string') {
                throw new TypeError(`Tag must be a string, received ${typeof tag}`);
            }
            if (tag.trim() === '') {
                throw new Error('Tag cannot be empty or whitespace');
            }
            this.tags.add(tag.trim());
        }
    }

    /**
     * Remove one or more tags from the collection
     * @param tags - Tags to remove
     * @throws {TypeError} If any tag is not a string
     */
    remove(...tags: string[]): void {
        if (!tags || tags.length === 0) {
            return;
        }

        for (const tag of tags) {
            if (typeof tag !== 'string') {
                throw new TypeError(`Tag must be a string, received ${typeof tag}`);
            }
            this.tags.delete(tag);
        }
    }

    /**
     * Check if a tag exists in the collection
     * @param tag - Tag to check
     * @returns True if tag exists
     * @throws {TypeError} If tag is not a string
     */
    has(tag: string): boolean {
        if (typeof tag !== 'string') {
            throw new TypeError(`Tag must be a string, received ${typeof tag}`);
        }
        return this.tags.has(tag);
    }

    /**
     * Check if any of the provided tags exist in the collection
     * @param tags - Array of tags to check
     * @returns True if any tag exists
     * @throws {TypeError} If tags is not an array or contains non-string elements
     */
    hasAny(tags: string[]): boolean {
        this.validateTagArray(tags, 'tags');

        for (const tag of tags) {
            if (this.tags.has(tag)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if all provided tags exist in the collection
     * @param tags - Array of tags to check
     * @returns True if all tags exist
     * @throws {TypeError} If tags is not an array or contains non-string elements
     */
    hasAll(tags: string[]): boolean {
        this.validateTagArray(tags, 'tags');

        for (const tag of tags) {
            if (!this.tags.has(tag)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if any tag matches the provided pattern
     * @param pattern - Pattern to match (supports * wildcards)
     * @returns True if any tag matches the pattern
     * @throws {TypeError} If pattern is not a string
     * @throws {Error} If pattern is invalid
     */
    match(pattern: string): boolean {
        if (typeof pattern !== 'string') {
            throw new TypeError(`Pattern must be a string, received ${typeof pattern}`);
        }

        if (pattern.trim() === '') {
            return false;
        }

        let regex: RegExp;
        try {
            const escapedPattern = pattern
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\\\*/g, '.*');
            regex = new RegExp(`^${escapedPattern}$`);
        } catch (error) {
            throw new Error(`Invalid pattern: ${pattern}`);
        }

        for (const tag of this.tags) {
            if (regex.test(tag)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get all tags as an array
     * @returns Array of all tags
     */
    list(): string[] {
        return Array.from(this.tags).sort();
    }

    /**
     * Clear all tags from the collection
     */
    clear(): void {
        this.tags.clear();
    }

    /**
     * Get the number of tags in the collection
     * @returns Number of tags
     */
    size(): number {
        return this.tags.size;
    }

    /**
     * Get a copy of the tags as a Set
     * @returns Copy of the internal Set
     */
    getTags(): Set<string> {
        return new Set(this.tags);
    }

    /**
     * Validate that the input is an array of strings
     * @param arr - Array to validate
     * @param name - Name of the parameter for error messages
     * @throws {TypeError} If validation fails
     */
    private validateTagArray(arr: unknown, name: string): void {
        if (!Array.isArray(arr)) {
            throw new TypeError(`${name} must be an array`);
        }

        if (arr.length === 0) {
            return;
        }

        for (const element of arr) {
            if (typeof element !== 'string') {
                throw new TypeError(`${name} must contain only strings`);
            }
        }
    }
}
