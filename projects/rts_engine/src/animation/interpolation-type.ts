export enum InterpolationType {
    Linear,
    Step,
    Cubic,
    Hermite
}

/**
 * Utility class for handling InterpolationType conversions and validation.
 * Provides helper methods to safely work with the enum at runtime.
 */
export class InterpolationTypeUtil {
    private static readonly VALID_NAMES: ReadonlyArray<string> = ['Linear', 'Step', 'Cubic', 'Hermite'];

    private constructor() {
        // Prevent instantiation
    }

    /**
     * Converts a string to an InterpolationType.
     * @returns The corresponding InterpolationType or undefined if invalid.
     */
    public static fromString(value: string): InterpolationType | undefined {
        if (typeof value !== 'string') return undefined;
        const key = value.trim();
        const index = InterpolationTypeUtil.VALID_NAMES.indexOf(key);
        return index >= 0 ? index as InterpolationType : undefined;
    }

    /**
     * Converts an InterpolationType to its string name.
     * @returns The string name or undefined if the value is out of range.
     */
    public static toString(value: InterpolationType): string | undefined {
        if (!InterpolationTypeUtil.isValid(value)) return undefined;
        return InterpolationTypeUtil.VALID_NAMES[value];
    }

    /**
     * Checks if the provided value is a valid InterpolationType.
     */
    public static isValid(value: unknown): value is InterpolationType {
        return typeof value === 'number' &&
               Number.isInteger(value) &&
               value >= 0 &&
               value < InterpolationTypeUtil.VALID_NAMES.length;
    }

    /**
     * Returns an array of all valid InterpolationType names.
     */
    public static getNames(): ReadonlyArray<string> {
        return InterpolationTypeUtil.VALID_NAMES;
    }

    /**
     * Returns an array of all valid InterpolationType values.
     */
    public static getValues(): ReadonlyArray<InterpolationType> {
        return [InterpolationType.Linear, InterpolationType.Step, InterpolationType.Cubic, InterpolationType.Hermite];
    }
}
