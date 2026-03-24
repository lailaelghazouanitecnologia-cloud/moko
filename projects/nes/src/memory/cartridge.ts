import { ROM } from './rom';
import { Mapper } from './mapper';

export enum MirroringType {
    HORIZONTAL = 0,
    VERTICAL = 1,
    SINGLE_SCREEN = 2,
    FOUR_SCREEN = 3
}

export class Cartridge {
    private prgRom: ROM;
    private chrRom: ROM;
    private mapper: Mapper;
    private mirroring: MirroringType;
    private battery: boolean;
    private sram: Uint8Array;

    constructor(prgRom: ROM, chrRom: ROM, mapper: Mapper, mirroring: MirroringType, battery: boolean = false) {
        this.prgRom = prgRom;
        this.chrRom = chrRom;
        this.mapper = mapper;
        this.mirroring = mirroring;
        this.battery = battery;
        this.sram = new Uint8Array(0x2000);
    }

    readPrg(address: number): number {
        return this.mapper.readPrg(address);
    }

    writePrg(address: number, data: number): void {
        this.mapper.writePrg(address, data);
    }

    readChr(address: number): number {
        return this.mapper.readChr(address);
    }

    writeChr(address: number, data: number): void {
        this.mapper.writeChr(address, data);
    }

    getMapperType(): number {
        return this.mapper.getType();
    }

    hasBattery(): boolean {
        return this.battery;
    }

    saveSram(): Uint8Array {
        return new Uint8Array(this.sram);
    }

    loadSram(data: Uint8Array): void {
        if (data.length !== 0x2000) {
            throw new Error('Invalid SRAM data size');
        }
        this.sram.set(data);
    }

    reset(): void {
        this.mapper.reset();
    }
}
