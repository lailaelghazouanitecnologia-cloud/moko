export class Sprite {
    y: number = 0;
    tile: number = 0;
    attributes: number = 0;
    x: number = 0;

    static readonly SIZE = 4;

    getY(): number {
        return this.y;
    }

    getTile(): number {
        return this.tile;
    }

    getAttributes(): number {
        return this.attributes;
    }

    getX(): number {
        return this.x;
    }

    getPalette(): number {
        return (this.attributes >> 1) & 0x03;
    }

    getPriority(): boolean {
        return (this.attributes & 0x20) !== 0;
    }

    getFlipHorizontal(): boolean {
        return (this.attributes & 0x40) !== 0;
    }

    getFlipVertical(): boolean {
        return (this.attributes & 0x80) !== 0;
    }

    static fromBytes(bytes: Uint8Array): Sprite {
        const sprite = new Sprite();
        sprite.y = bytes[0];
        sprite.tile = bytes[1];
        sprite.attributes = bytes[2];
        sprite.x = bytes[3];
        return sprite;
    }

    toBytes(): Uint8Array {
        const bytes = new Uint8Array(4);
        bytes[0] = this.y;
        bytes[1] = this.tile;
        bytes[2] = this.attributes;
        bytes[3] = this.x;
        return bytes;
    }
}
