import { PPU2C02 } from './ppu2-c02';
import { Sprite } from './sprite';
import { Tile } from './tile';
import { Palette } from './palette';

export class Nametable {
    tiles: Uint8Array = new Uint8Array(1024);
    attributes: Uint8Array = new Uint8Array(64);

    readTile(x: number, y: number): number {
        if (x < 0 || x >= 32 || y < 0 || y >= 30) {
            throw new Error('Tile coordinates out of bounds');
        }
        return this.tiles[y * 32 + x];
    }

    writeTile(x: number, y: number, value: number): void {
        if (x < 0 || x >= 32 || y < 0 || y >= 30) {
            throw new Error('Tile coordinates out of bounds');
        }
        this.tiles[y * 32 + x] = value & 0xFF;
    }

    readAttribute(x: number, y: number): number {
        if (x < 0 || x >= 32 || y < 0 || y >= 30) {
            throw new Error('Attribute coordinates out of bounds');
        }
        const attrX = Math.floor(x / 4);
        const attrY = Math.floor(y / 4);
        return this.attributes[attrY * 8 + attrX];
    }

    writeAttribute(x: number, y: number, value: number): void {
        if (x < 0 || x >= 32 || y < 0 || y >= 30) {
            throw new Error('Attribute coordinates out of bounds');
        }
        const attrX = Math.floor(x / 4);
        const attrY = Math.floor(y / 4);
        this.attributes[attrY * 8 + attrX] = value & 0xFF;
    }

    getPalette(x: number, y: number): number {
        if (x < 0 || x >= 32 || y < 0 || y >= 30) {
            throw new Error('Tile coordinates out of bounds');
        }
        const attrX = Math.floor(x / 4);
        const attrY = Math.floor(y / 4);
        const quadX = Math.floor((x % 4) / 2);
        const quadY = Math.floor((y % 4) / 2);
        const attrByte = this.attributes[attrY * 8 + attrX];
        const shift = (quadY * 2 + quadX) * 2;
        return (attrByte >> shift) & 0x03;
    }

    mirrorAddress(address: number, mode: number): number {
        const base = address & 0x0FFF;
        const table = (address >> 10) & 0x03;
        let mirroredTable = table;

        switch (mode) {
            case 0: // Horizontal mirroring
                mirroredTable = table & 0x01;
                break;
            case 1: // Vertical mirroring
                mirroredTable = (table >> 1) & 0x01;
                break;
            case 2: // Single screen A
                mirroredTable = 0;
                break;
            case 3: // Single screen B
                mirroredTable = 1;
                break;
            default:
                mirroredTable = table;
                break;
        }

        return (mirroredTable << 10) | base;
    }

    getName(): string {
        return 'Nametable';
    }
}
