/**
 * Defines how an animation behaves when it reaches the end of its duration.
 * @enum {number}
 */
export enum InfinityType {
    /**
     * The animation holds the final value indefinitely.
     */
    Constant = 0,

    /**
     * The animation loops back to the beginning and repeats forever.
     */
    Cycle = 1,

    /**
     * The animation loops back to the beginning with an offset and repeats forever.
     */
    CycleOffset = 2,

    /**
     * The animation alternates direction on each repeat (ping-pong).
     */
    Oscillate = 3
}

/**
 * Utility namespace for InfinityType enum operations.
 */
export namespace InfinityType {
    /**
     * Determines whether the supplied value is a valid InfinityType.
     * @param value - Value to test.
     * @returns True if the value is a valid InfinityType; otherwise false.
     */
    export function isValid(value: unknown): value is InfinityType {
        return (
            typeof value === 'number' &&
            value >= InfinityType.Constant &&
            value <= InfinityType.Oscillate &&
            Number.isInteger(value)
        );
    }

    /**
     * Attempts to parse a string or number into an InfinityType.
     * @param raw - Input to parse.
     * @returns The parsed InfinityType.
     * @throws {TypeError} If the input cannot be parsed into a valid InfinityType.
     */
    export function parse(raw: string | number): InfinityType {
        if (typeof raw === 'number') {
            if (!isValid(raw)) {
                throw new TypeError(`Invalid InfinityType numeric value: ${raw}`);
            }
            return raw;
        }

        if (typeof raw !== 'string') {
            throw new TypeError('InfinityType.parse expects a string or number');
        }

        const key = raw.trim();
        const enumValue = (InfinityType as unknown as Record<string, number>)[key];

        if (enumValue === undefined) {
            throw new TypeError(`Unknown InfinityType name: ${key}`);
        }

        return enumValue;
    }

    /**
     * Returns the string name of an InfinityType value.
     * @param type - InfinityType value.
     * @returns The string name.
     * @throws {TypeError} If the provided value is not a valid InfinityType.
     */
    export function toString(type: InfinityType): string {
        if (!isValid(type)) {
            throw new TypeError(`Invalid InfinityType value: ${type}`);
        }

        return InfinityType[type];
    }

    /**
     * Returns all InfinityType values as an array.
     * @returns Array of all InfinityType values.
     */
    export function values(): InfinityType[] {
        return [
            InfinityType.Constant,
            InfinityType.Cycle,
            InfinityType.CycleOffset,
            InfinityType.Oscillate
        ];
    }

    /**
     * Returns all InfinityType names as an array.
     * @returns Array of all InfinityType names.
     */
    export function names(): string[] {
        return ['Constant', 'Cycle', 'CycleOffset', 'Oscillate'];
    }

    /**
     * Returns a random InfinityType value.
     * @param exclude - Optional array of InfinityType values to exclude.
     * @returns A random InfinityType value.
     * @throws {Error} If all values are excluded.
     */
    export function random(exclude: InfinityType[] = []): InfinityType {
        const pool = values().filter(v => !exclude.includes(v));
        if (pool.length === 0) {
            throw new Error('Cannot select InfinityType: all values excluded');
        }
        return pool[Math.floor(Math.random() * pool.length)];
    }
}
