export interface Memory {
    read(address: number): number;
    write(address: number, value: number): void;
    readWord(address: number): number;
    writeWord(address: number, value: number): void;
    readRange(start: number, length: number): Uint8Array;
    writeRange(address: number, data: Uint8Array): void;
    getSize(): number;
    isReadable(address: number): boolean;
    isWritable(address: number): boolean;
    clear(start?: number, end?: number): void;
    copy(dest: number, src: number, length: number): void;
    validateAddress(address: number): void;
}
