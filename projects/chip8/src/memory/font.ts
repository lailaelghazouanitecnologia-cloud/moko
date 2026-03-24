import { Rom } from './rom';

export class Font extends Rom {
    private static readonly SPRITES = new Uint8Array([
        0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
        0x20, 0x60, 0x20, 0x20, 0x70, // 1
        0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
        0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
        0x90, 0x90, 0xF0, 0x10, 0x10, // 4
        0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
        0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
        0xF0, 0x10, 0x20, 0x40, 0x40, // 7
        0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
        0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
        0xF0, 0x90, 0xF0, 0x90, 0x90, // A
        0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
        0xF0, 0x80, 0x80, 0x80, 0xF0, // C
        0xE0, 0x90, 0x90, 0x90, 0xE0, // D
        0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
        0xF0, 0x80, 0xF0, 0x80, 0x80  // F
    ]);

    private static readonly BASE_ADDRESS = 0x50;

    constructor() {
        super(0x1000);
        this.load(Font.BASE_ADDRESS, Font.SPRITES);
    }

    getSprite(digit: number): Uint8Array {
        this.validateDigit(digit);
        const offset = digit * 5;
        return Font.SPRITES.slice(offset, offset + 5);
    }

    getSpriteAddress(digit: number): number {
        this.validateDigit(digit);
        return Font.BASE_ADDRESS + digit * 5;
    }

    validateDigit(digit: number): void {
        if (!Number.isInteger(digit) || digit < 0 || digit > 15) {
            throw new Error(`Invalid digit: ${digit}. Must be 0-15.`);
        }
    }

    getAllSprites(): Uint8Array {
        return new Uint8Array(Font.SPRITES);
    }

    getHeight(): number {
        return 5;
    }

    getWidth(): number {
        return 1;
    }
}
