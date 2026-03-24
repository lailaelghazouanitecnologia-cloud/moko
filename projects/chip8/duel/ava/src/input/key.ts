export enum Key {
    ZERO = 0x0,
    ONE = 0x1,
    TWO = 0x2,
    THREE = 0x3,
    FOUR = 0x4,
    FIVE = 0x5,
    SIX = 0x6,
    SEVEN = 0x7,
    EIGHT = 0x8,
    NINE = 0x9,
    A = 0xA,
    B = 0xB,
    C = 0xC,
    D = 0xD,
    E = 0xE,
    F = 0xF
}

export namespace Key {
    export function fromValue(value: number): Key {
        if (!isValid(value)) {
            throw new Error(`Invalid key value: ${value}`);
        }
        return value as Key;
    }

    export function toValue(this: Key): number {
        return this as unknown as number;
    }

    export function toString(this: Key): string {
        return '0x' + (this as unknown as number).toString(16).toUpperCase();
    }

    export function fromString(str: string): Key | null {
        const match = str.match(/^0x([0-9A-Fa-f])$/);
        if (!match) return null;
        const value = parseInt(match[1], 16);
        return isValid(value) ? (value as Key) : null;
    }

    export function values(): Key[] {
        return [
            Key.ZERO,
            Key.ONE,
            Key.TWO,
            Key.THREE,
            Key.FOUR,
            Key.FIVE,
            Key.SIX,
            Key.SEVEN,
            Key.EIGHT,
            Key.NINE,
            Key.A,
            Key.B,
            Key.C,
            Key.D,
            Key.E,
            Key.F
        ];
    }

    export function isValid(value: number): boolean {
        return value >= 0x0 && value <= 0xF;
    }
}
