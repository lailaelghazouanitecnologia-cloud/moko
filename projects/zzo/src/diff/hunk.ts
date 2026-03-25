/**
 * Represents a contiguous block of lines in a diff.
 */
export class Hunk {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: string[];

    /**
     * Creates a new Hunk instance.
     * @param oldStart - The starting line number in the old file (1-based).
     * @param oldLines - The number of lines this hunk affects in the old file.
     * @param newStart - The starting line number in the new file (1-based).
     * @param newLines - The number of lines this hunk affects in the new file.
     * @param lines - The diff lines including markers (+, -, space).
     * @throws {TypeError} If any parameter is of incorrect type.
     * @throws {RangeError} If any numeric parameter is negative or zero where disallowed.
     */
    constructor(oldStart: number, oldLines: number, newStart: number, newLines: number, lines: string[]) {
        this.#validateConstructorParams(oldStart, oldLines, newStart, newLines, lines);
        this.oldStart = oldStart;
        this.oldLines = oldLines;
        this.newStart = newStart;
        this.newLines = newLines;
        this.lines = lines;
    }

    /**
     * Checks if a line represents an addition.
     * @param line - The diff line to check.
     * @returns True if the line is an addition line.
     * @throws {TypeError} If line is not a string.
     */
    isAddition(line: string): boolean {
        if (typeof line !== 'string') {
            throw new TypeError('Line must be a string');
        }
        return line.startsWith('+') && !line.startsWith('+++');
    }

    /**
     * Checks if a line represents a deletion.
     * @param line - The diff line to check.
     * @returns True if the line is a deletion line.
     * @throws {TypeError} If line is not a string.
     */
    isDeletion(line: string): boolean {
        if (typeof line !== 'string') {
            throw new TypeError('Line must be a string');
        }
        return line.startsWith('-') && !line.startsWith('---');
    }

    /**
     * Checks if a line represents unchanged context.
     * @param line - The diff line to check.
     * @returns True if the line is a context line.
     * @throws {TypeError} If line is not a string.
     */
    isContext(line: string): boolean {
        if (typeof line !== 'string') {
            throw new TypeError('Line must be a string');
        }
        return line.startsWith(' ') || line === '';
    }

    /**
     * Removes diff markers from each line.
     * @returns An array of lines without leading diff markers.
     */
    stripMarkers(): string[] {
        return this.lines.map(line => {
            if (this.isAddition(line) || this.isDeletion(line)) {
                return line.slice(1);
            }
            return line;
        });
    }

    /**
     * Applies this hunk to the provided old text.
     * @param oldText - The original text to patch.
     * @returns The patched text.
     * @throws {TypeError} If oldText is not a string.
     * @throws {Error} If the hunk cannot be applied due to index out of bounds.
     */
    apply(oldText: string): string {
        if (typeof oldText !== 'string') {
            throw new TypeError('oldText must be a string');
        }

        const oldLines = oldText.split('\n');
        const newLines: string[] = [];
        let oldIndex = this.oldStart - 1;

        for (const line of this.lines) {
            if (this.isContext(line)) {
                if (oldIndex >= oldLines.length) {
                    throw new Error('Context line index out of bounds in old text');
                }
                newLines.push(oldLines[oldIndex]);
                oldIndex++;
            } else if (this.isAddition(line)) {
                newLines.push(line.slice(1));
            } else if (this.isDeletion(line)) {
                oldIndex++;
            }
        }

        const before = oldLines.slice(0, this.oldStart - 1);
        const after = oldLines.slice(this.oldStart - 1 + this.oldLines);
        return [...before, ...newLines, ...after].join('\n');
    }

    /**
     * Returns a string representation of the hunk in unified diff format.
     * @returns The formatted hunk header and lines.
     */
    toString(): string {
        const header = `@@ -${this.oldStart},${this.oldLines} +${this.newStart},${this.newLines} @@`;
        return [header, ...this.lines].join('\n');
    }

    /**
     * Validates constructor parameters.
     * @param oldStart - The old start line number.
     * @param oldLines - The old line count.
     * @param newStart - The new start line number.
     * @param newLines - The new line count.
     * @param lines - The diff lines.
     * @throws {TypeError} If any parameter is of incorrect type.
     * @throws {RangeError} If any numeric parameter is negative or zero where disallowed.
     */
    #validateConstructorParams(
        oldStart: number,
        oldLines: number,
        newStart: number,
        newLines: number,
        lines: string[]
    ): void {
        if (typeof oldStart !== 'number' || !Number.isInteger(oldStart) || oldStart < 1) {
            throw new RangeError('oldStart must be a positive integer');
        }
        if (typeof oldLines !== 'number' || !Number.isInteger(oldLines) || oldLines < 0) {
            throw new RangeError('oldLines must be a non-negative integer');
        }
        if (typeof newStart !== 'number' || !Number.isInteger(newStart) || newStart < 1) {
            throw new RangeError('newStart must be a positive integer');
        }
        if (typeof newLines !== 'number' || !Number.isInteger(newLines) || newLines < 0) {
            throw new RangeError('newLines must be a non-negative integer');
        }
        if (!Array.isArray(lines) || !lines.every(l => typeof l === 'string')) {
            throw new TypeError('lines must be an array of strings');
        }
    }
}
