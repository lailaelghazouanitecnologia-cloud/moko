import { MemoryDevice } from './memory-device';

export interface MemoryMapper {
    mapRead(address: number): number;
    mapWrite(address: number): number;
    getReadDevice(address: number): MemoryDevice;
    getWriteDevice(address: number): MemoryDevice;
    onReset(): void;
    onBankSwitch(bank: number, value: number): void;
}
