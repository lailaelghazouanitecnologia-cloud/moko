export class Tile {
    pixels: Uint8Array;

    constructor() {
        this.pixels = new Uint8Array(64);
    }

    getPixel(x: number, y: number): number {
        if (x < 0 || x >= 8 || y < 0 || y >= 8) {
            throw new Error('Pixel coordinates out of bounds');
        }
        return this.pixels[y * 8 + x];
    }

    setPixel(x: number, y: number, value: number): void {
        if (x < 0 || x >= 8 || y < 0 || y >= 8) {
            throw new Error('Pixel coordinates out of bounds');
        }
        this.pixels[y * 8 + x] = value & 0x03;
    }

    static fromPattern(low: Uint8Array, high: Uint8Array): Tile {
        if (low.length !== 8 || high.length !== 8) {
            throw new Error('Pattern arrays must be 8 bytes each');
        }

        const tile = new Tile();
        for (let y = 0; y < 8; y++) {
            const lowByte = low[y];
            const highByte = high[y];
            for (let x = 0; x < 8; x++) {
                const lowBit = (lowByte >> (7 - x)) & 1;
                const highBit = (highByte >> (7 - x)) & 1;
                tile.pixels[y * 8 + x] = (highBit << 1) | lowBit;
            }
        }
        return tile;
    }

    getRow(y: number): number {
        if (y < 0 || y >= 8) {
            throw new Error('Row index out of bounds');
        }

        let pattern = 0;
        for (let x = 0; x < 8; x++) {
            pattern = (pattern << 1) | (this.pixels[y * 8 + x] & 1);
        }
        return pattern;
    }

    flipHorizontal(): Tile {
        const flipped = new Tile();
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                flipped.pixels[y * 8 + (7 - x)] = this.pixels[y * 8 + x];
            }
        }
        return flipped;
    }

    flipVertical(): Tile {
        const flipped = new Tile();
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                flipped.pixels[(7 - y) * 8 + x] = this.pixels[y * 8 + x];
            }
        }
        return flipped;
    }
}
