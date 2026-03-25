/**
 * Represents a single index entry for a changed blob.
 */
export class Entry {
    path: string;
    oid: string;
    mode: number;
    stage: number;

    /**
     * Creates a new Entry instance.
     * @param path - The file path.
     * @param oid - The object ID (SHA-1 hash).
     * @param mode - The file mode (e.g., 0o100644).
     * @param stage - The stage number (0 for normal, >0 for conflict).
     * @throws {TypeError} If any parameter is of invalid type.
     * @throws {RangeError} If mode or stage is out of valid range.
     */
    constructor(path: string, oid: string, mode: number, stage: number) {
        Entry.validateConstructorParams(path, oid, mode, stage);
        this.path = path;
        this.oid = oid;
        this.mode = mode;
        this.stage = stage;
    }

    /**
     * Checks whether this entry represents a merge conflict.
     * @returns true if the entry is conflicted (stage > 0), false otherwise.
     */
    isConflicted(): boolean {
        return this.stage > 0;
    }

    /**
     * Serializes the entry to a string representation.
     * @returns A string in the format: "mode oid stage\tpath"
     */
    toString(): string {
        return `${this.mode.toString(8)} ${this.oid} ${this.stage}\t${this.path}`;
    }

    /**
     * Creates a deep copy of this entry.
     * @returns A new Entry instance with the same data.
     */
    clone(): Entry {
        return new Entry(this.path, this.oid, this.mode, this.stage);
    }

    /**
     * Compares this entry with another for sorting purposes.
     * @param other - The entry to compare against.
     * @returns -1 if this entry is less than other, 1 if greater, 0 if equal.
     * @throws {TypeError} If other is not an Entry instance.
     */
    compare(other: Entry): number {
        if (!(other instanceof Entry)) {
            throw new TypeError('compare() requires an Entry instance');
        }

        if (this.path < other.path) return -1;
        if (this.path > other.path) return 1;
        if (this.stage < other.stage) return -1;
        if (this.stage > other.stage) return 1;
        return 0;
    }

    /**
     * Updates the object ID and mode of this entry.
     * @param oid - The new object ID.
     * @param mode - The new file mode.
     * @throws {TypeError} If oid is not a string or mode is not a number.
     * @throws {RangeError} If mode is out of valid range.
     */
    update(oid: string, mode: number): void {
        Entry.validateUpdateParams(oid, mode);
        this.oid = oid;
        this.mode = mode;
    }

    /**
     * Validates constructor parameters.
     * @private
     */
    private static validateConstructorParams(
        path: string,
        oid: string,
        mode: number,
        stage: number
    ): void {
        if (typeof path !== 'string' || path.length === 0) {
            throw new TypeError('path must be a non-empty string');
        }
        if (typeof oid !== 'string' || !/^[0-9a-f]{40}$/i.test(oid)) {
            throw new TypeError('oid must be a 40-character hexadecimal SHA-1 hash');
        }
        if (!Number.isInteger(mode) || mode < 0 || mode > 0o77777) {
            throw new RangeError('mode must be an integer between 0 and 0o77777');
        }
        if (!Number.isInteger(stage) || stage < 0 || stage > 3) {
            throw new RangeError('stage must be an integer between 0 and 3');
        }
    }

    /**
     * Validates update parameters.
     * @private
     */
    private static validateUpdateParams(oid: string, mode: number): void {
        if (typeof oid !== 'string' || !/^[0-9a-f]{40}$/i.test(oid)) {
            throw new TypeError('oid must be a 40-character hexadecimal SHA-1 hash');
        }
        if (!Number.isInteger(mode) || mode < 0 || mode > 0o77777) {
            throw new RangeError('mode must be an integer between 0 and 0o77777');
        }
    }
}
