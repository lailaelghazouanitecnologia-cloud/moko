import { MirroringType } from './cartridge';

export interface Mapper {
    readPrg(address: number): number;
    writePrg(address: number, data: number): void;
    readChr(address: number): number;
    writeChr(address: number, data: number): void;
    getMirroring(): MirroringType;
    irqActive(): boolean;
    scanline(): void;
    reset(): void;
}
